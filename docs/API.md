# API.md — Gym Quest HTTP API reference

Reference for every JSON endpoint exposed by `server/src/app.js`. Audience: frontend
maintainers, the Expo mobile app, third-party integrators, future-you. Sibling docs:
`README.md` (onboarding), `DEPLOY.md` (runbook), `CLAUDE.md` (AI brief).

---

## Base URLs

- Production: `https://gymquest.ru/api`
- Local dev: `http://localhost:3000/api`

## Auth

Bearer JWT in the `Authorization: Bearer <token>` header. Two non-interchangeable
roles (mixing returns `403 Forbidden`):

- `member` — issued by `POST /api/members/{register,login}`. Accepted by `/api/me`,
  `/api/workouts*`, `/api/qr-checkin`, `/api/leaderboard/:club_id`.
- `club` — issued by `POST /api/clubs/{register,login}`. Accepted by all
  `/api/club/*` and `DELETE /api/clubs/:id`.

Tokens are HS256-signed with `JWT_SECRET` and expire after 30 days
(`JWT_EXPIRES_IN_USER`). QR tokens (used by `POST /api/qr-checkin`) expire after 24h.

## Content-Type & errors

POST / PATCH requests MUST send `Content-Type: application/json`. Bodies are parsed
by `express.json({ limit: '1mb' })` then validated by zod schemas in
`server/src/models/schemas.js`. Validation failures return `400` with a flat message
like `"email: email must be a valid address; password: password must be ≥ 8 characters"`.

All errors follow the envelope `{ "error": "message" }`. In production (`NODE_ENV=
production`), `500` errors are masked to `"Server error"`. Status codes: `400`
validation / bad QR, `401` missing or bad JWT / wrong credentials, `403` role
mismatch or cross-tenant, `404` not found, `409` duplicate, `429` rate limit,
`500` unhandled.

## Rate limits

Configured in `server/src/constants.js` → `RATE_LIMITS`, mounted in `app.js`.
Per-IP, returns `429` with `{ "error": "Too many ..." }` plus standard `RateLimit-*`
headers.

| Path pattern                                       | Window | Max requests |
| -------------------------------------------------- | ------ | ------------ |
| `POST /api/clubs/register`                         | 1 hour | 5            |
| `POST /api/members/register`                       | 1 hour | 20           |
| `POST /api/clubs/login`, `POST /api/members/login` | 15 min | 10           |
| `GET /download`                                    | 1 min  | 10           |
| All other `/api/*`                                 | 15 min | 100          |

---

## Clubs

Source: `server/src/routes/clubs.js`.

### POST /api/clubs/register

**Auth:** none · **Rate limit:** 5 / hour / IP

Create a new club account and return a `club`-role JWT.

**Request body:**

```json
{
  "name": "string, required, 1-100 chars",
  "slug": "string, required, 2-60 chars, ^[a-z0-9][a-z0-9-]*$",
  "email": "string, required, valid email, <= 254 chars",
  "password": "string, required, 8-128 chars",
  "address": "string, optional, <= 500 chars, default ''",
  "city": "string, optional, <= 100 chars, default 'Москва'"
}
```

`email` and `slug` are lowercased and trimmed server-side.

**Response 200:** `{ "club_id": "uuid", "token": "eyJ..." }`

**Errors:** `409` — `Slug already taken` or `Email already registered`
(case-insensitive).

**Example:**

```bash
curl -X POST https://gymquest.ru/api/clubs/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Iron Forge Gym",
    "slug": "iron-forge",
    "email": "owner@ironforge.ru",
    "password": "secure-pass-1234"
  }'
```

### POST /api/clubs/login

**Auth:** none · **Rate limit:** 10 / 15 min / IP

Return a `club`-role JWT for an existing club. Lookup is case-insensitive on email
and requires `active=TRUE`.

**Request body:** `{ "email": "...", "password": "..." }` (password 1-128 chars).

**Response 200:** `{ "club_id": "uuid", "token": "eyJ..." }`

**Errors:** `401` — `Not found` (unknown email / deactivated club) or
`Wrong password`.

**Example:**

```bash
curl -X POST https://gymquest.ru/api/clubs/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@ironforge.ru","password":"secure-pass-1234"}'
```

### DELETE /api/clubs/:id

**Auth:** club · **Rate limit:** 100 / 15 min / IP

Hard-delete the authenticated club. Only the owner (JWT `id` claim matching the URL
`:id`) can delete it.

