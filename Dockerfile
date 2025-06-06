FROM nginxinc/nginx-unprivileged:latest
WORKDIR /app

COPY src/* /usr/share/nginx/html
