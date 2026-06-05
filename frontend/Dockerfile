# ---- Stage 1: Build the Vite/React static bundle ----
FROM node:20-alpine AS build

WORKDIR /app

# Vite inlines VITE_* variables at BUILD time, so they must be passed as
# build args here (not at runtime). Defaults keep the app working with the
# nginx reverse proxy (relative /api).
ARG VITE_API_URL=/api
ARG VITE_GA_MEASUREMENT_ID=
ARG VITE_GOOGLE_MAPS_API_KEY=
ARG VITE_GOOGLE_CLIENT_ID=

ENV VITE_API_URL=$VITE_API_URL \
    VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: Serve static files + reverse proxy via nginx ----
FROM nginx:1.27-alpine

# Replace the default site with our SPA + reverse-proxy config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy the built frontend
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
