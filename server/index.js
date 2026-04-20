// ═══════════════════════════════════════════════════════════
// GYM QUEST — Production Server
// Express + PostgreSQL + JWT
// Run: node index.js
// ═══════════════════════════════════════════════════════════

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ─── RATE LIMITING ───────────────────────────────────────

let rateLimit;
try { rateLimit = require("express-rate-limit"); } catch {}

if (rateLimit) {
  // General API: 100 requests per 15 min per IP
  app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests, try again later" } }));
  // Auth endpoints: 10 attempts per 15 min per IP
  app.use("/api/clubs/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: "Too many login attempts" } }));
  app.use("/api/members/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: "Too many login attempts" } }));
  app.use("/api/clubs/register", rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { error: "Too many registrations" } }));
  app.use("/api/members/register", rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { error: "Too many registrations" } }));
}

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "hq_dev_secret_change_in_prod";
const isProd = process.env.NODE_ENV === "production";

// ─── DATABASE ────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
});

async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

async function queryOne(text, params) {
  const rows = await query(text, params);
  return rows[0] || null;
}

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clubs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      owner_email TEXT UNIQUE NOT NULL,
      owner_pw TEXT NOT NULL,
      address TEXT DEFAULT '',
      city TEXT DEFAULT 'Москва',
      plan TEXT DEFAULT 'starter',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      active BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      pw TEXT NOT NULL,
      name TEXT NOT NULL,
      hero TEXT DEFAULT 'warrior',
      xp INT DEFAULT 0,
      level INT DEFAULT 1,
      streak INT DEFAULT 0,
      max_streak INT DEFAULT 0,
      total_w INT DEFAULT 0,
      total_min INT DEFAULT 0,
      total_ton REAL DEFAULT 0,
      total_cal INT DEFAULT 0,
      last_w DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      active BOOLEAN DEFAULT TRUE,
      UNIQUE(club_id, email)
    );
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
      club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
      date DATE DEFAULT CURRENT_DATE,
      mins INT DEFAULT 0,
      cal INT DEFAULT 0,
      xp_earned INT DEFAULT 0,
      type TEXT DEFAULT 'checkin',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      workout_id TEXT REFERENCES workouts(id) ON DELETE CASCADE,
      name TEXT,
      sets INT DEFAULT 0,
      reps INT DEFAULT 0,
      weight REAL DEFAULT 0,
      tonnage REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS achievements (
      member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
      ach_id TEXT,
      unlocked_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY(member_id, ach_id)
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
      member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
      risk TEXT DEFAULT 'low',
      days INT DEFAULT 0,
      status TEXT DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,
      club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      active BOOLEAN DEFAULT TRUE
    );
    CREATE INDEX IF NOT EXISTS idx_members_club ON members(club_id);
    CREATE INDEX IF NOT EXISTS idx_workouts_member ON workouts(member_id);
    CREATE INDEX IF NOT EXISTS idx_workouts_club_date ON workouts(club_id, date);
    CREATE INDEX IF NOT EXISTS idx_alerts_club_status ON alerts(club_id, status);
  `);
  console.log("Database schema initialized");
}

// ─── CONFIG ──────────────────────────────────────────────

const HERO_CLASSES = {
  warrior: { name: "Воин", emoji: "⚔️", xpMult: 1.0 },
  runner:  { name: "Бегун", emoji: "⚡", xpMult: 1.0 },
  monk:    { name: "Монах", emoji: "🧘", xpMult: 1.0 },
  titan:   { name: "Титан", emoji: "🔥", xpMult: 1.0 },
};

const XP_LEVELS = [0, 500, 1200, 2100, 3200, 4500, 6000, 7800, 9900, 12500];

const ACHIEVEMENTS = [
  { id: "first_blood", name: "Первая кровь", desc: "Первая тренировка", field: "total_w", op: ">=", val: 1 },
  { id: "streak3", name: "Серия ×3", desc: "3 дня подряд", field: "streak", op: ">=", val: 3 },
  { id: "streak7", name: "Неделя огня", desc: "7 дней подряд", field: "streak", op: ">=", val: 7 },
  { id: "streak30", name: "Месяц стали", desc: "30 дней подряд", field: "streak", op: ">=", val: 30 },
  { id: "w10", name: "Десятка", desc: "10 тренировок", field: "total_w", op: ">=", val: 10 },
  { id: "w50", name: "Полтинник", desc: "50 тренировок", field: "total_w", op: ">=", val: 50 },
  { id: "w100", name: "Центурион", desc: "100 тренировок", field: "total_w", op: ">=", val: 100 },
  { id: "lv5", name: "Середняк", desc: "Уровень 5", field: "level", op: ">=", val: 5 },
  { id: "lv10", name: "Легенда", desc: "Уровень 10", field: "level", op: ">=", val: 10 },
  { id: "ton1k", name: "Тонна", desc: "1 000 кг", field: "total_ton", op: ">=", val: 1000 },
  { id: "ton10k", name: "Тяжеловес", desc: "10 000 кг", field: "total_ton", op: ">=", val: 10000 },
];

// ─── HELPERS ─────────────────────────────────────────────

function calcLevel(xp) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i]) return i + 1;
  }
  return 1;
}

function calcXP(mins, streak, hero) {
  const base = 200 + mins * 5;
  const bonus = Math.min(streak, 30) * 50;
  return Math.round((base + bonus) * (HERO_CLASSES[hero]?.xpMult || 1));
}

function getStreakAction(lastW) {
  if (!lastW) return "reset";
  const today = new Date().toISOString().split("T")[0];
  const last = new Date(lastW).toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (last === today) return "same";
  if (last === yesterday) return "continue";
  return "reset";
}

async function checkAchievements(memberId, stats) {
  const existing = await query("SELECT ach_id FROM achievements WHERE member_id=$1", [memberId]);
  const unlocked = new Set(existing.map(r => r.ach_id));
  const newAchs = [];

  for (const a of ACHIEVEMENTS) {
    if (unlocked.has(a.id)) continue;
    const val = stats[a.field] || 0;
    if (a.op === ">=" && val >= a.val) {
      await query("INSERT INTO achievements(member_id, ach_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [memberId, a.id]);
      newAchs.push({ id: a.id, name: a.name, desc: a.desc });
    }
  }
  return newAchs;
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────

function auth(role) {
  return (req, res, next) => {
    const t = req.headers.authorization?.replace("Bearer ", "");
    if (!t) return res.status(401).json({ error: "No token" });
    try {
      const d = jwt.verify(t, JWT_SECRET);
      if (role && d.role !== role) return res.status(403).json({ error: "Forbidden" });
      req.user = d;
      next();
    } catch { return res.status(401).json({ error: "Bad token" }); }
  };
}

// ─── ERROR HANDLER ───────────────────────────────────────

function wrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: isProd ? "Server error" : err.message });
});

// ─── AUTH ROUTES ─────────────────────────────────────────

app.post("/api/clubs/register", wrap(async (req, res) => {
  const { name, slug, email, password, address, city } = req.body;
  if (!name || !slug || !email || !password) return res.status(400).json({ error: "Missing fields" });
  const id = uuidv4();
  const pw = await bcrypt.hash(password, 10);
  await query("INSERT INTO clubs(id,name,slug,owner_email,owner_pw,address,city) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [id, name, slug, email, pw, address || "", city || "Москва"]);
  res.json({ club_id: id, token: jwt.sign({ id, role: "club", slug }, JWT_SECRET, { expiresIn: "30d" }) });
}));

app.post("/api/clubs/login", wrap(async (req, res) => {
  const { email, password } = req.body;
  const club = await queryOne("SELECT id,slug,owner_pw FROM clubs WHERE owner_email=$1 AND active=TRUE", [email]);
  if (!club) return res.status(401).json({ error: "Not found" });
  if (!(await bcrypt.compare(password, club.owner_pw))) return res.status(401).json({ error: "Wrong password" });
  res.json({ club_id: club.id, token: jwt.sign({ id: club.id, role: "club", slug: club.slug }, JWT_SECRET, { expiresIn: "30d" }) });
}));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.post("/api/members/register", wrap(async (req, res) => {
  const { club_id, email, password, name, hero_class } = req.body;
  if (!club_id || !email || !password || !name) return res.status(400).json({ error: "Missing fields" });
  if (!UUID_RE.test(String(club_id).trim())) return res.status(400).json({ error: "Club ID должен быть скопирован из дашборда клуба (формат UUID)" });
  const hero = hero_class && HERO_CLASSES[hero_class] ? hero_class : "warrior";
  const id = uuidv4();
  const pw = await bcrypt.hash(password, 10);
  await query("INSERT INTO members(id,club_id,email,pw,name,hero) VALUES($1,$2,$3,$4,$5,$6)", [id, club_id, email, pw, name, hero]);
  res.json({ member_id: id, club_id, token: jwt.sign({ id, role: "member", club_id }, JWT_SECRET, { expiresIn: "30d" }) });
}));

app.post("/api/members/login", wrap(async (req, res) => {
  const { club_id, email, password } = req.body;
  const m = await queryOne("SELECT id,pw FROM members WHERE club_id=$1 AND email=$2 AND active=TRUE", [club_id, email]);
  if (!m) return res.status(401).json({ error: "Not found" });
  if (!(await bcrypt.compare(password, m.pw))) return res.status(401).json({ error: "Wrong password" });
  res.json({ member_id: m.id, token: jwt.sign({ id: m.id, role: "member", club_id }, JWT_SECRET, { expiresIn: "30d" }) });
}));

// ─── MEMBER ROUTES ───────────────────────────────────────

app.get("/api/me", auth("member"), wrap(async (req, res) => {
  const m = await queryOne("SELECT id,club_id,name,hero,xp,level,streak,max_streak,total_w,total_min,total_ton,total_cal,last_w FROM members WHERE id=$1", [req.user.id]);
  if (!m) return res.status(404).json({ error: "Not found" });
  m.xp_next = XP_LEVELS[Math.min(m.level, 9)] || 12500;
  m.hero_info = HERO_CLASSES[m.hero];
  m.achievements = await query("SELECT ach_id, unlocked_at as at FROM achievements WHERE member_id=$1", [m.id]);
  res.json(m);
}));

app.post("/api/workouts", auth("member"), wrap(async (req, res) => {
  const { duration_minutes = 0, calories = 0, exercises = [], type = "checkin" } = req.body;
  const mid = req.user.id;
  const cid = req.user.club_id;

  const m = await queryOne("SELECT id,hero,xp,level,streak,max_streak,total_w,total_min,total_ton,total_cal,last_w FROM members WHERE id=$1", [mid]);
  if (!m) return res.status(404).json({ error: "Not found" });

  const action = getStreakAction(m.last_w);
  const newStreak = action === "continue" ? m.streak + 1 : action === "same" ? m.streak : 1;
  const xp = calcXP(duration_minutes, newStreak, m.hero);

  let tonnage = 0;
  const wid = uuidv4();
  const today = new Date().toISOString().split("T")[0];

  await query("INSERT INTO workouts(id,member_id,club_id,date,mins,cal,xp_earned,type) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    [wid, mid, cid, today, duration_minutes, calories, xp, type]);

  for (const ex of exercises) {
    const t = (ex.sets || 0) * (ex.reps || 0) * (ex.weight_kg || 0);
    tonnage += t;
    await query("INSERT INTO exercises(id,workout_id,name,sets,reps,weight,tonnage) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [uuidv4(), wid, ex.name || "", ex.sets || 0, ex.reps || 0, ex.weight_kg || 0, t]);
  }

  const newXP = m.xp + xp;
  const newLv = calcLevel(newXP);

  await query(`UPDATE members SET xp=$1, level=$2, streak=$3, max_streak=GREATEST(max_streak,$3),
    total_w=total_w+1, total_min=total_min+$4, total_ton=total_ton+$5, total_cal=total_cal+$6, last_w=$7 WHERE id=$8`,
    [newXP, newLv, newStreak, duration_minutes, tonnage, calories, today, mid]);

  await query("UPDATE alerts SET status='resolved' WHERE member_id=$1 AND status='open'", [mid]);

  const stats = { total_w: m.total_w + 1, streak: newStreak, level: newLv, total_ton: m.total_ton + tonnage };
  const newAchs = await checkAchievements(mid, stats);

  res.json({ workout_id: wid, xp_earned: xp, new_xp: newXP, new_level: newLv, level_up: newLv > m.level, streak: newStreak, tonnage, new_achievements: newAchs });
}));

app.get("/api/workouts/history", auth("member"), wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  res.json(await query("SELECT id,date,mins,cal,xp_earned,type FROM workouts WHERE member_id=$1 ORDER BY created_at DESC LIMIT $2", [req.user.id, limit]));
}));

app.get("/api/leaderboard/:club_id", auth("member"), wrap(async (req, res) => {
  const rows = await query("SELECT id,name,hero,xp,level,streak,total_w FROM members WHERE club_id=$1 AND active=TRUE ORDER BY xp DESC LIMIT 50", [req.params.club_id]);
  res.json(rows.map((r, i) => ({ ...r, rank: i + 1, is_you: r.id === req.user.id })));
}));

app.get("/api/achievements", (_, res) => res.json(ACHIEVEMENTS.map(a => ({ id: a.id, name: a.name, desc: a.desc }))));
app.get("/api/hero-classes", (_, res) => res.json(HERO_CLASSES));

// ─── CLUB ROUTES ─────────────────────────────────────────

app.get("/api/club/stats", auth("club"), wrap(async (req, res) => {
  const c = req.user.id;
  const total = await queryOne("SELECT COUNT(*)::int as n FROM members WHERE club_id=$1 AND active=TRUE", [c]);
  const active = await queryOne("SELECT COUNT(DISTINCT member_id)::int as n FROM workouts WHERE club_id=$1 AND date>=CURRENT_DATE-7", [c]);
  const wMonth = await queryOne("SELECT COUNT(*)::int as n FROM workouts WHERE club_id=$1 AND date>=CURRENT_DATE-30", [c]);
  const avgs = await queryOne("SELECT COALESCE(AVG(xp),0)::int as avg_xp, COALESCE(AVG(streak),0)::numeric(5,1) as avg_streak FROM members WHERE club_id=$1 AND active=TRUE", [c]);
  const daily = await query("SELECT date::text, COUNT(*)::int as visits FROM workouts WHERE club_id=$1 AND date>=CURRENT_DATE-7 GROUP BY date ORDER BY date", [c]);
  const lvl = await query("SELECT level, COUNT(*)::int as count FROM members WHERE club_id=$1 AND active=TRUE GROUP BY level ORDER BY level", [c]);
  res.json({ total_members: total.n, active_week: active.n, workouts_month: wMonth.n, avg_xp: avgs.avg_xp, avg_streak: parseFloat(avgs.avg_streak), daily, level_dist: lvl });
}));

app.get("/api/club/alerts", auth("club"), wrap(async (req, res) => {
  const c = req.user.id;
  const members = await query(`
    SELECT id, name, hero, level, last_w,
      (CURRENT_DATE - COALESCE(last_w, created_at::date))::int as days
    FROM members WHERE club_id=$1 AND active=TRUE ORDER BY days DESC`, [c]);

  const alerts = [];
  for (const m of members) {
    if (m.days < 5) continue;
    const risk = m.days >= 14 ? "high" : m.days >= 7 ? "medium" : "low";
    const existing = await queryOne("SELECT id FROM alerts WHERE member_id=$1 AND status='open'", [m.id]);
    if (existing) {
      await query("UPDATE alerts SET days=$1, risk=$2 WHERE id=$3", [m.days, risk, existing.id]);
    } else {
      await query("INSERT INTO alerts(id,club_id,member_id,risk,days) VALUES($1,$2,$3,$4,$5)", [uuidv4(), c, m.id, risk, m.days]);
    }
    alerts.push({ member_id: m.id, name: m.name, hero: m.hero, level: m.level, days: m.days, risk });
  }
  res.json(alerts);
}));

app.post("/api/club/alerts/:id/resolve", auth("club"), wrap(async (req, res) => {
  await query("UPDATE alerts SET status='resolved' WHERE id=$1 AND club_id=$2", [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

app.get("/api/club/members", auth("club"), wrap(async (req, res) => {
  const rows = await query(`
    SELECT id, name, email, hero, xp, level, streak, total_w, last_w,
      (CURRENT_DATE - COALESCE(last_w, created_at::date))::int as days
    FROM members WHERE club_id=$1 AND active=TRUE ORDER BY xp DESC`, [req.user.id]);
  res.json(rows.map(r => ({ ...r, risk: r.days >= 14 ? "high" : r.days >= 7 ? "medium" : r.days >= 5 ? "low" : "none" })));
}));

app.get("/api/club/top", auth("club"), wrap(async (req, res) => {
  res.json(await query("SELECT id,name,hero,xp,level,streak,total_w FROM members WHERE club_id=$1 AND active=TRUE ORDER BY xp DESC LIMIT 10", [req.user.id]));
}));

// ─── GLOBAL ──────────────────────────────────────────────

app.get("/api/global/leaderboard", wrap(async (_, res) => {
  res.json(await query(`
    SELECT c.id, c.name, c.city, COUNT(m.id)::int as members, COALESCE(ROUND(AVG(m.xp)),0)::int as avg_xp
    FROM clubs c LEFT JOIN members m ON m.club_id=c.id AND m.active=TRUE
    WHERE c.active=TRUE GROUP BY c.id HAVING COUNT(m.id)>0 ORDER BY avg_xp DESC LIMIT 20`));
}));

// ─── QR CHECKIN ──────────────────────────────────────────

app.get("/api/club/qr-token", auth("club"), wrap(async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const token = jwt.sign({ club_id: req.user.id, date: today, type: "checkin" }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ qr_token: token, date: today, expires_in: "24h" });
}));

app.post("/api/qr-checkin", auth("member"), wrap(async (req, res) => {
  const { qr_token } = req.body;
  if (!qr_token) return res.status(400).json({ error: "qr_token required" });
  let decoded;
  try { decoded = jwt.verify(qr_token, JWT_SECRET); } catch { return res.status(400).json({ error: "Invalid or expired QR" }); }
  if (decoded.type !== "checkin" || decoded.club_id !== req.user.club_id) return res.status(403).json({ error: "Wrong club QR" });
  const mid = req.user.id, cid = req.user.club_id;
  const m = await queryOne("SELECT id,hero,xp,level,streak,total_w,total_ton,last_w FROM members WHERE id=$1", [mid]);
  if (!m) return res.status(404).json({ error: "Not found" });
  const action = getStreakAction(m.last_w);
  const newStreak = action === "continue" ? m.streak + 1 : action === "same" ? m.streak : 1;
  const xp = calcXP(0, newStreak, m.hero);
  const wid = uuidv4(), today = new Date().toISOString().split("T")[0];
  await query("INSERT INTO workouts(id,member_id,club_id,date,mins,cal,xp_earned,type) VALUES($1,$2,$3,$4,0,0,$5,'qr_checkin')", [wid, mid, cid, today, xp]);
  const newXP = m.xp + xp, newLv = calcLevel(newXP);
  await query("UPDATE members SET xp=$1,level=$2,streak=$3,max_streak=GREATEST(max_streak,$3),total_w=total_w+1,last_w=$4 WHERE id=$5", [newXP, newLv, newStreak, today, mid]);
  await query("UPDATE alerts SET status='resolved' WHERE member_id=$1 AND status='open'", [mid]);
  const stats = { total_w: m.total_w + 1, streak: newStreak, level: newLv, total_ton: m.total_ton };
  const newAchs = await checkAchievements(mid, stats);
  res.json({ workout_id: wid, xp_earned: xp, new_xp: newXP, new_level: newLv, level_up: newLv > m.level, streak: newStreak, tonnage: 0, new_achievements: newAchs, qr: true });
}));

// ─── EMAIL ALERTS ────────────────────────────────────────

app.post("/api/club/send-alerts", auth("club"), wrap(async (req, res) => {
  let nodemailer; try { nodemailer = require("nodemailer"); } catch { return res.json({ sent: 0, message: "npm install nodemailer" }); }
  if (!process.env.SMTP_HOST) return res.json({ sent: 0, message: "Set SMTP_HOST/USER/PASS in .env" });
  const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || "587"), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  const club = await queryOne("SELECT name, owner_email FROM clubs WHERE id=$1", [req.user.id]);
  const alerts = await query("SELECT m.name, m.level, (CURRENT_DATE-COALESCE(m.last_w,m.created_at::date))::int as days FROM members m WHERE m.club_id=$1 AND m.active=TRUE AND (CURRENT_DATE-COALESCE(m.last_w,m.created_at::date))::int>=7 ORDER BY days DESC LIMIT 20", [req.user.id]);
  let sent = 0;
  for (const a of alerts) {
    try {
      await transporter.sendMail({ from: `"Gym Quest" <${process.env.SMTP_USER}>`, to: club.owner_email,
        subject: `\u26a0\ufe0f ${a.name} \u2014 ${a.days} \u0434\u043d\u0435\u0439 \u0431\u0435\u0437 \u0432\u0438\u0437\u0438\u0442\u0430`,
        html: `<div style="font-family:Arial;padding:20px"><h2 style="color:#ef4444">${a.name}: ${a.days} \u0434\u043d\u0435\u0439</h2><p>\u0423\u0440\u043e\u0432\u0435\u043d\u044c ${a.level}. \u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0443\u0435\u043c \u0441\u0432\u044f\u0437\u0430\u0442\u044c\u0441\u044f.</p><p style="color:#64748b;font-size:12px">Gym Quest \u2022 ${club.name}</p></div>` });
      sent++;
    } catch (e) { console.error("Email error:", e.message); }
  }
  res.json({ sent, total_alerts: alerts.length });
}));

// ─── SEASON ADMIN ────────────────────────────────────────

app.post("/api/club/seasons", auth("club"), wrap(async (req, res) => {
  const { name, description, start_date, end_date } = req.body;
  if (!name || !start_date || !end_date) return res.status(400).json({ error: "name, start_date, end_date required" });
  const id = uuidv4();
  await query("INSERT INTO seasons(id,club_id,name,description,start_date,end_date) VALUES($1,$2,$3,$4,$5,$6)", [id, req.user.id, name, description || "", start_date, end_date]);
  res.json({ season_id: id });
}));

app.get("/api/club/seasons", auth("club"), wrap(async (req, res) => {
  res.json(await query("SELECT * FROM seasons WHERE club_id=$1 ORDER BY start_date DESC", [req.user.id]));
}));

app.patch("/api/club/seasons/:id", auth("club"), wrap(async (req, res) => {
  const { active } = req.body;
  await query("UPDATE seasons SET active=$1 WHERE id=$2 AND club_id=$3", [active, req.params.id, req.user.id]);
  res.json({ ok: true });
}));

app.get("/api/seasons/:club_id/active", wrap(async (req, res) => {
  const s = await queryOne("SELECT id,name,description,start_date,end_date FROM seasons WHERE club_id=$1 AND active=TRUE AND start_date<=CURRENT_DATE AND end_date>=CURRENT_DATE ORDER BY start_date DESC LIMIT 1", [req.params.club_id]);
  res.json(s || { active: false });
}));

// ─── STATIC ──────────────────────────────────────────────

app.use("/app", express.static(path.join(__dirname, "../client")));
app.use("/dashboard", express.static(path.join(__dirname, "../dashboard")));

app.get("/", (_, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gym Quest</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0e14;font-family:sans-serif;color:#e2e8f0}
.c{text-align:center}.h{font-size:48px;font-weight:900;color:#00e5ff;margin-bottom:12px;letter-spacing:2px}
.s{color:#64748b;font-size:14px;margin-bottom:40px}
a{display:block;padding:16px 40px;margin:10px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;transition:all .2s}
.a1{background:#00e5ff;color:#000}.a2{background:#1e2231;color:#2E86C1;border:1px solid #2E86C1}
a:hover{transform:scale(1.03)}</style></head>
<body><div class="c"><div class="h">GYM QUEST</div><div class="s">RPG Retention Engine for Fitness</div>
<a href="/app" class="a1">📱 Приложение атлета</a>
<a href="/dashboard" class="a2">📊 Дашборд клуба</a>
</div></body></html>`);
});

app.get("/api/health", wrap(async (_, res) => {
  const dbCheck = await queryOne("SELECT 1 as ok").catch(() => null);
  res.json({ status: dbCheck ? "ok" : "db_error", version: "2.0.0", name: "Gym Quest API", db: dbCheck ? "connected" : "error" });
}));

// ─── START ───────────────────────────────────────────────

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`\n🎮 Gym Quest v2.0 (PostgreSQL) running on http://localhost:${PORT}`);
    console.log(`📱 Client: http://localhost:${PORT}/app`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🔧 Health: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  DB: ${process.env.DATABASE_URL ? "PostgreSQL" : "⚠️ DATABASE_URL not set!"}\n`);
  });
}

start().catch(err => { console.error("Failed to start:", err); process.exit(1); });
