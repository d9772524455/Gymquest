const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { wrap, HttpError } = require('../middleware/errorHandler');
const { query, queryOne } = require('../db/pool');
const { registerMember: rlRegisterMember, login: rlLogin } = require('../middleware/rateLimit');
const { JWT_EXPIRES_IN_USER, HERO_CLASSES, DEFAULT_HERO } = require('../constants');
const { body } = require('../models/schemas');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

router.post(
  '/register',
  rlRegisterMember,
  validateBody(body.registerMember),
  wrap(async (req, res) => {
    const { club_id, email, password, name, hero_class } = req.body;

    // S7: confirm club exists before INSERT.
    const club = await queryOne('SELECT id FROM clubs WHERE id=$1 AND active=TRUE', [club_id]);
    if (!club) throw new HttpError(404, 'Club not found');

    // Case-insensitive duplicate check (S6).
    const existing = await queryOne(
      'SELECT id FROM members WHERE club_id=$1 AND LOWER(email) = LOWER($2)',
      [club_id, email]
    );
    if (existing) throw new HttpError(409, 'Email already registered in this club');

    const hero = HERO_CLASSES[hero_class] ? hero_class : DEFAULT_HERO;
    const id = uuidv4();
    const pw = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO members(id, club_id, email, pw, name, hero)
       VALUES($1, $2, $3, $4, $5, $6)`,
      [id, club_id, email, pw, name, hero]
    );
    const token = jwt.sign({ id, role: 'member', club_id }, config.jwtSecret, {
      expiresIn: JWT_EXPIRES_IN_USER,
    });
    res.json({ member_id: id, club_id, token });
  })
);

router.post(
  '/login',
  rlLogin,
  validateBody(body.loginMember),
  wrap(async (req, res) => {
    const { club_id, email, password } = req.body;
    const m = await queryOne(
      'SELECT id, pw FROM members WHERE club_id=$1 AND LOWER(email) = LOWER($2) AND active=TRUE',
      [club_id, email]
    );
    if (!m) throw new HttpError(401, 'Not found');
    if (!(await bcrypt.compare(password, m.pw))) {
      throw new HttpError(401, 'Wrong password');
    }
    const token = jwt.sign({ id: m.id, role: 'member', club_id }, config.jwtSecret, {
      expiresIn: JWT_EXPIRES_IN_USER,
    });
    res.json({ member_id: m.id, token });
  })
);

module.exports = router;
