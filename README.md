# AI Resume Builder & Career Suite (Production SaaS Platform)

[![CI/CD Pipeline](https://github.com/your-username/ai-resume-builder/actions/workflows/production-pipeline.yml/badge.svg)](.github/workflows/production-pipeline.yml)
[![Node.js](https://img.shields.io/badge/node.js-v20-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/express-v5-blue.svg)](https://expressjs.com)
[![React](https://img.shields.io/badge/react-v19-61dafb.svg)](https://react.dev)
[![Docker](https://img.shields.io/badge/docker-ready-2496ed.svg)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

An enterprise-ready, AI-powered career enablement and resume SaaS platform. It transforms raw career accomplishments into ATS-optimized, beautifully styled, and explainable resumes tailored for target job descriptions — fully equipped with subscription monetization, live ATS simulator, Bring-Your-Own-Key (BYOK) power features, and one-command Docker deployment.

---

## 🌟 SaaS Platform Highlights

- 🚀 **Full SaaS Monetization**: Tiered subscription architecture (**Starter Free**, **Pro Career Accelerator**, and **Executive & Agency**) with monthly/annual billing cycle toggle, AI credit quotas, and simulated checkout & invoice history.
- 🎨 **Public SaaS Marketing Portal**: High-converting landing page with hero KPIs, live interactive ATS score evaluator widget, live 5-template previewer with accent switcher, customer testimonials, and accordion FAQ.
- 🔑 **Bring Your Own Key (BYOK)**: Power-user gateway enabling users to connect their own OpenAI / Anthropic API keys directly, completely bypassing platform credit restrictions.
- 🛡️ **Production Security & Compliance**:
  - `helmet` HTTP security headers & content sniffing guards.
  - DDoS & brute-force rate-limiting (`express-rate-limit`) on global (600 req/15m) and authentication (60 req/15m) paths.
  - GDPR-compliant one-click JSON data export and irreversible hard account deletion.
- 🐳 **Turnkey Production Containerization**: Multi-stage `Dockerfile` builds for backend and frontend with Alpine Linux, non-root user execution, Nginx reverse proxy with gzip compression, SPA fallback routing, and healthchecks in `docker-compose.yml`.
- 🧪 **100% Automated Test Coverage**: 16 unit tests for core functional requirements + 18 end-to-end integration tests validating the full SaaS user lifecycle.

---

## 🧭 System Architecture

```text
[ Web Browser / Client ]
         │ (HTTP :80 / HTTPS :443)
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

## ⚡ Quickstart: Local Development

### Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **MongoDB**: Local or MongoDB Atlas (auto-falls back to in-memory if offline)

### 1. Install all dependencies
```bash
npm run install:all
```

### 2. Configure environment
```bash
cp .env.example .env
```

### 3. Run development servers (Frontend + Backend concurrently)
```bash
npm run dev
```
- **Web App & SaaS Portal**: `http://localhost:5173`
- **Backend API & Healthcheck**: `http://localhost:5000/api/v1/health`
- **Demo User Pre-loaded**: `demo@resume.dev` / `password123` (Pro Tier, 10,000 AI Credits)

---

## 🐳 One-Command Production Docker Deployment

Deploy the entire production stack (MongoDB 7.0 + Node Express API + Nginx Alpine SPA) with Docker Compose:

```bash
# 1. Configure environment
cp .env.example .env

# 2. Build and launch containers in background
docker compose up -d --build

# 3. Check health and running status
docker compose ps
curl http://localhost/api/v1/health
```

The application will be live on `http://localhost` (or your VPS IP / domain on port 80).

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete cloud production instructions (Render, Railway, Fly.io, Vercel, MongoDB Atlas, SSL/TLS, and database backup routines).

---

## 🧪 Comprehensive Test Suite

Run all verification suites with a single command:

```bash
npm run test:all
```

Or run individual suites:

```bash
# 1. Product Requirements Unit Suite (16/16 Features)
npm test --prefix backend

# 2. SaaS Lifecycle End-to-End Integration Suite (18/18 Tests)
npm run test:e2e --prefix backend

# 3. Production Frontend Bundler Build
npm run build --prefix frontend
```

---

## 💎 Pricing Tiers Matrix

| Capability | Starter (Free) | Pro Accelerator | Executive / Agency |
| :--- | :---: | :---: | :---: |
| **Price (Monthly / Annual)** | $0 / mo | $19 / mo ($149 / yr) | $49 / mo ($399 / yr) |
| **Resume Limit** | Up to 2 resumes | **Unlimited** | **Unlimited** |
| **AI Generation Credits** | 10 credits / month | 250 credits / month | 2,000 credits / month |
| **ATS Score Optimizer** | Basic | Advanced Deep Scan | Advanced Deep Scan |
| **Resume Templates** | Modern & Classic | All 5 Templates | All 5 Templates |
| **Cover Letter Studio** | ❌ | Included | Included |
| **BYOK (Custom API Keys)** | ❌ | Included | Included |
| **Job Tracker Pipeline** | 5 jobs max | Unlimited | Unlimited |
| **GDPR Data Portability** | Included | Included | Included |

---

## 📁 Repository Structure

```text
AI_Resume_Builder_/
├── .github/workflows/
│   └── production-pipeline.yml   # CI/CD automated test & build pipeline
├── backend/
│   ├── server.js                 # Express 5 API, Helmet, Rate Limiting, SaaS Engine
│   ├── test.js                   # 16-feature requirement verification suite
│   ├── e2e_test.js               # 18-test SaaS lifecycle end-to-end suite
│   ├── Dockerfile                # Production Node 20 Alpine container
│   ├── .dockerignore
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingView.jsx   # Public SaaS marketing landing page
│   │   │   ├── PricingView.jsx   # Subscription tiers & checkout modal
│   │   │   ├── SettingsView.jsx  # BYOK keys, profile, GDPR export/deletion
│   │   │   ├── DashboardView.jsx # KPI metrics & recent resumes
│   │   │   ├── ResumeEditor.jsx  # Customization controls & sections
│   │   │   ├── ResumePreview.jsx # Live reactive template renderer
│   │   │   └── ...
│   │   ├── App.jsx               # Root SPA with SaaS routing & tier badges
│   │   └── App.css               # Vanilla CSS design system
│   ├── nginx.conf                # Production Nginx reverse proxy & SPA config
│   ├── Dockerfile                # Production multi-stage Vite + Nginx container
│   ├── .dockerignore
│   └── package.json
├── docker-compose.yml            # Multi-service production orchestration
├── .env.example                  # Environment configuration template
├── DEPLOYMENT.md                 # Production deployment & operations manual
├── LICENSE                       # MIT License
└── README.md
```

---

## ⚖️ License & Ethical Grounding

This project is licensed under the [MIT License](./LICENSE). Built with strict adherence to **grounded generative AI**:
- Zero AI hallucinations: the user's factual profile remains the immutable single source of truth.
- All AI suggestions provide confidence scores and plain-English reasoning.
- Full user consent is required before any generated copy is committed to a resume.
