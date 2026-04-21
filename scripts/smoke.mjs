#!/usr/bin/env node
/**
 * Gym Quest — smoke test (happy-path).
 *
 * Runs end-to-end through public API:
 *   register club → register athlete → login → workout checkin →
 *   leaderboard → QR token → QR checkin → cleanup.
 *
 * Targets:
 *   TARGET=local (default)  → http://localhost:3000
 *   TARGET=prod             → https://gymquest.ru
 *
 * Exit codes: 0 on success, 1 on any failure.
 *
 * Run:  node scripts/smoke.mjs
 *       npm run smoke
 *       npm run smoke:prod
 *
 * Body field names match server/index.js contract as of Phase 0 audit:
 *   - clubs/register: { name, slug, email, password, address, city }
 *   - members/register: { club_id, email, password, name, hero_class }
 *   - members/login: { club_id, email, password }
 *   - workouts: { duration_minutes, calories, exercises, type }
 */

import axios from 'axios';

const TARGET = process.env.TARGET === 'prod' ? 'https://gymquest.ru' : 'http://localhost:3000';
const TS = Date.now();
const TEST_CLUB_EMAIL = `smoke-club-${TS}@t.invalid`;
const TEST_CLUB_PASS = 'SmokeTest!Club123';
const TEST_MEMBER_EMAIL = `smoke-athlete-${TS}@t.invalid`;
const TEST_MEMBER_PASS = 'SmokeTest!Ath123';

const api = axios.create({ baseURL: TARGET, timeout: 15000, validateStatus: () => true });

let clubToken = null;
let clubId = null;
let memberToken = null;
let memberId = null;

const fail = (step, resp) => {
  console.error(`✗ ${step}`);
  console.error(`  status: ${resp?.status}  body: ${JSON.stringify(resp?.data)}`);
  process.exit(1);
};
const ok = (step, detail = '') => console.log(`✓ ${step}${detail ? ' — ' + detail : ''}`);

async function step1_registerClub() {
  const r = await api.post('/api/clubs/register', {
    name: `SmokeClub${TS}`,
    slug: `smoke-${TS}`,
    email: TEST_CLUB_EMAIL,
    password: TEST_CLUB_PASS,
    address: 'Smoke Street 1',
    city: 'Smokegrad',
  });
  if (r.status !== 200 && r.status !== 201) fail('register club', r);
  if (!r.data.token || !r.data.club_id) fail('register club: missing token/club_id', r);
  clubToken = r.data.token;
  clubId = r.data.club_id;
  ok('register club', `id=${clubId.slice(0, 8)}...`);
}

async function step2_registerMember() {
  const r = await api.post('/api/members/register', {
    club_id: clubId,
    name: `SmokeAthlete${TS}`,
    email: TEST_MEMBER_EMAIL,
    password: TEST_MEMBER_PASS,
    hero_class: 'warrior',
  });
  if (r.status !== 200 && r.status !== 201) fail('register member', r);
  if (!r.data.token || !r.data.member_id) fail('register member: missing token/member_id', r);
  memberToken = r.data.token;
  memberId = r.data.member_id;
  ok('register member', `id=${memberId.slice(0, 8)}...`);
}

async function step3_memberLogin() {
  const r = await api.post('/api/members/login', {
    club_id: clubId,
    email: TEST_MEMBER_EMAIL,
    password: TEST_MEMBER_PASS,
  });
  if (r.status !== 200) fail('member login', r);
  if (!r.data.token) fail('member login: no token', r);
  memberToken = r.data.token;
  ok('member login');
}

async function step4_workoutCheckin() {
  const r = await api.post(
    '/api/workouts',
    { duration_minutes: 45, calories: 300, type: 'checkin', exercises: [] },
    { headers: { Authorization: `Bearer ${memberToken}` } }
  );
  if (r.status !== 200) fail('workout checkin', r);
  if (!(r.data.xp_earned > 0)) fail('workout checkin: no xp earned', r);
  if (r.data.streak !== 1) fail(`workout checkin: streak=${r.data.streak}, expected 1`, r);
  ok('workout checkin', `+${r.data.xp_earned}XP streak=${r.data.streak}`);
}

async function step5_leaderboard() {
  const r = await api.get(`/api/leaderboard/${clubId}`, {
    headers: { Authorization: `Bearer ${memberToken}` },
  });
  if (r.status !== 200) fail('leaderboard', r);
  if (!Array.isArray(r.data) || r.data.length === 0) fail('leaderboard: empty array', r);
  const found = r.data.some((m) => m.id === memberId);
  if (!found) fail('leaderboard: member not in list', r);
  ok('leaderboard', `${r.data.length} member(s)`);
}

async function step6_qrToken() {
  const r = await api.get('/api/club/qr-token', {
    headers: { Authorization: `Bearer ${clubToken}` },
  });
  if (r.status !== 200) fail('qr token', r);
  if (!r.data.qr_token) fail('qr token: missing qr_token', r);
  ok('qr token', `len=${r.data.qr_token.length}`);
  return r.data.qr_token;
}

async function step7_qrCheckin(qrToken) {
  const r = await api.post(
    '/api/qr-checkin',
    { qr_token: qrToken },
    { headers: { Authorization: `Bearer ${memberToken}` } }
  );
  if (r.status !== 200) fail('qr checkin', r);
  if (!(r.data.xp_earned > 0)) fail('qr checkin: no xp earned', r);
  ok('qr checkin', `+${r.data.xp_earned}XP`);
}

async function step8_cleanup() {
  // DELETE /api/clubs/:id doesn't exist yet (bug S15 — will be added in Phase 1).
  // For now: best-effort, log the "no endpoint" warning and leave test data.
  // Manual cleanup via SSH + psql when running against prod.
  try {
    const r = await api.delete(`/api/clubs/${clubId}`, {
      headers: { Authorization: `Bearer ${clubToken}` },
    });
    if (r.status === 200 || r.status === 204) {
      ok('cleanup', `deleted club ${clubId.slice(0, 8)}...`);
    } else if (r.status === 404) {
      console.warn(
        `⚠ cleanup: no DELETE /api/clubs/:id endpoint (status ${r.status}) — ` +
          `leaving test data; clean manually via psql (see bug S15)`
      );
    } else {
      fail('cleanup', r);
    }
  } catch (e) {
    console.warn(`⚠ cleanup: ${e.message} — leaving test data`);
  }
}

async function main() {
  console.log(`▶ Gym Quest smoke test against ${TARGET}`);
  console.log('');
  await step1_registerClub();
  await step2_registerMember();
  await step3_memberLogin();
  await step4_workoutCheckin();
  await step5_leaderboard();
  const qr = await step6_qrToken();
  await step7_qrCheckin(qr);
  await step8_cleanup();
  console.log('');
  console.log('✓ All smoke checks passed');
}

main().catch((e) => {
  console.error('✗ Uncaught error:', e.message);
  console.error(e.stack);
  process.exit(1);
});
