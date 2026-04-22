// Nodemailer wrapper. Returns null if nodemailer isn't installed or SMTP isn't configured.

const config = require('../config');
const logger = require('../logger');

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch {
  // optional dep — mailer just returns null below
}

/**
 * Build a transporter from config.smtp, or null if misconfigured.
 * @returns {import('nodemailer').Transporter | null}
 */
function makeTransporter() {
  if (!nodemailer) return null;
  if (!config.smtp.host) return null;
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: false,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
}

/** Send one email via the transporter; swallows errors and logs them. */
async function sendMail(transporter, mail) {
  try {
    await transporter.sendMail(mail);
    return true;
  } catch (err) {
    logger.error({ err: err.message }, 'smtp send error');
    return false;
  }
}

module.exports = { makeTransporter, sendMail };