**Response 200:** `{ "deleted": true, "id": "uuid" }`

**Errors:** `403` `Can only delete own club`; `404` `Club not found`.

**Example:**

```bash
curl -X DELETE https://gymquest.ru/api/clubs/<CLUB_ID> \
  -H "Authorization: Bearer <CLUB_TOKEN>"
```

---

## Members (athletes)

Source: `server/src/routes/members.js`.

### POST /api/members/register

**Auth:** none · **Rate limit:** 20 / hour / IP

Register an athlete in an existing club. Returns a `member`-role JWT. If
`hero_class` is omitted or unknown, defaults to `warrior`.

**Request body:**

```json
{
  "club_id": "uuid, required",
  "email": "string, required, valid email, <= 254 chars",
  "password": "string, required, 8-128 chars",
  "name": "string, required, 1-100 chars",
  "hero_class": "warrior | runner | monk | titan (optional, default 'warrior')"
}
```

**Response 200:** `{ "member_id": "uuid", "club_id": "uuid", "token": "eyJ..." }`

**Errors:** `404` `Club not found` (unknown or inactive); `409`
`Email already registered in this club` (case-insensitive, scoped per club).

**Example:**

```bash
curl -X POST https://gymquest.ru/api/members/register \
  -H "Content-Type: application/json" \
  -d '{
    "club_id": "5a2e1c4b-6f82-4b1a-8f5d-1e9c2d7a4b33",
    "email": "athlete@example.com",
    "password": "pick-a-password",
    "name": "Aleksey",
    "hero_class": "runner"
  }'
```

### POST /api/members/login

**Auth:** none · **Rate limit:** 10 / 15 min / IP

Return a `member`-role JWT for an existing athlete. Scoped by `club_id` — the same
email can exist in multiple clubs.

**Request body:** `{ "club_id": "uuid", "email": "...", "password": "..." }`
(password 1-128 chars).

**Response 200:** `{ "member_id": "uuid", "token": "eyJ..." }`

**Errors:** `401` — `Not found` or `Wrong password`.

**Example:**

```bash
curl -X POST https://gymquest.ru/api/members/login \
  -H "Content-Type: application/json" \
  -d '{
    "club_id": "5a2e1c4b-6f82-4b1a-8f5d-1e9c2d7a4b33",
    "email": "athlete@example.com",
    "password": "pick-a-password"
  }'
```

---

## Member profile

Source: `server/src/routes/me.js`.

### GET /api/me

**Auth:** member · **Rate limit:** 100 / 15 min / IP

Return the authenticated athlete's profile: XP, level, streak, totals, achievements,
and hero-class metadata.

**Response 200:** member row columns
(`id, club_id, name, hero, xp, level, streak, max_streak, total_w, total_min,
total_ton, total_cal, last_w`) plus:

- `xp_next` — XP threshold for the next level (from `XP_LEVELS`). Level 10 is the cap
  (`xp_next` stays at `12500`).
- `hero_info` — `{ name, emoji, xpMult }` copied from `HERO_CLASSES`.
- `achievements` — `[{ ach_id, at }]`, `at` is the ISO unlock timestamp.

**Errors:** `404` — member row missing (deleted while token still valid).

**Example:**

```bash
curl https://gymquest.ru/api/me -H "Authorization: Bearer <MEMBER_TOKEN>"
```

---

## Workouts

Source: `server/src/routes/workouts.js`.

### POST /api/workouts

**Auth:** member · **Rate limit:** 100 / 15 min / IP

Log a workout (checkin or strength session). Updates member XP, level, streak,
totals; auto-resolves any open inactivity alerts for the member; unlocks
achievements that crossed their threshold.

**Request body:**

```json
{
  "duration_minutes": "int 0-600, optional, default 0",
  "calories": "int 0-10000, optional, default 0",
  "type": "string <= 40 chars, optional, default 'checkin'",
  "exercises": [
    {
      "name": "string <= 100 chars, optional, default ''",
      "sets": "int 0-99, optional, default 0",
      "reps": "int 0-999, optional, default 0",
      "weight_kg": "number 0-2000, optional, default 0"
    }
  ]
}
```

`exercises` is capped at 50 items. `tonnage` = `Σ sets * reps * weight_kg` across
the array. XP is computed from `duration_minutes`, current `streak`, and the
member's hero class (`calcXP` in `server/src/services/xp.js`).

**Response 200:**

