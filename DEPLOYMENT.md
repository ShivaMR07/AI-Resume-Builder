# Enterprise Production & Deployment Guide

This guide details how to build, containerize, and deploy the **AI Resume Builder & Career Suite SaaS** into production environments.

---

## 🏗 System Architecture

```text
[ Browser / Client ]
         │ (HTTPS :443 / :80)
         ▼
[ Nginx Alpine Reverse Proxy & Static SPA Server ]
         │
         ├──► /index.html & /assets/*  (React 19 SPA, cached 1y)
         └──► /api/v1/*                (Proxied to Backend API)
                     │
                     ▼
       [ Node.js Express 5 API Server ]
       • Helmet Security Headers
       • DDoS Rate Limiter (600 req/15m)
       • Auth Brute-Force Limiter (60 req/15m)
       • SaaS Quota & Token Engine
       • BYOK Gateway (OpenAI / Anthropic)
                     │
                     ▼
           [ MongoDB Database ]
       • Multi-tenant user schema
       • Resumes, Profiles, Invoices, Applications
```

---

## 🚀 Deployment Options

### Option 1: One-Command Docker Compose (Recommended for VPS / Dedicated Servers)

Deploy the entire stack (MongoDB + Backend API + Nginx SPA) on any Linux/Unix VPS (AWS EC2, DigitalOcean Droplet, Hetzner, Linode):

#### 1. Clone repository & configure environment
```bash
git clone <your-repo-url>
cd AI_Resume_Builder_
cp .env.example .env
```

#### 2. Edit `.env` with production secrets
```bash
# Minimum required changes:
JWT_SECRET=$(openssl rand -base64 32)
APP_PORT=80
MONGODB_URI=mongodb://mongodb:27017/ai_resume_builder
```

#### 3. Build and launch containers
```bash
docker compose up -d --build
```

#### 4. Verify deployment health
```bash
# Check running containers
docker compose ps

# Check API health
curl http://localhost/api/v1/health

# Tail real-time logs
docker compose logs -f
```

---

### Option 2: Cloud PaaS Deployment (Render / Railway / Fly.io)

#### Backend Service:
1. Create a **Web Service** pointing to `./backend`
2. **Runtime**: Node.js 20
3. **Build Command**: `npm ci`
4. **Start Command**: `npm start`
5. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGODB_URI`: `<Your MongoDB Atlas Connection String>`
   - `JWT_SECRET`: `<Generated Secret>`
   - `CORS_ORIGIN`: `https://your-frontend-domain.com`

#### Managed Database (MongoDB Atlas):
1. Create a free or dedicated cluster on [MongoDB Atlas](https://cloud.mongodb.com/).
2. Create a database user and allow your PaaS IP / `0.0.0.0/0`.
3. Obtain the connection string `mongodb+srv://...` and set as `MONGODB_URI`.

#### Frontend Service (Vercel / Netlify / Cloudflare Pages):
1. Connect repository root with directory `frontend`
2. **Build Command**: `npm run build`
3. **Output Directory**: `dist`
4. **Environment Variables**:
   - `VITE_API_BASE_URL`: `https://your-backend-service.onrender.com/api/v1`

---

## 🔒 Security Hardening in Production

The application includes enterprise security defaults out of the box:

| Security Layer | Implementation | Verification |
| :--- | :--- | :--- |
| **HTTP Headers** | `helmet` configured for XSS, framing prevention, MIME sniffing | `curl -I https://your-domain.com` |
| **DDoS Rate Limiting** | `express-rate-limit` capped at 600 requests / 15 min | Returns HTTP 429 when exceeded |
| **Brute-Force Guard** | Strict limit of 60 auth attempts / 15 min on `/api/v1/auth/*` | Protects credentials & passwords |
| **Google OAuth 2.0** | Cryptographic tokeninfo verification with audience enforcement | Official Google Identity Services |
| **Container Privilege** | Alpine images execute under unprivileged `node` and `nginx` users | No root process in containers |
| **GDPR Compliance** | Full machine-readable export (`GET /api/v1/user/export-data`) and hard deletion (`DELETE /api/v1/user/account`) | Verified by test suite |
| **BYOK Security** | User-supplied OpenAI/Anthropic keys are isolated and bypass platform billing | Bypasses credit checks safely |

---

## 🔑 Google OAuth 2.0 Production Setup

To enable production Google 1-Tap & Sign-In for your users:

1. Visit [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Click **Create Credentials** -> **OAuth Client ID**.
3. Select Application type: **Web application**.
4. Configure **Authorized JavaScript origins**:
   - `http://localhost:5173` (Local development)
   - `http://localhost` (Docker default)
   - `https://your-custom-domain.com` (Production domain)
5. Configure **Authorized redirect URIs**:
   - `http://localhost:5173`
   - `https://your-custom-domain.com`
6. Copy your **Client ID** and **Client Secret** into your `.env` file:
   ```bash
   GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
   ```
7. Restart the services:
   ```bash
   docker compose restart backend
   ```

---

## 📊 Health Monitoring & Diagnostics

The API exposes a comprehensive diagnostic endpoint at `GET /api/v1/health`:

```json
{
  "status": "healthy",
  "service": "AI Resume Builder API",
  "version": "1.0.0",
  "timestamp": "2026-09-30T12:00:00.000Z",
  "uptimeSeconds": 3600,
  "memory": {
    "rssMB": "54.21",
    "heapUsedMB": "28.45",
    "heapTotalMB": "38.10"
  },
  "database": {
    "status": "connected",
    "readyState": 1
  }
}
```

Uptime robot, Datadog, or AWS Route53 can poll `https://your-domain.com/api/v1/health` every 30 seconds.

---

## 🔄 Automated CI/CD Testing

The project includes pre-configured GitHub Actions in `.github/workflows/production-pipeline.yml`:

```bash
# Run complete test verification locally before pushing:
npm run test:all
```
This single command runs:
1. **16 Product Requirement Verification Tests** (`backend/test.js`)
2. **18 End-to-End SaaS Lifecycle Integration Tests** (`backend/e2e_test.js`)
3. **Vite Production Bundler Build & Code Splitting Verification** (`frontend/dist`)

---

## 💾 Database Backup & Disaster Recovery

### Creating a Database Backup
```bash
docker exec -t resume-platform-mongo mongodump --out /data/db/backup-$(date +%F)
docker cp resume-platform-mongo:/data/db/backup-$(date +%F) ./backups/
```

### Restoring from Backup
```bash
docker cp ./backups/backup-2026-09-30 resume-platform-mongo:/data/db/
docker exec -it resume-platform-mongo mongorestore /data/db/backup-2026-09-30
```
