# VELANTIS DIGITAL SOLUTIONS — Operational Runbook & Deployment Guide

> **Production Guide for Technical Operations & System Administration**  
> *Targeted for early-stage engineering teams, DevOps engineers, and self-hosted environments.*

---

## 1. System Architecture Overview

```
                                  [ HTTPS Client (Browser) ]
                                              │
                         ┌────────────────────┴────────────────────┐
                         │                                         │
             Static Assets / SPA Routes                     API Requests (/api/*)
                         │                                         │
                         ▼                                         ▼
            [ Built Frontend (dist/) ]                 [ Nginx Reverse Proxy / SSL ]
                                                                   │
                                                                   ▼
                                                   [ Express.js Backend Server ]
                                                   ├── Helmet Security Headers
                                                   ├── Strict CORS Whitelist
                                                   ├── 1MB Body Parser Caps
                                                   ├── XSS Input Sanitizer
                                                   ├── HPP Parameter Guard
                                                   ├── 3-Tier Rate Limiters
                                                   └── HttpOnly JWT Auth Middleware
                                                                   │
                         ┌─────────────────────────────────────────┼────────────────────────┐
                         │                                         │                        │
                         ▼                                         ▼                        ▼
                [ Prisma ORM ]                          [ File Storage Engine ]     [ Email Dispatcher ]
                         │                               (Magic Bytes Inspected)     (Non-Blocking Async)
                         │                                         │                        │
            ┌────────────┴────────────┐                            ▼                        ▼
            ▼                         ▼                   uploads/projects/         [ SMTP / SendGrid ]
    [ Local SQLite ]        [ Production PostgreSQL ]      (UUID Obfuscated)
      (dev.db)                (Multi-Region Pool)
```

---

## 2. Pre-Deployment Verification Checklist

Before shipping code to production, execute the following verification steps:

- [ ] **Dependency Audit**: Run `npm audit` — must return `0 vulnerabilities`.
- [ ] **Full Automated Test Suite**: Run `npm test` — all 12 test suites must pass (100% success rate).
- [ ] **Production Build**: Run `npm run build` — must compile with zero errors and no bundle warnings.
- [ ] **Secrets Verification**: Ensure `.env.production` has unique 64-character secrets for `SESSION_SECRET` and `JWT_SECRET`.
- [ ] **Database Connection**: Confirm the PostgreSQL instance is running with SSL enabled.
- [ ] **Initial Admin Credentials**: Modify default admin email and password from seeds immediately upon initialization.
- [ ] **Reverse Proxy SSL**: Verify TLS 1.2/1.3 is configured with a valid Let's Encrypt or Cloudflare certificate.

---

## 3. Deployment Option A: Docker Compose (Recommended for Unified Hosting)

### 3.1 Setup on Host Machine
1. Clone the repository onto your host server:
   ```bash
   git clone https://github.com/yogeswar-cyber/velantis-digital-solutions.git /opt/velantis
   cd /opt/velantis
   ```

2. Create your production environment file from the template:
   ```bash
   cp .env.production.example .env.production
   nano .env.production
   ```

3. Generate secure cryptographic keys:
   ```bash
   openssl rand -base64 64 # Copy output to SESSION_SECRET
   openssl rand -base64 64 # Copy output to JWT_SECRET
   ```

### 3.2 Launch Containers
```bash
# Build and start services in the background
docker compose up -d --build

# Inspect container health
docker compose ps

# View operational logs in real-time
docker compose logs -f velantis-app
```

### 3.3 Apply PostgreSQL Database Migrations & Seeds
```bash
# Push Prisma schema to the PostgreSQL container
docker compose exec velantis-app npx prisma db push --schema=prisma/schema.postgresql.prisma

# Seed initial services, features, and default administrator
docker compose exec velantis-app node prisma/seed.js
```

---

## 4. Deployment Option B: Bare-Metal / Ubuntu VPS (PM2 + Nginx)

### 4.1 Prerequisites
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx

# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 Process Manager
sudo npm install -g pm2
```

### 4.2 Application Deployment
```bash
# Clone and build
git clone https://github.com/yogeswar-cyber/velantis-digital-solutions.git /var/www/velantis
cd /var/www/velantis
npm ci
npm run build

# Generate Prisma client for production
npx prisma generate

# Create production environment
cp .env.production.example .env
nano .env

# Start with PM2
pm2 start server/src/server.js --name "velantis-api" --instances max --exec-mode cluster
pm2 save
pm2 startup
```

### 4.3 Nginx Reverse Proxy Configuration (`/etc/nginx/sites-available/velantis`)
```nginx
server {
    server_name velantis.in www.velantis.in;

    # Maximum file upload size matching application limit (10MB)
    client_max_body_size 12M;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and acquire SSL:
```bash
sudo ln -s /etc/nginx/sites-available/velantis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d velantis.in -d www.velantis.in
```

---

## 5. Database Backup & Disaster Recovery

### 5.1 Automated PostgreSQL Backup Script (`/opt/scripts/backup-db.sh`)
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/velantis"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Execute pg_dump
docker exec velantis_postgres pg_dump -U velantis -d velantis_db -F c -b -v -f "/tmp/backup_${TIMESTAMP}.dump"
docker cp "velantis_postgres:/tmp/backup_${TIMESTAMP}.dump" "$BACKUP_DIR/"
docker exec velantis_postgres rm "/tmp/backup_${TIMESTAMP}.dump"

# Retain backups for 14 days
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +14 -exec rm {} \;
echo "Backup completed: ${BACKUP_DIR}/backup_${TIMESTAMP}.dump"
```

### 5.2 Uploads Backup
Synchronize uploaded attachments to secure cloud object storage (e.g. AWS S3 or Backblaze B2):
```bash
rclone sync /opt/velantis/uploads/ b2:velantis-backups/uploads/
```

### 5.3 Restoring from Backup
```bash
# Restore PostgreSQL database dump
docker cp backup_20261002.dump velantis_postgres:/tmp/restore.dump
docker exec velantis_postgres pg_restore -U velantis -d velantis_db --clean --if-exists /tmp/restore.dump
```

---

## 6. Security Operations & Incident Response

1. **Compromised Admin Password**:
   - Access database directly:
     ```bash
     npx prisma studio
     ```
   - Generate a fresh bcrypt hash and update `passwordHash` in the `users` table.
   - Rotate `JWT_SECRET` in `.env` to immediately invalidate all existing active cookies across all devices.

2. **Mitigating Spam Floods**:
   - The `/api/contact` endpoint contains a silent honeypot (`hp_website`).
   - The rate limiter will automatically block any IP exceeding 5 contact submissions or 5 project requests within 15 minutes with HTTP 429.

3. **Inspecting Audit Logs**:
   - Authenticated administrators can view real-time security events at `https://velantis.in/admin` under the **Security & Audit Logs** tab.
   - Look for repeated `LOGIN_FAILED` records or unexpected `PROJECT_STATUS_UPDATED` entries.

---

## 7. Operational Health Checks

The backend provides an automated health probe at:
```http
GET /api/health
```

**Normal Response (HTTP 200)**:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "VELANTIS API",
    "version": "1.0.0",
    "environment": "production",
    "database": "connected",
    "timestamp": "2026-10-02T14:38:51.000Z"
  }
}
```

If the database connection is severed or unreachable, the endpoint responds with HTTP 503 and `"database": "disconnected"`, triggering automated alerts in Docker, Kubernetes, or monitoring dashboards (UptimeKuma, Datadog).
