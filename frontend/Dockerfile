# ---- Stage 1: Build the React Router (Vite) client + server bundles ----
FROM node:20-alpine AS build

WORKDIR /app

# Vite inlines VITE_* variables into the CLIENT bundle at BUILD time, so they must be
# passed as build args here (not at runtime). Defaults keep the browser using the
# relative /api path (proxied by nginx).
ARG VITE_API_URL=/api
ARG VITE_GA_MEASUREMENT_ID=
ARG VITE_GOOGLE_MAPS_API_KEY=

ENV VITE_API_URL=$VITE_API_URL \
    VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: Run the SSR server (Node) ----
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
# SSR route loaders fetch the API over the internal Docker network. Overridable in compose.
ENV SSR_API_ORIGIN=http://backend:3000
ENV PORT=3000

# Production dependencies only — build tooling (@react-router/dev, vite, tailwind) is not
# needed to run the server.
COPY package*.json ./
RUN npm ci --omit=dev

# Built client assets + server bundle.
COPY --from=build /app/build ./build

EXPOSE 3000

# react-router-serve renders the SSR HTML and serves the static client assets.
CMD ["npm", "run", "start"]
