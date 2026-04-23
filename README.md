# Gym Quest

Gamified retention engine for fitness clubs. Vanilla JS frontends + Node/Express API +
PostgreSQL + Expo mobile WebView.

Athletes earn XP, unlock hero classes, and maintain streaks. Club owners track attendance,
send alerts, and run seasons — all from the `/dashboard`. No external SaaS dependencies.

---

## What's inside

```
gymquest/
├── server/              # Node/Express API — 26 endpoints (see docs/API.md)
├── client/              # Vanilla-JS athlete SPA served at /app
├── dashboard/           # Vanilla-JS club-owner dashboard served at /dashboard
├── shared/              # Shared CSS custom-property tokens (shared/css/tokens.css)
├── mobile/              # Expo React Native app (WebView + QR scanner)
├── scripts/             # Operational helpers: smoke.mjs, generate-db-ssl.sh
├── docs/                # Architecture, API reference, deploy runbook
├── .github/workflows/   # CI (lint + typecheck + unit + smoke) and deploy
├── Dockerfile           # Production image for the Node server
├── docker-compose.yml   # db (postgres:16) + app containers
└── nginx.conf           # HTTP reverse proxy baseline (443 template in docs/DEPLOY.md)
```

---

## Prerequisites

| Dependency                 | Version               | Notes                          |
| -------------------------- | --------------------- | ------------------------------ |
| Node.js                    | ≥ 20 (22 recommended) | Matches CI and production      |
| Docker + Docker Compose v2 | Any recent            | For the quick-start path       |
| PostgreSQL 16              | Optional              | Only if running without Docker |

---

## Quick start (Docker)

1. Clone the repo:

   ```bash
   git clone https://github.com/d9772524455/Gymquest && cd Gymquest
   ```

2. Copy and edit the root env file:

   ```bash
   cp .env.example .env
   ```

   Open `.env` and set at minimum:
   - `POSTGRES_PASSWORD` — any strong password
   - `JWT_SECRET` — 64 random hex chars; generate one:

   ```bash
   openssl rand -hex 32
   ```

3. Generate the self-signed Postgres SSL certificate (required because the server forces SSL
   in production):

   ```bash
   bash scripts/generate-db-ssl.sh
   ```

   This creates `db-ssl/server.{crt,key}` (gitignored, bind-mounted into the db container).

4. Start everything:

   ```bash
   docker compose up -d
   ```

5. Open http://localhost:3000 — landing page with links to `/app` (athlete) and `/dashboard`
   (club owner).

   Health check:

   ```bash
   curl http://localhost:3000/api/health
   # → {"status":"ok",...}
   ```

---

## Quick start (without Docker)

Requires PostgreSQL 16 installed and running locally.

```bash
createdb gymquest
cp server/.env.example server/.env
# Edit server/.env: set DATABASE_URL and JWT_SECRET
cd server && npm ci && npm run migrate && npm start
```

Open http://localhost:3000.

---

## Development commands

### Root (run from repo root)

| Command                     | What it does                                            |
| --------------------------- | ------------------------------------------------------- |
| `npm run lint`              | ESLint across the whole repo (must pass 0 errors)       |
| `npm run format`            | Prettier — format all JS/JSON/MD/YML/HTML/CSS           |
| `npm run format:check`      | Prettier — check only (no writes)                       |
| `npm run smoke`             | End-to-end API smoke test against http://localhost:3000 |
| `TARGET=prod npm run smoke` | Same smoke against https://gymquest.ru                  |

### Server (run from `server/`)

| Command             | What it does                                                |
| ------------------- | ----------------------------------------------------------- |
| `npm test`          | 35 unit tests via Node's built-in test runner               |
| `npm run typecheck` | `tsc --noEmit` over JSDoc annotations (soft gate — exits 0) |
| `npm run migrate`   | Apply pending SQL migrations                                |
| `npm run dev`       | Auto-reload server during development (`node --watch`)      |
| `npm start`         | Production start (used by Docker and CI deploy)             |

---

## Testing

Unit tests live in `server/test/unit/` — three files covering XP calculations (`xp.test.js`),
geofencing (`geo.test.js`), and Zod schema validation (`schemas.test.js`). Run them with
`cd server && npm test` (uses `node --test`, no extra framework needed).

End-to-end smoke is in `scripts/smoke.mjs` — it registers a club, logs in, creates a member,
posts a workout, checks the leaderboard, and verifies a handful of other happy paths. Run it
against a live server: `npm run smoke` (local) or `TARGET=prod npm run smoke` (production).

CI runs lint, typecheck, unit tests, and smoke on every pull request via
`.github/workflows/ci.yml`.

---

## Mobile (Expo APK)

```bash
cd mobile
npm ci
npx expo start                                     # dev server (Expo Go or emulator)
eas build --platform android --profile preview     # build production APK
```

APK v5 was delivered to the client via EAS build URL (expires ~30 days after build date —
check the EAS dashboard for active builds if you need to re-download).

Push notifications and geofencing are disabled in the current APK (require FCM +
`google-services.json`; out of scope for this contract).

---

## Deploy

See [docs/DEPLOY.md](docs/DEPLOY.md) for the full runbook: reg.ru Cloud VDS bootstrap,
certbot SSL, nginx 443 block with security headers, GitHub Actions CI/CD secrets, and
rollback procedure.

---

## Architecture & API

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — one-page client-facing summary of what was
built and the Phase 1-4 cleanup work (Russian, non-technical audience).

[docs/API.md](docs/API.md) — 26 endpoint reference with auth requirements, request/response
schemas, and curl examples.

---

## Environment variables

### Root-level — used by `docker compose` (`.env` at repo root)

| Variable            | Required                   | Description                       |
| ------------------- | -------------------------- | --------------------------------- |
| `POSTGRES_DB`       | No (default: `gymquest`)   | Database name                     |
| `POSTGRES_USER`     | No (default: `gymquest`)   | Database user                     |
| `POSTGRES_PASSWORD` | **Yes**                    | Database password                 |
| `JWT_SECRET`        | **Yes**                    | JWT signing secret — 64 hex chars |
| `NODE_ENV`          | No (default: `production`) | `production` or `development`     |
| `SMTP_HOST`         | No                         | SMTP server for retention alerts  |
| `SMTP_PORT`         | No (default: `587`)        | SMTP port                         |
| `SMTP_USER`         | No                         | SMTP login                        |
| `SMTP_PASS`         | No                         | SMTP password / app password      |

### Server-level — used when running without Docker (`server/.env`)

| Variable       | Required                     | Description                                                                           |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL` | **Yes**                      | PostgreSQL connection string                                                          |
| `PORT`         | No (default: `3000`)         | HTTP port                                                                             |
| `JWT_SECRET`   | **Yes**                      | JWT signing secret                                                                    |
| `NODE_ENV`     | No (default: `development`)  | `production` or `development`                                                         |
| `LOG_LEVEL`    | No (default: `info`/`debug`) | Pino log level                                                                        |
| `DB_SSL_MODE`  | No                           | `disable` / `require` / `verify-ca` (defaults to `require` in prod, `disable` in dev) |
| `SMTP_HOST`    | No                           | SMTP server for retention alerts                                                      |
| `SMTP_PORT`    | No (default: `587`)          | SMTP port                                                                             |
| `SMTP_USER`    | No                           | SMTP login                                                                            |
| `SMTP_PASS`    | No                           | SMTP password / app password                                                          |
