# Gym Quest — AI Assistant Brief

> Operational context for AI coding sessions. Human onboarding → README.md. Endpoint reference → docs/API.md. Deploy runbook → docs/DEPLOY.md.

## Stack snapshot

- **Backend:** Node.js ≥20 / Express 4 / PostgreSQL 16 / pg / pino / zod / jsonwebtoken / bcryptjs / nodemailer
- **Frontend:** Vanilla ES-modules, no build step. CSS custom properties via `shared/css/tokens.css`
- **Mobile:** Expo SDK 52 / React Native 0.76 / react-native-webview 13 / expo-camera 16
- **Infra:** Docker + docker-compose (v2), nginx reverse proxy, certbot (Let's Encrypt), EAS for Android APK

## File layout

```
server/src/
  app.js          — Express app wiring (middleware + route mounting)
  server.js       — entrypoint: migrate → listen
  config.js       — sole place that reads process.env; fail-fast in prod
  constants.js    — XP levels, hero classes, achievements, rate limits
  logger.js       — pino JSON logger (import and use this, never console.log)
  db/pool.js      — Postgres Pool + query() / queryOne() helpers
  db/migrate.js   — SQL migration runner; bootstrap logic for existing prod schema
  middleware/
    auth.js         — JWT verification (user-auth + club-auth guards)
    rateLimit.js    — express-rate-limit presets
    errorHandler.js — wrap() + errorHandler + HttpError
    validate.js     — validateBody(schema) / validateQuery(schema) via zod
  routes/           — one file per domain
    clubs.js        — register, login, delete
    members.js      — register, login
    me.js           — /api/me (user-auth)
    workouts.js     — POST + history (user-auth)
    qr.js           — /api/qr-checkin (user-auth)
    leaderboard.js  — /api/leaderboard/:club_id (user-auth)
    public.js       — achievements, hero-classes, seasons, global leaderboard (no auth)
    clubAdmin.js    — /api/club/* 11 handlers (club-auth)
    health.js       — /api/health (no auth)
    static.js       — serves client/ dashboard/ shared/ as SPAs
  services/
    xp.js           — XP calculation + level-up logic
    achievements.js — achievement unlock checks
    geo.js          — Haversine distance (geofence, inactive)
    mailer.js       — nodemailer SMTP wrapper
    alerts.js       — member-alert business logic
  models/schemas.js — zod schemas for all request bodies + queries

client/js/    — athlete SPA: api, state, constants, ui/{dom,toast,modal}, screens/*
dashboard/js/ — club SPA: same shape + ui/clipboard
shared/css/tokens.css     — single-source CSS custom properties
mobile/       — Expo app: App.js + config.js
scripts/smoke.mjs         — E2E happy-path API test (axios)
docs/         — API.md, DEPLOY.md, ARCHITECTURE.md, audit-report.md
```

## Non-negotiable invariants

These break production if violated:

1. **localStorage keys are frozen byte-for-byte.** Renaming = every prod user kicked to login.
   - Athlete SPA: `hq_token`, `hq_club`
   - Dashboard SPA: `hq_dtoken`, `hq_dclub`

2. **Mobile↔web bridge names are frozen byte-for-byte.** APK v5 is in the wild.
   - `window.handleQRCheckin` — called by native after QR scan
   - `window.nativeBridge.openQRScanner` — called by web to trigger scanner

3. **EAS projectId** in `mobile/app.json` is `6ba651e5-25d9-4170-903d-61da76ba3678`.
   Do not regenerate — Android uses it to recognize upgrades.

4. **No `innerHTML`** in `client/js/` or `dashboard/js/`.
   XSS-audited. Use `elt()` from `ui/dom.js` + `.textContent`.

5. **Database schema lives in migrations**, not in code.
   `server/src/db/migrations/NNN_name.sql` is append-only.
   Prod bootstrap: `migrate.js` marks `001_init.sql` applied if clubs table already exists.

6. **`server/src/config.js` is the only place that reads `process.env`.**
   Everything else imports from it. Fails fast in production on missing required vars.

## Commands

```bash
# Root — run from repo root
npm run lint              # ESLint, must exit 0 (--max-warnings 0)
npm run format            # prettier write
npm run format:check      # prettier lint
npm run smoke             # E2E happy-path against http://localhost:3000
TARGET=prod npm run smoke # E2E against https://gymquest.ru

# Server
cd server && npm test           # 35 unit tests via node --test
cd server && npm run typecheck  # tsc --noEmit (soft gate, non-blocking)
cd server && npm run migrate    # apply pending SQL migrations
cd server && npm run dev        # node --watch auto-reload
cd server && npm start          # production start

# Mobile
cd mobile && npx expo start                                   # Expo dev server
cd mobile && eas build --platform android --profile preview   # Android APK
```

## Conventions

- **Module system:** CommonJS (`require`) on server. ES-modules (`import`) on client/dashboard. JSX (Babel/Expo) on mobile.
- **Route handlers** wrap with `wrap(async (req, res) => {...})` from `middleware/errorHandler.js`.
- **POST bodies** validated via `validateBody(schema)` from `middleware/validate.js`; schemas in `models/schemas.js`.
- **Error shape:** `{ error: { code, message } }` enforced by errorHandler.
- **Logger:** `const logger = require('./logger')` — never `console.log` in server code (`no-console: warn` in ESLint).
- **Tests:** `server/test/unit/*.test.js` using `node:test` + `node:assert/strict`. No test frameworks.

## Gotchas

- **Postgres SSL bind-mount:** prod uses `./db-ssl/server.{crt,key}` in docker-compose because `config.js` forces SSL when `NODE_ENV=production`. Generate once with `bash scripts/generate-db-ssl.sh`.
- **`DB_SSL_MODE=disable`** required in test/CI where the postgres service container has no SSL. See `config.js` `parseDbSsl()`.
- **CI JWT_SECRET** is generated at runtime: `openssl rand -hex 32` in the workflow step — not hardcoded.
- **Dashboard QR is LOCAL** via `dashboard/vendor/qrcode.min.js`. Never re-add `api.qrserver.com` — that exposed club tokens (XSS vector closed in audit D4).
- **`dashboard/js/ui/dom.js`** is intentionally duplicated from `client/js/ui/dom.js` — per spec §3, no shared JS between SPAs.

## Where stuff lives

| What                                | Path                           |
| ----------------------------------- | ------------------------------ |
| CI (lint + unit + smoke)            | `.github/workflows/ci.yml`     |
| Deploy (push-to-main → SSH)         | `.github/workflows/deploy.yml` |
| Audit log                           | `docs/audit-report.md`         |
| API endpoint reference              | `docs/API.md`                  |
| Deploy runbook + 443 nginx template | `docs/DEPLOY.md`               |
| Client-facing architecture summary  | `docs/ARCHITECTURE.md`         |
