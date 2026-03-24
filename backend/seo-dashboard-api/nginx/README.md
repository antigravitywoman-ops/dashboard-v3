# Nginx SSL Setup for SEO Dashboard API

## Structure

```
nginx/
├── seo-api-ssl         ← nginx site config (versioned)
├── ssl/
│   ├── server.crt     ← SSL certificate (gitignored — copy from VM or generate)
│   └── server.key     ← SSL private key (gitignored — copy from VM or generate)
└── deploy-nginx.sh    ← run on VM after pulling repo
```

## Quick Start (on VM)

After pulling the repo, run the deploy script:

```bash
cd ~/vm-backend-v2/seo-dashboard-api
./deploy-nginx.sh
```

This will:
1. Install nginx (if not installed)
2. Generate self-signed SSL certificates
3. Copy the nginx site config
4. Start nginx and test the config

## Manual Setup (if deploy script fails)

```bash
# 1. Install nginx
sudo apt update && sudo apt install -y nginx

# 2. Generate SSL certs
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/server.key \
  -out /etc/nginx/ssl/server.crt \
  -subj '/CN=34.44.215.245'

# 3. Copy config from repo
sudo cp /home/dev/vm-backend-v2/seo-dashboard-api/nginx/seo-api-ssl \
       /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/seo-api-ssl \
             /etc/nginx/sites-enabled/seo-api-ssl

# 4. Start nginx
sudo nginx -t && sudo nginx

# 5. Verify
curl -s -k https://34.44.215.245/health
```

## SSL Certificates

### Development (Self-Signed)
The deploy script auto-generates self-signed certs. You'll get a browser warning — click "Advanced" to proceed.

### Production (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Then update `nginx/seo-api-ssl` with your domain as `server_name`.

## Nginx Rate Limiting

The config includes rate limiting (defined in `/etc/nginx/nginx.conf` or default). To enable:

```bash
# Add to /etc/nginx/nginx.conf in the http {} block:
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
```

## Troubleshooting

```bash
# Check nginx status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# Test config
sudo nginx -t

# Reload after config change
sudo nginx -s reload
```
