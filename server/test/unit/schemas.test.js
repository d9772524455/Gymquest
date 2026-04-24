'use strict';

// Unit tests for src/models/schemas.js zod schemas (body + query).
// Uses Node's built-in node:test runner + node:assert/strict. No external deps.

const test = require('node:test');
const assert = require('node:assert/strict');

const { body, query } = require('../../src/models/schemas');

// ─── body.registerClub ────────────────────────────────────

test('body.registerClub: happy path parses with defaults', () => {
  const input = {
    name: 'Test Club',
    slug: 'test-slug',
    email: 'a@b.com',
    password: 'password123',
    address: '',
    city: 'Moscow',
  };
  const result = body.registerClub.parse(input);
  assert.equal(result.name, 'Test Club');
  assert.equal(result.slug, 'test-slug');
  assert.equal(result.email, 'a@b.com');
  assert.equal(result.password, 'password123');
  assert.equal(result.address, '');
  assert.equal(result.city, 'Moscow');
});

test('body.registerClub: email normalized (trim + lowercase)', () => {
  const result = body.registerClub.parse({
    name: 'Test Club',
    slug: 'test-slug',
    email: '  Foo@Bar.COM  ',
    password: 'password123',
  });
  assert.equal(result.email, 'foo@bar.com');
});

test('body.registerClub: short password → ZodError', () => {
  assert.throws(
    () =>
      body.registerClub.parse({
        name: 'Test Club',
        slug: 'test-slug',
        email: 'a@b.com',
        password: 'short',
      }),
    { name: 'ZodError' },
  );
});

test('body.registerClub: slug with space → ZodError', () => {
  assert.throws(
    () =>
      body.registerClub.parse({
        name: 'Test Club',
        slug: 'bad slug',
        email: 'a@b.com',
        password: 'password123',
      }),
    { name: 'ZodError' },
  );
});

test('body.registerClub: missing email → ZodError', () => {
  assert.throws(
    () =>
      body.registerClub.parse({
        name: 'Test Club',
        slug: 'test-slug',
        password: 'password123',
      }),
    { name: 'ZodError' },
  );
});

test('body.registerClub: short password message is in Russian', () => {
  const result = body.registerClub.safeParse({
    name: 'Club',
    slug: 'club',
    email: 'a@b.com',
    password: 'short',
  });
  assert.equal(result.success, false);
  const pwIssue = result.error.issues.find((i) => i.path.join('.') === 'password');
  assert.ok(pwIssue);
  assert.match(pwIssue.message, /минимум 8 символов/);
});

// ─── body.registerMember ─────────────────────────────────

test('body.registerMember: invalid club_id message is in Russian', () => {
  const result = body.registerMember.safeParse({
    club_id: 'not-a-uuid',
    email: 'a@b.com',
    password: 'password123',
    name: 'Athlete',
  });
  assert.equal(result.success, false);
  const clubIdIssue = result.error.issues.find((i) => i.path.join('.') === 'club_id');
  assert.ok(clubIdIssue, 'expected club_id issue');
  assert.match(clubIdIssue.message, /UUID/);
  assert.match(clubIdIssue.message, /администратор/);
});

// ─── body.loginClub ───────────────────────────────────────

test('body.loginClub: 1-char password accepted (min 1 on login)', () => {
  const result = body.loginClub.parse({ email: 'a@b.com', password: 'x' });
  assert.equal(result.email, 'a@b.com');
  assert.equal(result.password, 'x');
});

// ─── body.createSeason ────────────────────────────────────

test('body.createSeason: happy path (end_date >= start_date)', () => {
  const result = body.createSeason.parse({
    name: 'Season 1',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
  });
  assert.equal(result.name, 'Season 1');
  assert.equal(result.start_date, '2026-01-01');
  assert.equal(result.end_date, '2026-12-31');
});

test('body.createSeason: end_date before start_date → ZodError on end_date', () => {
  assert.throws(
    () =>
      body.createSeason.parse({
        name: 'Season 1',
        start_date: '2026-12-31',
        end_date: '2026-01-01',
      }),
    (err) => {
      assert.equal(err.name, 'ZodError');
      // Ensure the refinement path mentions end_date.
      const flat = JSON.stringify(err.issues ?? []);
      assert.match(flat, /end_date/);
      return true;
    },
  );
});

// ─── body.createWorkout ───────────────────────────────────

test('body.createWorkout: empty body → all defaults applied', () => {
  const result = body.createWorkout.parse({});
  assert.equal(result.duration_minutes, 0);
  assert.equal(result.calories, 0);
  assert.equal(result.type, 'checkin');
  assert.deepEqual(result.exercises, []);
});

test('body.createWorkout: 51 exercises → ZodError (max 50)', () => {
  const exercises = Array.from({ length: 51 }, () => ({
    name: 'Squat',
    sets: 3,
    reps: 10,
    weight_kg: 50,
  }));
  assert.throws(
    () => body.createWorkout.parse({ exercises }),
    { name: 'ZodError' },
  );
});

// ─── query.historyQuery ───────────────────────────────────

test('query.historyQuery: string coerces to number, non-numeric throws', () => {
  const ok = query.historyQuery.parse({ limit: '50' });
  assert.equal(ok.limit, 50);
  assert.equal(typeof ok.limit, 'number');

  assert.throws(
    () => query.historyQuery.parse({ limit: 'abc' }),
    { name: 'ZodError' },
  );
});

test('query.historyQuery: missing limit defaults to 20', () => {
  const result = query.historyQuery.parse({});
  assert.equal(result.limit, 20);
});
