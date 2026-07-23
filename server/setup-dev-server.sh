#!/usr/bin/env bash
# ==============================================================================
# 🕌 Chaml.fr Dev Server Setup Automation Script
# Target: dev.chaml.fr (subdomain) running in parallel on Port 5001
# Branch: v2
# Database: chaml_dev_db
# ==============================================================================

set -eo pipefail

# Ensure the script is run as root/sudo
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this script as root or using sudo."
  exit 1
fi

echo "===================================================================="
echo "🚀 Starting dev.chaml.fr Development Server Setup"
echo "===================================================================="

# 1. Ask for database configurations
read -rp "🔑 Enter PostgreSQL User (default: chaml): " DB_USER
DB_USER=${DB_USER:-chaml}
read -s -rp "🔑 Enter PostgreSQL Password: " DB_PASSWORD
echo ""

# 2. Database Creation
echo "📦 Checking and creating development database 'chaml_dev_db'..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'chaml_dev_db'" | grep -q 1 || \
sudo -u postgres createdb -O "$DB_USER" chaml_dev_db
echo "✅ Database 'chaml_dev_db' is ready."

# 3. Create Folder and Clone Repository
DEV_DIR="/var/www/chaml-dev"
if [ -d "$DEV_DIR" ]; then
  echo "📁 Development directory '$DEV_DIR' already exists. Backing up..."
  mv "$DEV_DIR" "${DEV_DIR}_backup_$(date +%s)"
fi

echo "📥 Cloning v2 branch..."
git clone -b v2 https://github.com/ridaounana/chaml.fr.git "$DEV_DIR"

# 4. Set directory ownership
chown -R www-data:www-data "$DEV_DIR"
chmod -R 775 "$DEV_DIR"

# 5. Build and install dependencies
echo "📦 Installing backend and frontend dependencies..."
cd "$DEV_DIR"
npm install --unsafe-perm

cd server
npm install --unsafe-perm

# 6. Generate dev environment configurations (.env)
echo "📝 Creating development .env file..."
cat <<EOF > .env
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chaml_dev_db
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=chaml_dev_jwt_secret_token_vault_key_2026
PII_ENCRYPTION_KEY=chaml_dev_pii_master_vault_secret_2026
EOF

chown www-data:www-data .env
chmod 600 .env

# 7. Compile Frontend Bundle
echo "🏗️ Building React production static assets..."
cd "$DEV_DIR"
npm run build
chown -R www-data:www-data "$DEV_DIR/dist"

# 8. Create Systemd service
echo "⚙️ Configuring systemd service 'chaml-dev-backend.service'..."
cat <<EOF > /etc/systemd/system/chaml-dev-backend.service
[Unit]
Description=Chaml Dev Backend Node Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$DEV_DIR/server
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production PORT=5001 DB_NAME=chaml_dev_db

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable chaml-dev-backend
systemctl restart chaml-dev-backend
echo "✅ Systemd service restarted successfully."

# 9. Nginx configuration
echo "🌐 Configuring Nginx server block for dev.chaml.fr..."
cat <<EOF > /etc/nginx/sites-available/chaml-dev
server {
    listen 80;
    server_name dev.chaml.fr;

    # Dev React App static bundle
    root $DEV_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy to Node backend on Port 5001
    location /api {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/chaml-dev /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
echo "✅ Nginx server blocks updated and reloaded."

# 10. Let's Encrypt SSL
echo "===================================================================="
echo "🎉 Setup complete! Let's enable SSL."
echo "===================================================================="
echo "⚠️ Make sure your DNS A record for dev.chaml.fr points to this VPS."
read -rp "❓ Do you want to run Let's Encrypt Certbot now? (y/n): " RUN_CERTBOT

if [[ "$RUN_CERTBOT" =~ ^[Yy]$ ]]; then
  certbot --nginx -d dev.chaml.fr
fi

echo "🚀 All set! Your dev server is accessible at https://dev.chaml.fr"
