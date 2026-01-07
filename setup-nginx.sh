#!/bin/bash
# Setup script for Nginx configuration on VPS
# Run this on your VPS as root or with sudo

set -e

echo "==== DRIVERHIRE Nginx Setup ===="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use: sudo ./setup-nginx.sh)"
   exit 1
fi

# Get user input
read -p "Enter your domain (e.g., carwithdriver.lk): " DOMAIN
read -p "Enter path to DRIVERHIRE directory (e.g., /home/user/DRIVERHIRE): " APP_PATH
read -p "Enter path to frontend build directory (usually /home/user/DRIVERHIRE/frontend/dist): " FRONTEND_PATH

# Validate paths exist
if [ ! -d "$APP_PATH" ]; then
    echo "Error: DRIVERHIRE directory not found at $APP_PATH"
    exit 1
fi

if [ ! -d "$APP_PATH/uploads" ]; then
    echo "Error: uploads directory not found at $APP_PATH/uploads"
    exit 1
fi

echo ""
echo "Using configuration:"
echo "  Domain: $DOMAIN"
echo "  App Path: $APP_PATH"
echo "  Frontend Path: $FRONTEND_PATH"
echo ""

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "Nginx not found. Installing..."
    apt-get update
    apt-get install -y nginx
fi

# Create Nginx config
CONFIG_FILE="/etc/nginx/sites-available/$DOMAIN"

echo "Creating Nginx configuration at $CONFIG_FILE..."

cat > "$CONFIG_FILE" << 'EOF'
# Nginx configuration for DRIVERHIRE with image uploads

upstream backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;
    client_max_body_size 15M;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;
    client_max_body_size 15M;

    # SSL certificates (adjust paths to your actual certificates)
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Root for static files
    root FRONTEND_PATH_PLACEHOLDER;

    # Serve frontend static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Serve uploaded images directly from disk
    location /uploads {
        alias APP_PATH_PLACEHOLDER/uploads;
        
        # Cache images for 30 days
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Pragma "public";
        
        # Allow cross-origin requests
        add_header Access-Control-Allow-Origin "*";
        
        # Don't log image requests to reduce log size
        access_log off;
    }

    # Proxy API requests to Node backend
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/javascript;
    gzip_vary on;
}
EOF

# Replace placeholders
sed -i "s|DOMAIN_PLACEHOLDER|$DOMAIN|g" "$CONFIG_FILE"
sed -i "s|APP_PATH_PLACEHOLDER|$APP_PATH|g" "$CONFIG_FILE"
sed -i "s|FRONTEND_PATH_PLACEHOLDER|$FRONTEND_PATH|g" "$CONFIG_FILE"

echo "✓ Configuration created"

# Check if site is already enabled
if [ -L "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    echo "Note: Site already enabled"
else
    echo "Enabling site..."
    ln -s "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
fi

# Remove default site if it exists
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    echo "Disabling default site..."
    rm "/etc/nginx/sites-enabled/default"
fi

# Fix permissions
echo "Fixing upload directory permissions..."
chown -R www-data:www-data "$APP_PATH/uploads"
chmod -R 755 "$APP_PATH/uploads"

# Test Nginx configuration
echo ""
echo "Testing Nginx configuration..."
if nginx -t; then
    echo "✓ Configuration is valid"
else
    echo "✗ Configuration has errors!"
    exit 1
fi

# Reload Nginx
echo ""
echo "Reloading Nginx..."
systemctl reload nginx

echo ""
echo "==== Setup Complete ===="
echo ""
echo "Next steps:"
echo "1. Verify SSL certificates are installed at:"
echo "   /etc/letsencrypt/live/$DOMAIN/"
echo ""
echo "2. If SSL certificates are missing, run:"
echo "   sudo certbot certonly --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "3. Test the configuration:"
echo "   curl -k https://$DOMAIN/uploads/"
echo ""
echo "4. Check Nginx logs for any issues:"
echo "   tail -f /var/log/nginx/error.log"
echo ""
