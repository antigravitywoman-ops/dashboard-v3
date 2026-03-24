#!/bin/bash
# deploy-nginx.sh
# Deploy nginx SSL config for SEO Dashboard API on the VM.
# Run from: ~/vm-backend-v2/seo-dashboard-api/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_DIR="$SCRIPT_DIR/nginx"
NGINX_SITE="seo-api-ssl"
VM_IP="34.44.215.245"

echo "=== Nginx SSL Deploy for SEO Dashboard API ==="
echo "VM IP: $VM_IP"
echo ""

# 1. Install nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "[1/5] Installing nginx..."
    sudo apt update
    sudo apt install -y nginx
else
    echo "[1/5] nginx already installed — skipping"
fi

# 2. Generate self-signed SSL certificates
echo "[2/5] Setting up SSL certificates..."
sudo mkdir -p /etc/nginx/ssl

if [ -f "/etc/nginx/ssl/server.crt" ] && [ -f "/etc/nginx/ssl/server.key" ]; then
    echo "    SSL certs already exist at /etc/nginx/ssl/ — skipping generation"
    echo "    To regenerate: sudo rm /etc/nginx/ssl/server.{crt,key} && $0"
else
    echo "    Generating self-signed SSL certificate..."
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/server.key \
        -out /etc/nginx/ssl/server.crt \
        -subj "/CN=$VM_IP"
    echo "    Cert generated: /etc/nginx/ssl/server.crt"
    echo "    Key generated:  /etc/nginx/ssl/server.key"
fi

# 3. Copy nginx site config
echo "[3/5] Deploying nginx site config..."
if [ ! -f "$NGINX_DIR/$NGINX_SITE" ]; then
    echo "ERROR: nginx config not found at $NGINX_DIR/$NGINX_SITE"
    exit 1
fi

sudo cp "$NGINX_DIR/$NGINX_SITE" /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/$NGINX_SITE /etc/nginx/sites-enabled/$NGINX_SITE
echo "    Config deployed: /etc/nginx/sites-available/$NGINX_SITE"

# 4. Remove default site (optional, prevents conflicts on port 80/443)
if [ -L /etc/nginx/sites-enabled/default ]; then
    echo "[4/5] Removing default nginx site..."
    sudo rm -f /etc/nginx/sites-enabled/default
fi

# 5. Test and start nginx
echo "[5/5] Testing and starting nginx..."
if sudo nginx -t; then
    echo "    Config test passed"

    # Start or reload nginx
    if pgrep -x "nginx" > /dev/null; then
        echo "    Reloading nginx..."
        sudo nginx -s reload
    else
        echo "    Starting nginx..."
        sudo nginx
    fi
else
    echo "ERROR: nginx config test failed — not starting"
    exit 1
fi

# Final verification
echo ""
echo "=== Deployed ==="
echo "HTTPS endpoint: https://$VM_IP"
echo "Health check:   curl -s -k https://$VM_IP/health"
echo ""
echo "Next steps:"
echo "  1. Update Vercel env vars:"
echo "       NEXT_PUBLIC_VM_API_URL=https://$VM_IP"
echo "       NEXTAUTH_URL=https://$VM_IP"
echo "  2. Redeploy on Vercel"
echo "  3. For production: get a domain and use Let's Encrypt:"
echo "       sudo certbot --nginx -d your-domain.com"