```json
{
  "workout_id": "uuid",
  "xp_earned": 285,
  "new_xp": 2105,
  "new_level": 4,
  "level_up": true,
  "streak": 5,
  "tonnage": 8400,
  "new_achievements": ["streak3", "lv5"]
}
```

`new_achievements` lists IDs from `ACHIEVEMENTS` newly unlocked this workout.

**Errors:** `400` validation; `404` `Member not found`.

**Example:**

```bash
curl -X POST https://gymquest.ru/api/workouts \
  -H "Authorization: Bearer <MEMBER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "duration_minutes": 55,
    "calories": 380,
    "type": "strength",
    "exercises": [
      { "name": "Squat", "sets": 5, "reps": 5, "weight_kg": 100 },
      { "name": "Bench",  "sets": 5, "reps": 5, "weight_kg": 80 }
    ]
  }'
```

### GET /api/workouts/history

**Auth:** member · **Rate limit:** 100 / 15 min / IP

Return the authenticated member's workouts, newest first.

**Query params:** `limit` — int, default `20`, bounds `1-100`.

**Response 200:** array of `{ id, date, mins, cal, xp_earned, type }`.

**Errors:** `400` — `limit` out of bounds.

**Example:**

```bash
curl "https://gymquest.ru/api/workouts/history?limit=10" \
  -H "Authorization: Bearer <MEMBER_TOKEN>"
```

---

## QR check-in

Source: `server/src/routes/qr.js`.

### POST /api/qr-checkin

**Auth:** member · **Rate limit:** 100 / 15 min / IP

Redeem a QR token (minted via `GET /api/club/qr-token` and displayed at reception).
Creates a zero-duration workout of type `qr_checkin`, awards XP, bumps streak, runs
the same achievement/alert logic as `POST /api/workouts`.

The QR token's payload is `{ club_id, date, type: 'checkin' }`. Rejected unless the
decoded `club_id` matches the caller's AND the `date` claim matches today's server
date (YYYY-MM-DD).

**Request body:** `{ "qr_token": "string, 1-2000 chars" }`.

**Response 200:** same shape as `POST /api/workouts` plus `"qr": true`, with
`tonnage: 0`.

**Errors:** `400` `Invalid or expired QR` or `QR expired for today`; `403`
`Wrong club QR` (different club); `404` `Member not found`.

**Example:**

```bash
curl -X POST https://gymquest.ru/api/qr-checkin \
  -H "Authorization: Bearer <MEMBER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"qr_token":"<JWT_FROM_/api/club/qr-token>"}'
```

---

## Leaderboard (member view)

Source: `server/src/routes/leaderboard.js`.

### GET /api/leaderboard/:club_id

**Auth:** member · **Rate limit:** 100 / 15 min / IP

Return up to 50 active members of `club_id` ordered by XP descending. Each row is
annotated with 1-indexed `rank` and `is_you` (true for the authenticated caller).

Note: there is no server-side check that `club_id` matches the caller's own club, so
any authenticated member can view another club's leaderboard if they know the ID.

**Response 200:** array of
`{ id, name, hero, xp, level, streak, total_w, rank, is_you }`.

**Example:**

```bash
curl "https://gymquest.ru/api/leaderboard/<CLUB_ID>" \
  -H "Authorization: Bearer <MEMBER_TOKEN>"
```

---

## Public

Source: `server/src/routes/public.js`. No auth required.

### GET /api/achievements

**Auth:** none · **Rate limit:** 100 / 15 min / IP

Return the full catalog of achievements. Mirrors `ACHIEVEMENTS` in
`server/src/constants.js`.

**Response 200:** array of `{ id, name, desc }` — e.g.
`{ "id": "first_blood", "name": "Первая кровь", "desc": "Первая тренировка" }`.

**Example:**

```bash
curl https://gymquest.ru/api/achievements
```

### GET /api/hero-classes

**Auth:** none · **Rate limit:** 100 / 15 min / IP

Return the map of hero classes (localized name, emoji, XP multiplier). Mirrors
`HERO_CLASSES` in `server/src/constants.js`.

**Response 200:**

```json
{
  "warrior": { "name": "Воин", "emoji": "⚔️", "xpMult": 1.0 },
  "runner": { "name": "Бегун", "emoji": "⚡", "xpMult": 1.0 },
  "monk": { "name": "Монах", "emoji": "🧘", "xpMult": 1.0 },
  "titan": { "name": "Титан", "emoji": "🔥", "xpMult": 1.0 }
}
```

**Example:**

```bash
curl https://gymquest.ru/api/hero-classes
```

