# Universal POS Deployment Guide

## Architecture Overview
- **Frontend (`apps/web`):** Static SPA built with Vite and React, served through Nginx or CDN (Cloudflare/CloudFront/Fastly) with HTTPS and compression.
- **Backend API (`apps/api`):** Containerized Node.js + NestJS REST service running in Docker/Kubernetes/ECS.
- **Database:** Managed PostgreSQL 15+ (e.g. AWS RDS, GCP Cloud SQL, or Supabase).

---

## 1. Environment Variables Configuration

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Environment mode | `production` / `development` |
| `PORT` | API listen port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://pos_user:password@host:5432/universal_pos` |
| `WEB_ORIGIN` | Allowed client origin for CORS/cookies | `https://pos.yourdomain.com` |
| `SESSION_SECRET` | Secret key for cryptographic signing | `long_random_string_32_characters_minimum` |

---

## 2. Docker Compose Deployment

To launch the entire platform in a containerized environment:

```bash
# 1. Start database, API, and Web containers
docker compose up -d

# 2. Run database migrations
docker compose exec api npm run db:migrate

# 3. (Optional) Run initial seed
docker compose exec api npm run db:seed
```

---

## 3. Production Health Probes
- **Liveness:** `GET /health/liveness` (Returns 200 OK if Node event loop is responsive)
- **Readiness:** `GET /health/readiness` (Returns 200 OK if PostgreSQL database pool is connected and queryable)
