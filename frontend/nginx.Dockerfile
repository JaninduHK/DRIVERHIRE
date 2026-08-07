# nginx front for the SSR stack: terminates TLS, proxies /api and /uploads to the Node
# backend, and proxies every other route to the React Router SSR server (ssr:3000).
# The built app itself lives in the `ssr` image, not here.
FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
