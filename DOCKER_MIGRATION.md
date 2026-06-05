# DRIVERHIRE — Docker Migration Guide

Migrate the site from the current Nginx-on-the-host VPS to a new VPS running everything in Docker.

## What the new stack looks like

| Service   | Image / build            | Role                                                            | Exposed |
|-----------|--------------------------|-----------------------------------------------------------------|---------|
| `web`     | `frontend/Dockerfile`    | nginx serving the React build + reverse proxy for `/api`, `/uploads` | 80, 443 |
| `backend` | `backend/Dockerfile`     | Node.js + Express API                                           | internal (3000) |
| `mongo`   | `mongo:7`                | MongoDB database                                                | internal (27017) |

Persistent data lives in two named Docker volumes: `mongo_data` (database) and `uploads_data` (user-uploaded images). The browser only ever talks to `web`; everything else is on a private Docker network.

```
Internet ──▶ web (nginx :80/:443)
                ├── /            → React static files
                ├── /api         → backend:3000
                └── /uploads     → uploads_data volume (falls back to backend)
                                       │
                            backend ──▶ mongo:27017
```

### Files added for Docker
```
docker-compose.yml             # the stack
docker-compose.certbot.yml     # optional: Let's Encrypt cert issuance/renewal
.env.docker.example            # root env (frontend build args + mongo auth)
backend/Dockerfile             # backend image
backend/.dockerignore
frontend/Dockerfile            # multi-stage: build React → serve via nginx
frontend/.dockerignore
frontend/nginx.conf            # in-container nginx (HTTP, default)
frontend/nginx.ssl.conf        # in-container nginx (HTTPS, opt-in)
```

---

## Part 1 — Prepare the NEW VPS

### 1. Install Docker Engine + Compose plugin
```bash
# On the new VPS (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER     # log out / back in so the group applies
docker --version && docker compose version
```

### 2. Get the code onto the server
```bash
git clone <your-repo-url> /opt/driverhire
cd /opt/driverhire
```
(Or `scp`/`rsync` the project directory across.)

### 3. Create the environment files

**Backend secrets** — `backend/.env`:
```bash
cp backend/.env.example backend/.env
nano backend/.env
```
Change these for Docker / production:
```ini
# MongoDB now runs as the "mongo" service, not localhost:
MONGO_URI=mongodb://mongo:27017/driverhire

# A strong, unique secret:
JWT_SECRET=<generate-a-long-random-string>

# Your real domain (CORS + links):
CLIENT_ORIGIN=https://carwithdriver.lk
APP_BASE_URL=https://carwithdriver.lk
PUBLIC_ASSET_BASE_URL=https://carwithdriver.lk/uploads

# Keep your existing values for these:
ADMIN_SETUP_CODE=...
EMAIL_FROM=hello@carwithdriver.lk
BREVO_API_KEY=...
GOOGLE_CLIENT_ID=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER_PREFIX=driverhire
```
> Generate a secret: `openssl rand -hex 32`

**Frontend build args + mongo options** — root `.env`:
```bash
cp .env.docker.example .env
nano .env
```
Fill in `VITE_GOOGLE_CLIENT_ID`, `VITE_GA_MEASUREMENT_ID`, etc. Leave `VITE_API_URL=/api`.
> These are baked into the JS bundle **at build time**. If you change them later you must rebuild: `docker compose build web`.

---

## Part 2 — Migrate data from the OLD VPS

Do this **before** the first start so the app comes up with real data.

### A. Database (MongoDB)

**On the OLD server**, dump the database:
```bash
# If Mongo runs on the host:
mongodump --uri="mongodb://localhost:27017/driverhire" --archive=driverhire.archive --gzip
# (If you use MongoDB Atlas instead, skip this — just keep MONGO_URI pointing at Atlas
#  in backend/.env and you don't need the mongo container at all.)
```
Copy the archive to the new server:
```bash
scp driverhire.archive user@NEW_VPS:/opt/driverhire/
```

**On the NEW server**, start only Mongo and restore into it:
```bash
cd /opt/driverhire
docker compose up -d mongo
docker compose cp driverhire.archive mongo:/tmp/driverhire.archive
docker compose exec mongo mongorestore --archive=/tmp/driverhire.archive --gzip --drop
```

