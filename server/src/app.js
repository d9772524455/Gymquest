const express = require('express');
const cors = require('cors');

const rl = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rate limits (middleware — order matters: specific paths before general).
app.use('/api/clubs/login', rl.login);
app.use('/api/members/login', rl.login);
app.use('/api/clubs/register', rl.registerClub);
app.use('/api/members/register', rl.registerMember);
app.use('/api/', rl.general);

// Routes.
app.use('/api/clubs', require('./routes/clubs'));
app.use('/api/members', require('./routes/members'));
app.use('/api/me', require('./routes/me'));
app.use('/api/workouts', require('./routes/workouts'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/club', require('./routes/clubAdmin'));
app.use('/api/qr-checkin', require('./routes/qr'));
app.use('/api/health', require('./routes/health'));
app.use('/api', require('./routes/public')); // hero-classes, achievements, seasons/:club_id/active, global/leaderboard
app.use('/', require('./routes/static')); // /app, /dashboard, landing

// Error handler — MUST be last (S8 fix).
app.use(errorHandler);

module.exports = app;