### GET /api/seasons/:club_id/active

**Auth:** none · **Rate limit:** 100 / 15 min / IP

Return the currently-active season for a club (`active=TRUE` and today within
`[start_date, end_date]`). If no active season exists, returns `{ "active": false }`.

**Response 200 (active):** `{ id, name, description, start_date, end_date }`.
**Response 200 (none):** `{ "active": false }`.

**Example:**

```bash
curl https://gymquest.ru/api/seasons/<CLUB_ID>/active
```

### GET /api/global/leaderboard

**Auth:** none · **Rate limit:** 100 / 15 min / IP

Return the top 20 clubs globally, ranked by average member XP. Only clubs with at
least one active member are included.

**Response 200:** array of `{ id, name, city, members, avg_xp }`.

**Example:**

```bash
curl https://gymquest.ru/api/global/leaderboard
```

---

## Club admin

Source: `server/src/routes/clubAdmin.js`. All endpoints require a `club`-role JWT
and are scoped to the caller's `club_id` — a club never sees another club's data.

### GET /api/club/stats

**Auth:** club · **Rate limit:** 100 / 15 min / IP

Return dashboard stats for the authenticated club: headcount, recent activity,
averages, daily visits (last 7 days), level distribution.

**Response 200:** `{ name, total_members, active_week, workouts_month, avg_xp,
avg_streak, daily: [{ date, visits }], level_dist: [{ level, count }] }`.

**Example:**

```bash
curl https://gymquest.ru/api/club/stats -H "Authorization: Bearer <CLUB_TOKEN>"
```

### GET /api/club/alerts

**Auth:** club · **Rate limit:** 100 / 15 min / IP

Recompute inactivity risk for every active member. Members with fewer than
`ALERT_DAYS_LOW` (5) days since last workout are skipped; the rest get an open alert
in the DB (inserted or updated in place) and are returned here. Risk tiers: `low`
(5-6 days), `medium` (7-13), `high` (>= 14).

**Response 200:** array of `{ member_id, name, hero, level, days, risk }`.

**Example:**

```bash
curl https://gymquest.ru/api/club/alerts -H "Authorization: Bearer <CLUB_TOKEN>"
```

### POST /api/club/alerts/:id/resolve

**Auth:** club · **Rate limit:** 100 / 15 min / IP

Mark the given alert as `resolved`. Scoped to the caller's club — silently no-ops if
the alert belongs to a different club.

**Response 200:** `{ "ok": true }`

**Example:**

```bash
curl -X POST https://gymquest.ru/api/club/alerts/<ALERT_ID>/resolve \
  -H "Authorization: Bearer <CLUB_TOKEN>"
```

### GET /api/club/members

**Auth:** club · **Rate limit:** 100 / 15 min / IP

Return every active member of the club, ranked by XP descending. `days` is days
since last workout (or account creation if never trained). `risk` uses the same
thresholds as `/api/club/alerts`, plus `none` for `days < 5`.

**Response 200:** array of
`{ id, name, email, hero, xp, level, streak, total_w, last_w, days, risk }`.

**Example:**

```bash
curl https://gymquest.ru/api/club/members -H "Authorization: Bearer <CLUB_TOKEN>"
```

### GET /api/club/top

**Auth:** club · **Rate limit:** 100 / 15 min / IP

Return the club's top 10 members by XP. Smaller/cheaper variant of
`/api/club/members` for dashboard widgets.

**Response 200:** array of `{ id, name, hero, xp, level, streak, total_w }`.

**Example:**

```bash
curl https://gymquest.ru/api/club/top -H "Authorization: Bearer <CLUB_TOKEN>"
```

### GET /api/club/qr-token

**Auth:** club · **Rate limit:** 100 / 15 min / IP

Mint a day-scoped QR token for reception check-in. The token's `date` claim is today
(server time, YYYY-MM-DD); its JWT expiry is 24h. Members redeem it via
`POST /api/qr-checkin`.

**Response 200:** `{ "qr_token": "eyJ...", "date": "2026-04-23", "expires_in": "24h" }`

**Example:**

```bash
curl https://gymquest.ru/api/club/qr-token -H "Authorization: Bearer <CLUB_TOKEN>"
```

### POST /api/club/seasons

**Auth:** club · **Rate limit:** 100 / 15 min / IP

Create a competitive season for the club.

**Request body:**