### B. Uploaded images

The `uploads/` folder is not in git. Copy the files from the old server into the `uploads_data` volume.

**From the OLD server**, send the uploads to the new one:
```bash
rsync -avz /path/to/DRIVERHIRE/uploads/ user@NEW_VPS:/tmp/uploads/
```
**On the NEW server**, load them into the volume:
```bash
cd /opt/driverhire
docker compose up -d backend          # creates the uploads_data volume
docker compose cp /tmp/uploads/. backend:/app/uploads/
docker compose exec backend ls -R /app/uploads   # verify
```

---

## Part 3 — Launch the stack

```bash
cd /opt/driverhire
docker compose up -d --build
docker compose ps        # all services should be "running"/"healthy"
docker compose logs -f backend
```

Point your DNS A record at the new VPS IP. The site is now reachable over **HTTP**:
```
http://carwithdriver.lk
```

Verify:
```bash
curl -I http://carwithdriver.lk/                 # 200, serves index.html
curl    http://carwithdriver.lk/api/             # {"status":"ok"}-style response
```

---

## Part 4 — Enabling HTTPS (Let's Encrypt)

Run this once DNS already points at the new server.

1. **Issue the certificate** (nginx must be up on :80 to answer the challenge):
   ```bash
   docker compose up -d web
   docker compose -f docker-compose.yml -f docker-compose.certbot.yml \
     run --rm certbot certonly --webroot -w /var/www/certbot \
     -d carwithdriver.lk -d www.carwithdriver.lk \
     --email you@example.com --agree-tos --no-eff-email
   ```

2. **Switch nginx to the HTTPS config.** Edit `frontend/Dockerfile` and change:
   ```dockerfile
   COPY nginx.conf /etc/nginx/conf.d/app.conf
   ```
   to:
   ```dockerfile
   COPY nginx.ssl.conf /etc/nginx/conf.d/app.conf
   ```
   (Adjust the domain inside `frontend/nginx.ssl.conf` if it isn't `carwithdriver.lk`.)

3. **Rebuild and restart `web`:**
   ```bash
   docker compose up -d --build web
   ```
   The site now serves over `https://` and redirects HTTP → HTTPS.

4. **Auto-renewal** — add a cron entry on the host:
   ```bash
   # crontab -e
   0 3 * * * cd /opt/driverhire && docker compose -f docker-compose.yml -f docker-compose.certbot.yml run --rm certbot renew --quiet && docker compose exec web nginx -s reload
   ```

---

## Day-to-day operations

```bash
# Deploy new code
git pull && docker compose up -d --build

# Logs
docker compose logs -f backend
docker compose logs -f web

# Restart / stop
docker compose restart backend
docker compose down                 # stop (volumes are kept)

# Shell into a container
docker compose exec backend sh
docker compose exec mongo mongosh driverhire
```

### Backups (run regularly)
```bash
# Database
docker compose exec mongo mongodump --uri="mongodb://localhost:27017/driverhire" \
  --archive=/tmp/backup.archive --gzip
docker compose cp mongo:/tmp/backup.archive ./backups/db-$(date +%F).archive

# Uploads
docker run --rm -v driverhire_uploads_data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```
> Volume names are prefixed with the project directory name (`driverhire_`). Check with `docker volume ls`.

---

## Notes & gotchas

- **MongoDB Atlas users:** if `MONGO_URI` already points at Atlas, you don't need the `mongo` service or the DB migration. You can remove the `mongo` service block and its `depends_on`, or just leave it idle.
- **Enabling Mongo auth:** set `MONGO_ROOT_USERNAME`/`MONGO_ROOT_PASSWORD` in root `.env`, and update `MONGO_URI` in `backend/.env` to `mongodb://USER:PASS@mongo:27017/driverhire?authSource=admin`. Auth only initializes on a fresh `mongo_data` volume.
- **Upload size:** the 60 MB limit is set in both nginx (`client_max_body_size`) and Express — already aligned.
- **Decommission the old VPS** only after the new one is verified end-to-end (login, image upload, bookings, email) and DNS has fully propagated.
- The old host-level `nginx.conf.example`, `setup-nginx.sh`, and `deploy.sh` are no longer used in the Docker setup — nginx now lives inside the `web` container.
