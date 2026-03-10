# Nginx Dockerfile with envsubst for environment variable substitution
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy configuration template
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

# Default environment variables
ENV SSL_CERT_PATH=/etc/nginx/ssl/dev/localhost.pem
ENV SSL_KEY_PATH=/etc/nginx/ssl/dev/localhost-key.pem

# Nginx will automatically process templates in /etc/nginx/templates/
# and output to /etc/nginx/conf.d/

