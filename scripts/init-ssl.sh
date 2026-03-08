#!/bin/bash
# Bootstrap SSL certificates for first deployment.
# Usage: ./scripts/init-ssl.sh yourdomain.com [your@email.com]
#
# This script:
# 1. Creates a self-signed placeholder cert so nginx can start
# 2. Starts nginx + certbot via Docker Compose
# 3. Requests a real Let's Encrypt certificate
# 4. Reloads nginx to use the real cert

set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> [email]}"
EMAIL="${2:-}"

COMPOSE="docker compose --profile prod"
CERT_PATH="./certbot/conf/live/${DOMAIN}"

echo "==> Initializing SSL for ${DOMAIN}"

# Step 1: Create self-signed placeholder cert so nginx can start
echo "==> Creating placeholder self-signed certificate..."
mkdir -p "${CERT_PATH}"

docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  alpine/openssl req -x509 -nodes -newkey rsa:2048 \
  -days 1 \
  -keyout "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" \
  -out "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" \
  -subj "/CN=${DOMAIN}"

echo "==> Placeholder cert created."

# Step 2: Start nginx (it will use the placeholder cert)
echo "==> Starting nginx..."
${COMPOSE} up -d nginx

# Step 3: Request real cert from Let's Encrypt
echo "==> Requesting Let's Encrypt certificate..."

CERTBOT_ARGS="certonly --webroot -w /var/www/certbot -d ${DOMAIN} --agree-tos --non-interactive"
if [ -n "${EMAIL}" ]; then
  CERTBOT_ARGS="${CERTBOT_ARGS} --email ${EMAIL}"
else
  CERTBOT_ARGS="${CERTBOT_ARGS} --register-unsafely-without-email"
fi

# Remove placeholder so certbot can write the real cert
rm -rf "${CERT_PATH}"

docker compose run --rm certbot ${CERTBOT_ARGS}

# Step 4: Reload nginx with the real cert
echo "==> Reloading nginx with real certificate..."
docker compose exec nginx nginx -s reload

echo ""
echo "==> SSL setup complete for ${DOMAIN}!"
echo "    Certbot auto-renewal is handled by the certbot container."
echo "    Test: https://${DOMAIN}"
