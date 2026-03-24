# Nginx SSL Setup for SEO Dashboard API

## Quick Setup

```bash
# 1. Install nginx
sudo apt update && sudo apt install -y nginx

# 2. Create SSL certificate (self-signed - for testing)
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/server.key \
  -out /etc/nginx/ssl/server.crt \
  -subj '/CN=34.44.215.245'

# 3. Create nginx config
sudo tee /etc/nginx/sites-available/seo-api-ssl > /dev/null << 'EOF'
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name 34.44.215.245;

    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:3456;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (required for streaming chat)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 4. Enable config and start nginx
sudo ln -sf /etc/nginx/sites-available/seo-api-ssl /etc/nginx/sites-enabled/
sudo nginx
```

## Update Vercel Environment Variables

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_VM_API_URL` | `https://34.44.215.245` |
| `NEXTAUTH_URL` | `https://34.44.215.245` |

**Important:** `NEXTAUTH_URL` is required for NextAuth session cookies to work correctly behind nginx/SSL. Without it, login will fail.

Then redeploy on Vercel.

## For Let's Encrypt (Production)

Requires a domain name pointing to your IP:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Test

```bash
curl -s -k https://34.44.215.245/api/companies -H "x-api-key: seo-dashboard-api-key-2026"
```