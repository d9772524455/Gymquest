const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { auth } = require('../middleware/auth');
const { wrap, HttpError } = require('../middleware/errorHandler');
const { query, queryOne } = require('../db/pool');
const { registerClub: rlRegisterClub, login: rlLogin } = require('../middleware/rateLimit');
const { JWT_EXPIRES_IN_USER } = require('../constants');
const { body } = require('../models/schemas');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

router.post(
  '/register',
  rlRegisterClub,
  validateBody(body.registerClub),
  wrap(async (req, res) => {
    const { name, slug, email, password, address, city } = req.body;

    // S6: case-insensitive conflict check so MixedCase existing records are caught.
    const existingSlug = await queryOne('SELECT id FROM clubs WHERE LOWER(slug) = LOWER($1)', [slug]);
    if (existingSlug) throw new HttpError(409, 'Slug already taken');
    const existingEmail = await queryOne(
      'SELECT id FROM clubs WHERE LOWER(owner_email) = LOWER($1)',
      [email]
    );
    if (existingEmail) throw new HttpError(409, 'Email already registered');

    const id = uuidv4();
    const pw = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO clubs(id, name, slug, owner_email, owner_pw, address, city)
       VALUES($1, $2, $3, $4, $5, $6, $7)`,
      [id, name, slug, email, pw, address, city]
    );
    const token = jwt.sign({ id, role: 'club', slug }, config.jwtSecret, {
      expiresIn: JWT_EXPIRES_IN_USER,
    });
    res.json({ club_id: id, token });
  })
);

router.post(
  '/login',
  rlLogin,
  validateBody(body.loginClub),
  wrap(async (req, res) => {
    const { email, password } = req.body;
    const club = await queryOne(
      'SELECT id, slug, owner_pw FROM clubs WHERE LOWER(owner_email) = LOWER($1) AND active=TRUE',
      [email]
    );
    if (!club) throw new HttpError(401, 'Not found');
    if (!(await bcrypt.compare(password, club.owner_pw))) {
      throw new HttpError(401, 'Wrong password');
    }
    const token = jwt.sign({ id: club.id, role: 'club', slug: club.slug }, config.jwtSecret, {
      expiresIn: JWT_EXPIRES_IN_USER,
    });
    res.json({ club_id: club.id, token });
  })
);

router.delete(
  '/:id',
  auth('club'),
  wrap(async (req, res) => {
    if (req.params.id !== req.user.id) {
      throw new HttpError(403, 'Can only delete own club');
    }
    const result = await query('DELETE FROM clubs WHERE id=$1 RETURNING id', [req.user.id]);
    if (result.length === 0) throw new HttpError(404, 'Club not found');
    res.json({ deleted: true, id: req.user.id });
  })
);

module.exports = router;
