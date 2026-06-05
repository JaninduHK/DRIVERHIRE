# Deploying DRIVERHIRE to srv1725864 (alongside shopstatesideglobal)

The new VPS already runs **shopstatesideglobal**, whose `web` container is
**Caddy v2** holding host ports 80/443 with automatic HTTPS. Rather than fight
for those ports, DRIVERHIRE runs WITHOUT host ports and the existing Caddy
reverse-proxies `carwithdriver.lk` to it.

```
Internet ─▶ Caddy (shopstatesideglobal-web-1, :80/:443, auto-TLS)
              ├─ shopstatesideglobal.com ─▶ server:4000 + SPA
              └─ carwithdriver.lk        ─▶ driverhire-web:80
                                              ├─ /        React SPA
                                              ├─ /api     ─▶ backend:3000 ─▶ mongo
                                              └─ /uploads  (uploads_data volume)
```

Confirmed facts about the box:
- Caddyfile: `/opt/shopstatesideglobal/Caddyfile` (COPYed into the image, NOT mounted → editing it requires a rebuild of that service).
- Shared network: `shopstatesideglobal_internal` (internal=false).
- DRIVERHIRE gets its OWN `mongo` container (volume `driverhire_mongo_data`) — fully separate from shopstatesideglobal's Mongo.

---

## STEP 1 — DNS first
Point these A records at the VPS public IP, and let them propagate:
```
carwithdriver.lk       A   <VPS_IP>
www.carwithdriver.lk   A   <VPS_IP>
```
Check: `dig carwithdriver.lk +short` should return the VPS IP. Caddy can only
issue the TLS cert once this resolves.

---

## STEP 2 — Code + secrets
```bash
git clone <your-repo-url> /opt/driverhire
cd /opt/driverhire

cp backend/.env.example backend/.env
nano backend/.env
```
Set in `backend/.env`:
```ini
MONGO_URI=mongodb://mongo:27017/driverhire        # our own mongo container
JWT_SECRET=<openssl rand -hex 32>
CLIENT_ORIGIN=https://carwithdriver.lk
APP_BASE_URL=https://carwithdriver.lk
PUBLIC_ASSET_BASE_URL=https://carwithdriver.lk/uploads
# keep your real BREVO_API_KEY, GOOGLE_CLIENT_ID, CLOUDINARY_*, ADMIN_SETUP_CODE
```
```bash
cp .env.docker.example .env
nano .env                 # set VITE_GOOGLE_CLIENT_ID, VITE_GA_MEASUREMENT_ID; keep VITE_API_URL=/api
```
> Leave our `mongo` service's host port commented out in docker-compose.yml — the
> existing site already uses 127.0.0.1:27017.

---

## STEP 3 — Migrate data from the OLD VPS

**Database** (skip if you use MongoDB Atlas):
```bash
# OLD server
mongodump --uri="mongodb://localhost:27017/driverhire" --archive=dh.archive --gzip
scp dh.archive root@<VPS_IP>:/opt/driverhire/

# NEW server
cd /opt/driverhire
docker compose up -d mongo
docker compose cp dh.archive mongo:/tmp/dh.archive
docker compose exec mongo mongorestore --archive=/tmp/dh.archive --gzip --drop
```

**Uploaded images:**
```bash
# OLD server
rsync -avz /path/to/DRIVERHIRE/uploads/ root@<VPS_IP>:/tmp/uploads/

# NEW server
docker compose up -d backend
docker compose cp /tmp/uploads/. backend:/app/uploads/
docker compose exec backend ls -R /app/uploads
```

---

## STEP 4 — Bring up DRIVERHIRE in proxied mode
No host ports; joins the existing Caddy network so it's reachable as
`driverhire-web`:
```bash
cd /opt/driverhire
docker compose -f docker-compose.yml -f docker-compose.proxied.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.proxied.yml ps
```
Smoke-test from inside the network (before Caddy is wired up):
```bash
docker run --rm --network shopstatesideglobal_internal curlimages/curl -s -o /dev/null -w '%{http_code}\n' http://driverhire-web/
docker run --rm --network shopstatesideglobal_internal curlimages/curl -s http://driverhire-web/api/
```
Expect `200` and a JSON status.

---

## STEP 5 — Add the domain to the existing Caddy
Edit `/opt/shopstatesideglobal/Caddyfile` and append:
```caddy
# --- DRIVERHIRE (carwithdriver.lk) ---
www.carwithdriver.lk {
        redir https://carwithdriver.lk{uri} permanent
}

carwithdriver.lk {
        encode zstd gzip
        reverse_proxy driverhire-web:80
}
```
Apply it (rebuilds the Caddy image with the new Caddyfile, recreates the
container — a few seconds; certs persist in the `caddy_data` volume):
```bash
cd /opt/shopstatesideglobal
docker compose up -d --build web
docker compose logs -f web        # watch Caddy obtain the carwithdriver.lk cert
```

Caddy automatically requests the Let's Encrypt cert for `carwithdriver.lk` on
startup. Within ~10–30s:
```bash
curl -I https://carwithdriver.lk/        # 200, served over TLS
curl    https://carwithdriver.lk/api/     # status ok
```

---

## STEP 6 — Verify, then retire the old VPS
Test end-to-end on the new box: homepage + live driver map, login + Google
sign-in, image upload, a booking, an email send. Confirm both sites work
(`https://shopstatesideglobal.com` and `https://carwithdriver.lk`). Only then
decommission the old server.

---

## Everyday operations
```bash
# Redeploy DRIVERHIRE after code changes
cd /opt/driverhire && git pull && \
  docker compose -f docker-compose.yml -f docker-compose.proxied.yml up -d --build

# Logs / restart
docker compose -f docker-compose.yml -f docker-compose.proxied.yml logs -f backend
docker compose -f docker-compose.yml -f docker-compose.proxied.yml restart backend

# Backups
docker compose exec mongo mongodump --uri="mongodb://localhost:27017/driverhire" --archive=/tmp/b.archive --gzip
docker compose cp mongo:/tmp/b.archive ./backups/db-$(date +%F).archive
docker run --rm -v driverhire_uploads_data:/data -v $(pwd)/backups:/backup alpine \
  tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

## Notes
- `caddy_data` volume holds ALL TLS certs (both sites) — never delete it.
- TLS renewal is automatic (Caddy). No certbot/cron needed.
- The `proxy/`, `docker-compose.certbot.yml`, and `frontend/nginx.ssl.conf`
  files are NOT used on this VPS (they were for a standalone-nginx scenario) —
  safe to ignore or delete.
- If `carwithdriver.lk` ever 502s: check `driverhire-web` is running and on
  `shopstatesideglobal_internal` (`docker inspect driverhire-driverhire-web-1
  --format '{{json .NetworkSettings.Networks}}'`).