```json
{
  "name": "string, required, 1-100 chars",
  "description": "string, optional, <= 500 chars, default ''",
  "start_date": "YYYY-MM-DD, required",
  "end_date": "YYYY-MM-DD, required, must be >= start_date"
}
```

**Response 200:** `{ "season_id": "uuid" }`

**Errors:** `400` — validation (e.g. `end_date must be >= start_date`).

**Example:**

```bash
curl -X POST https://gymquest.ru/api/club/seasons \
  -H "Authorization: Bearer <CLUB_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Spring Cup","start_date":"2026-04-01","end_date":"2026-04-30"}'
```

### GET /api/club/seasons

**Auth:** club · **Rate limit:** 100 / 15 min / IP

List every season owned by the club, newest-first (`ORDER BY start_date DESC`).
Returns the raw row — columns: `id, club_id, name, description, start_date,
end_date, active, created_at`.

**Example:**

```bash
curl https://gymquest.ru/api/club/seasons -H "Authorization: Bearer <CLUB_TOKEN>"
```

### PATCH /api/club/seasons/:id

**Auth:** club · **Rate limit:** 100 / 15 min / IP

Toggle a season's `active` flag. Silently no-ops if the season belongs to another
club.

**Request body:** `{ "active": boolean }` (required).

**Response 200:** `{ "ok": true }`

**Errors:** `400` — missing or non-boolean `active`.

**Example:**

```bash
curl -X PATCH https://gymquest.ru/api/club/seasons/<SEASON_ID> \
  -H "Authorization: Bearer <CLUB_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'
```

### POST /api/club/send-alerts

**Auth:** club · **Rate limit:** 100 / 15 min / IP

Send inactivity-alert emails to the club owner for every member inactive for
`ALERT_DAYS_MEDIUM` (7) or more days (capped at 20 per call). Requires SMTP to be
configured via `.env` (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`).

**Response 200:** `{ "sent": 3, "total_alerts": 3 }`. If SMTP is unconfigured or the
club row is missing, `message` is included (e.g. `"SMTP not configured (see .env:
SMTP_HOST/USER/PASS)"`).

> Note (prod): reg.ru Cloud blocks outbound SMTP on ports 25/465/587/2525 by default.
> Even with valid credentials the request will TCP-timeout until the client opens a
> support ticket to unblock egress.

**Example:**

```bash
curl -X POST https://gymquest.ru/api/club/send-alerts \
  -H "Authorization: Bearer <CLUB_TOKEN>"
```

---

## Health

Source: `server/src/routes/health.js`.

### GET /api/health

**Auth:** none · **Rate limit:** 100 / 15 min / IP

Liveness + DB probe. Returns `status: "ok"` if a trivial `SELECT 1` succeeds,
`status: "db_error"` otherwise (always HTTP 200 so load balancers can differentiate
process-up vs DB-down).

**Response 200:** `{ status, name, version, db, uptime_s, node, started_at }`.

**Example:**

```bash
curl https://gymquest.ru/api/health
```

---

## Static routes

Mounted on `/` (not `/api`). Source: `server/src/routes/static.js`.

- `GET /` — landing HTML with links to `/app`, `/dashboard`, and `/download`.
- `GET /app/*` — athlete SPA, served from the `client/` directory via
  `express.static`.
- `GET /dashboard/*` — club dashboard SPA, served from the `dashboard/` directory.
- `GET /shared/*` — shared CSS tokens, served from the `shared/` directory.

### GET /download

**Auth:** none · **Rate limit:** 10 / 1 min / IP (`apkDownload` preset)

Stream the current Android APK to the browser as a file download.

**Response 200:** Binary APK with:

- `Content-Type: application/vnd.android.package-archive`
- `Content-Disposition: attachment; filename="gymquest.apk"`

**Response 503:** `{ "error": { "code": "APK_UNAVAILABLE", "message": "APK временно недоступен" } }` —
APK file not yet uploaded to the VDS. Upload it via `scripts/upload-apk.sh`
(see `docs/DEPLOY.md`).

**Response 429:** Standard rate-limit response when more than 10 requests/min hit
the route from the same IP.

Note: the APK is **not** in git or the Docker image. It lives on the VDS at
`/opt/gymquest/public/gymquest.apk`, bind-mounted read-only into the app container.

**Example:**

```bash
curl -L -o gymquest.apk https://gymquest.ru/download
```

---

Total JSON endpoints: **25**, plus the top-level `GET /` landing page, `GET /download`
(APK), and three `express.static` mounts (`/app/*`, `/dashboard/*`, `/shared/*`).
