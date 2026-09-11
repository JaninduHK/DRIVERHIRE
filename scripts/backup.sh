#!/bin/bash
# Nightly backup for DRIVERHIRE: dumps Mongo, archives the uploads volume,
# encrypts an env-secrets snapshot, and ships everything off-box via rsync/ssh
# to a second server. Meant to run from cron on the VPS — see backup.env.example
# for the config it reads and DEPLOY_NEW_VPS.md for setup + restore steps.
#
# Usage: scripts/backup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---- Config -----------------------------------------------------------
CONFIG_FILE="${BACKUP_CONFIG_FILE:-$SCRIPT_DIR/backup.env}"
if [ -f "$CONFIG_FILE" ]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

: "${REMOTE_HOST:?Set REMOTE_HOST in $CONFIG_FILE (backup target hostname/IP)}"
: "${REMOTE_USER:?Set REMOTE_USER in $CONFIG_FILE}"
: "${REMOTE_PATH:?Set REMOTE_PATH in $CONFIG_FILE (e.g. /home/backups/driverhire)}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-driverhire}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
LOCK_FILE="${LOCK_FILE:-/tmp/driverhire-backup.lock}"
# Optional: path to a file holding the passphrase used to encrypt the env-secrets
# archive. If unset, the secrets snapshot step is skipped (not "silently" — a
# warning is logged) rather than ever shipping plaintext secrets off-box.
SECRETS_PASSPHRASE_FILE="${SECRETS_PASSPHRASE_FILE:-}"

SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=15)
RSYNC_SSH="ssh ${SSH_OPTS[*]}"

log() { echo "[$(date '+%F %T')] $*"; }

# ---- Guard against overlapping runs ------------------------------------
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  log "Another backup run is already in progress — exiting."
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

cd "$APP_DIR"
STAMP="$(date +%F_%H%M%S)"
log "Starting backup $STAMP"

# ---- 1. MongoDB dump ----------------------------------------------------
DB_FILE="$WORKDIR/db-$STAMP.archive"
log "Dumping MongoDB..."
docker compose exec -T mongo mongodump --uri="mongodb://localhost:27017/driverhire" --archive --gzip > "$DB_FILE"
log "MongoDB dump: $(du -h "$DB_FILE" | cut -f1)"

# ---- 2. Uploaded files volume -------------------------------------------
UPLOADS_FILE="$WORKDIR/uploads-$STAMP.tar.gz"
log "Archiving uploads_data volume..."
docker run --rm \
  -v "${COMPOSE_PROJECT}_uploads_data:/data:ro" \
  -v "$WORKDIR:/backup" \
  alpine tar czf "/backup/uploads-$STAMP.tar.gz" -C /data .
log "Uploads archive: $(du -h "$UPLOADS_FILE" | cut -f1)"

# ---- 3. Encrypted secrets snapshot (backend/.env, root .env) -----------
if [ -n "$SECRETS_PASSPHRASE_FILE" ] && [ -f "$SECRETS_PASSPHRASE_FILE" ]; then
  ENV_FILES=()
  [ -f "$APP_DIR/backend/.env" ] && ENV_FILES+=("backend/.env")
  [ -f "$APP_DIR/.env" ] && ENV_FILES+=(".env")
  if [ "${#ENV_FILES[@]}" -gt 0 ]; then
    log "Encrypting env-secrets snapshot..."
    tar -czf - -C "$APP_DIR" "${ENV_FILES[@]}" | \
      gpg --batch --yes --passphrase-file "$SECRETS_PASSPHRASE_FILE" --cipher-algo AES256 \
        -c -o "$WORKDIR/secrets-$STAMP.tar.gz.gpg"
  else
    log "No .env files found to snapshot — skipping."
  fi
else
  log "SECRETS_PASSPHRASE_FILE not configured — skipping encrypted secrets snapshot (plaintext secrets are never shipped)."
fi

# ---- 4. Ship off-box via rsync/ssh --------------------------------------
log "Uploading to $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH ..."
ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" "mkdir -p '$REMOTE_PATH'"
rsync -avz -e "$RSYNC_SSH" "$WORKDIR"/ "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"

# ---- 5. Prune old backups on the remote ----------------------------------
log "Pruning backups older than $RETENTION_DAYS days on remote..."
ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
  "find '$REMOTE_PATH' -type f -mtime +$RETENTION_DAYS -delete"

log "Backup $STAMP complete."
