const nodemailer = require('nodemailer');
const {
  APP_BASE_URL,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_FROM
} = require('./env');

const emailConfigured = Boolean(SMTP_HOST && SMTP_FROM);
const transporter = emailConfigured
  ? nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined
  })
  : null;

async function sendPasswordResetEmail(email, token) {
  if (!transporter) {
    const error = new Error('SMTP email settings are missing. Configure SMTP_HOST and SMTP_FROM.');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  const resetUrl = new URL('/reset-password', APP_BASE_URL);
  resetUrl.searchParams.set('token', token);

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Reset your InfoMan password',
    text: `Use this link to reset your InfoMan password. This link expires in one hour:\n\n${resetUrl.toString()}\n\nIf you did not request a reset, you can ignore this email.`,
    html: `<p>Use the link below to reset your InfoMan password. It expires in one hour.</p><p><a href="${resetUrl.toString()}">Reset your password</a></p><p>If you did not request a reset, you can ignore this email.</p>`
  });
}

module.exports = { emailConfigured, sendPasswordResetEmail };
