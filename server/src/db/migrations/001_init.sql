-- Migration 001: initial schema.
-- This is the schema from initDB() in the pre-refactor server/index.js.
-- On production databases that already have these tables, the migration
-- runner marks this migration as applied WITHOUT executing it (see migrate.js
-- bootstrap logic).

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
