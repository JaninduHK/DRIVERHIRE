# ---- Backend: Node.js + Express API ----
FROM node:20-alpine

# App lives at /app/backend so that the code's `../uploads` path
# (see server.js: path.join(__dirname, '../uploads')) resolves to /app/uploads,
# which is where we mount the uploads volume.
WORKDIR /app/backend

ENV NODE_ENV=production

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Create the uploads tree and hand ownership to the unprivileged node user
RUN mkdir -p /app/uploads/vehicles /app/uploads/profiles /app/uploads/commissions \
    && chown -R node:node /app

USER node

EXPOSE 3000

# Lightweight healthcheck against the root status endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
