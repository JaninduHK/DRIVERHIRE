#!/bin/bash
# Manual deployment script for DRIVERHIRE
# Usage: ./deploy.sh [branch]
#
# This script can be run manually on the VPS or triggered by CI/CD

set -e

# Configuration
BRANCH="${1:-main}"
APP_DIR="${APP_PATH:-$(dirname "$(readlink -f "$0")")}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running from correct directory
if [ ! -d "$APP_DIR/backend" ] || [ ! -d "$APP_DIR/frontend" ]; then
    log_error "Cannot find backend/frontend directories. Run from project root or set APP_PATH."
    exit 1
fi

cd "$APP_DIR"

log_info "=== Starting DRIVERHIRE Deployment ==="
log_info "Branch: $BRANCH"
log_info "Directory: $APP_DIR"

# Step 1: Protect user uploads before any git operations
UPLOADS_DIR="$APP_DIR/uploads"
BACKUP_DIR="/tmp/driverhire-uploads-backup-$$"

if [ -d "$UPLOADS_DIR" ] && [ "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
    log_info "Backing up user uploads..."
    cp -r "$UPLOADS_DIR" "$BACKUP_DIR"
    UPLOAD_COUNT=$(find "$UPLOADS_DIR" -type f | wc -l)
    log_info "Backed up $UPLOAD_COUNT files from uploads/"
fi

# Step 2: Pull latest changes
log_info "Pulling latest changes from $BRANCH..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# Step 3: Restore user uploads if they were backed up
if [ -d "$BACKUP_DIR" ]; then
    log_info "Restoring user uploads..."
    mkdir -p "$UPLOADS_DIR"
    cp -r "$BACKUP_DIR"/* "$UPLOADS_DIR"/ 2>/dev/null || true
    rm -rf "$BACKUP_DIR"
    log_info "User uploads restored successfully"
fi

# Step 4: Install and build frontend
log_info "Building frontend..."
cd "$APP_DIR/frontend"
npm ci --omit=dev
npm run build

if [ ! -d "dist" ]; then
    log_error "Frontend build failed - dist directory not found"
    exit 1
fi
log_info "Frontend build complete"

# Step 5: Install backend dependencies
log_info "Installing backend dependencies..."
cd "$APP_DIR/backend"
npm ci --omit=dev

# Step 6: Ensure upload directories exist with correct permissions
log_info "Ensuring upload directories exist..."
mkdir -p "$APP_DIR/uploads/vehicles"
mkdir -p "$APP_DIR/uploads/profiles"
mkdir -p "$APP_DIR/uploads/commissions"
chmod -R 755 "$APP_DIR/uploads"

# Step 7: Restart backend service
log_info "Restarting backend service..."

if command -v pm2 &> /dev/null; then
    cd "$APP_DIR/backend"
    if pm2 describe driverhire-backend > /dev/null 2>&1; then
        pm2 restart driverhire-backend
        log_info "Backend restarted with PM2"
    else
        pm2 start ecosystem.config.cjs --only driverhire-backend 2>/dev/null || \
        pm2 start server.js --name driverhire-backend
        log_info "Backend started with PM2"
    fi
    pm2 save
elif systemctl is-active --quiet driverhire-backend 2>/dev/null; then
    sudo systemctl restart driverhire-backend
    log_info "Backend restarted with systemd"
else
    log_warn "No process manager found. Please restart backend manually:"
    log_warn "  cd $APP_DIR/backend && node server.js"
fi

# Step 8: Reload Nginx
log_info "Reloading Nginx..."
if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    log_info "Nginx reloaded successfully"
else
    log_error "Nginx configuration test failed. Check your nginx config."
    exit 1
fi

# Step 9: Health check
log_info "Running health check..."
sleep 2

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null | grep -q "200\|404"; then
    log_info "Backend is responding"
else
    log_warn "Backend health check failed - it may still be starting up"
fi

log_info "=== Deployment Complete ==="
log_info "Application URL: https://carwithdriver.lk"

# Show PM2 status if available
if command -v pm2 &> /dev/null; then
    echo ""
    pm2 status
fi
