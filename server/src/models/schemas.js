// Zod schemas for all API body and query params.
// Provides normalization (email → lowercase) and validation (password length, query bounds).
// Audit bugs S4 (password), S5 (email), S10 (query).

const { z } = require('zod');
const { HERO_CLASSES } = require('../constants');

// ─── SHARED PRIMITIVES ────────────────────────────────────

const emailSchema = z
  .string({ required_error: 'email required' })
  .trim()
  .toLowerCase()
  .email('email must be a valid address')
  .max(254); // RFC 5321

const passwordRegisterSchema = z
  .string({ required_error: 'password required' })
  .min(8, 'password must be ≥ 8 characters')
  .max(128, 'password must be ≤ 128 characters');

const passwordLoginSchema = z
  .string({ required_error: 'password required' })
  .min(1, 'password required')
  .max(128);

const uuidSchema = z.string().uuid('must be a UUID');

const shortText = (field, max = 200) =>
  z.string({ required_error: `${field} required` }).trim().min(1, `${field} required`).max(max);

const slugSchema = z
  .string({ required_error: 'slug required' })
  .trim()
  .toLowerCase()
  .min(2, 'slug too short')
  .max(60, 'slug too long')
  .regex(/^[a-z0-9][a-z0-9-]*$/i, 'slug must be alphanumeric with dashes, start alphanum');

const dateISOSchema = z
  .string({ required_error: 'date required' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

// ─── BODY SCHEMAS ─────────────────────────────────────────

const registerClub = z.object({
  name: shortText('name', 100),
  slug: slugSchema,
  email: emailSchema,
  password: passwordRegisterSchema,
  address: z.string().trim().max(500).optional().default(''),
  city: z.string().trim().max(100).optional().default('Москва'),
});

const loginClub = z.object({
  email: emailSchema,
  password: passwordLoginSchema,
});

const registerMember = z.object({
  club_id: uuidSchema,
  email: emailSchema,
  password: passwordRegisterSchema,
  name: shortText('name', 100),
  hero_class: z
    .enum(Object.keys(HERO_CLASSES))
    .optional()
    .default('warrior'),
});

const loginMember = z.object({
  club_id: uuidSchema,
  email: emailSchema,
  password: passwordLoginSchema,
});

const exerciseSchema = z.object({
  name: z.string().trim().max(100).optional().default(''),
  sets: z.coerce.number().int().min(0).max(99).optional().default(0),
  reps: z.coerce.number().int().min(0).max(999).optional().default(0),
  weight_kg: z.coerce.number().min(0).max(2000).optional().default(0),
});

const createWorkout = z.object({
  duration_minutes: z.coerce.number().int().min(0).max(600).optional().default(0),
  calories: z.coerce.number().int().min(0).max(10000).optional().default(0),
  type: z.string().trim().max(40).optional().default('checkin'),
  exercises: z.array(exerciseSchema).max(50).optional().default([]),
});

const qrCheckin = z.object({
  qr_token: z.string().min(1, 'qr_token required').max(2000),
});

const createSeason = z
  .object({
    name: shortText('name', 100),
    description: z.string().trim().max(500).optional().default(''),
    start_date: dateISOSchema,
    end_date: dateISOSchema,
  })
  .refine((s) => s.end_date >= s.start_date, {
    message: 'end_date must be >= start_date',
    path: ['end_date'],
  });

const patchSeason = z.object({
  active: z.boolean(),
});

// ─── QUERY SCHEMAS ────────────────────────────────────────

const historyQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ─── EXPORTS ──────────────────────────────────────────────

module.exports = {
  body: {
    registerClub,
    loginClub,
    registerMember,
    loginMember,
    createWorkout,
    qrCheckin,
    createSeason,
    patchSeason,
  },
  query: {
    historyQuery,
  },
};
