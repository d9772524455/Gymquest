// Inactivity alert email logic. Reads members with N+ days of inactivity,
// sends one email per member to the club owner.

const { query, queryOne } = require('../db/pool');
const { makeTransporter, sendMail } = require('./mailer');
const { ALERT_DAYS_MEDIUM } = require('../constants');
const config = require('../config');

/**
 * Fetch inactive members (>= N days) and send alert emails to the club owner.
 * @param {string} clubId
 * @returns {Promise<{ sent: number, total_alerts: number, message?: string }>}
 */
async function sendInactivityAlerts(clubId) {
  const transporter = makeTransporter();
  if (!transporter) {
    return { sent: 0, total_alerts: 0, message: 'SMTP not configured (see .env: SMTP_HOST/USER/PASS)' };
  }

  const club = await queryOne('SELECT name, owner_email FROM clubs WHERE id=$1', [clubId]);
  if (!club) return { sent: 0, total_alerts: 0, message: 'Club not found' };

  const alerts = await query(
    `SELECT m.name, m.level,
       (CURRENT_DATE - COALESCE(m.last_w, m.created_at::date))::int as days
     FROM members m
     WHERE m.club_id=$1 AND m.active=TRUE
       AND (CURRENT_DATE - COALESCE(m.last_w, m.created_at::date))::int >= $2
     ORDER BY days DESC
     LIMIT 20`,
    [clubId, ALERT_DAYS_MEDIUM]
  );

  let sent = 0;
  for (const a of alerts) {
    const ok = await sendMail(transporter, {
      from: `"Gym Quest" <${config.smtp.user}>`,
      to: club.owner_email,
      subject: `⚠️ ${a.name} — ${a.days} дней без визита`,
      html: `<div style="font-family:Arial;padding:20px"><h2 style="color:#ef4444">${a.name}: ${a.days} дней</h2><p>Уровень ${a.level}. Рекомендуем связаться.</p><p style="color:#64748b;font-size:12px">Gym Quest • ${club.name}</p></div>`,
    });
    if (ok) sent++;
  }
  return { sent, total_alerts: alerts.length };
}

module.exports = { sendInactivityAlerts };
