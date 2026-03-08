FROM nginx:1.27-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Create certbot webroot directory
RUN mkdir -p /var/www/certbot

# Nginx's official Docker image automatically runs envsubst
# on files in /etc/nginx/templates/ and outputs to /etc/nginx/conf.d/
# NGINX_ENVSUBST_FILTER restricts which variables are substituted
# (set in docker-compose.yml to "DOMAIN" so nginx vars like $host are preserved)

EXPOSE 80 443

# Use default entrypoint from nginx image (handles envsubst)
CMD ["nginx", "-g", "daemon off;"]
