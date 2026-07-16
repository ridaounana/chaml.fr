# Developer Getting Started & VPS Deployment Guide

This guide details the steps to set up the Chaml development environment locally and deploy the full-stack application to your Ubuntu VPS.

---

## 1. Local Development Setup

### Step 1: Clone and Install Dependencies
Ensure you have Node.js (v18+) and npm installed.
```bash
# Install frontend react dependencies
npm install

# Install server backend dependencies
cd server
npm install
```

### Step 2: PostgreSQL Database Creation
1. Open your PostgreSQL terminal (psql) or administration interface (pgAdmin).
2. Execute the following SQL queries to initialize the database and create the developer role matching your local variables:
   ```sql
   -- Create Database
   CREATE DATABASE chaml_db;

   -- Create Role matching your .env credentials
   CREATE ROLE chaml WITH LOGIN PASSWORD 'votre_mot_de_passe_secu';

   -- Grant Permissions
   GRANT ALL PRIVILEGES ON DATABASE chaml_db TO chaml;
   \c chaml_db;
   GRANT ALL ON SCHEMA public TO chaml;
   ```

### Step 3: Run the Application
1. **Launch the Express Backend**:
   ```bash
   cd server
   npm run dev
   ```
   *The server starts on `http://localhost:5000`. It will automatically query `schema.sql` to create tables and seed default data (admin account and initial couple Anass & Salma) if the database is blank.*

2. **Launch the Vite React Frontend**:
   Navigate to the root directory and run:
   ```bash
   npm run dev
   ```
   *Open **`http://localhost:5173/`** to interact with the application. Requests to `/api/*` are automatically proxied to the backend server.*

---

## 2. VPS Production Deployment Guide

To deploy **Chaml** on a single-node Ubuntu VPS with Nginx and SSL:

### A. Run Express with Systemd (Daemon Mode)
Create a systemd service descriptor to ensure the Node backend auto-restarts on server reboot.

1. Write a configuration file `/etc/systemd/system/chaml-backend.service`:
   ```ini
   [Unit]
   Description=Chaml SaaS Node Backend Service
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/chaml-app/server
   ExecStart=/usr/bin/node server.js
   Restart=on-failure
   Environment=NODE_ENV=production PORT=5000

   [Install]
   WantedBy=multi-user.target
   ```

2. Reload daemon, start the service, and verify logs:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable chaml-backend
   sudo systemctl start chaml-backend
   sudo systemctl status chaml-backend
   ```

---

### B. Configure Nginx Server Blocks
To route external HTTPS requests safely to your React app and forward API requests to Express, configure Nginx in `/etc/nginx/sites-available/chaml`:

```nginx
server {
    listen 80;
    server_name chaml.fr www.chaml.fr;

    # Static Frontend
    root /var/www/chaml-app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Reverse Proxy
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the Nginx block and restart:
```bash
sudo ln -s /etc/nginx/sites-available/chaml /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### C. Enable SSL/TLS with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d chaml.fr -d www.chaml.fr
```
*Certbot will automatically verify your domain, apply TLS 1.3 certificates, redirect HTTP traffic to HTTPS, and schedule automated renewals.*
