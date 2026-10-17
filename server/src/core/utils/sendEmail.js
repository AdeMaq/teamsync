import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import logger from '../../config/logger.js';

// The last few messages, kept in memory outside production. Tests read this to get reset links.
export const outbox = [];
const MAX_OUTBOX = 20;

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

export async function sendEmail({ to, subject, text, html }) {
  if (env.NODE_ENV !== 'production') {
    outbox.push({ to, subject, text, html });
    if (outbox.length > MAX_OUTBOX) outbox.shift();
  }

  if (!transporter) {
    if (env.NODE_ENV === 'production') {
      logger.warn(`SMTP is not configured, email to ${to} was NOT sent (${subject})`);
    } else if (env.NODE_ENV !== 'test') {
      // Development convenience: the message (and any link in it) is printed instead of sent.
      logger.info(`Email not sent (no SMTP configured). To: ${to} | ${subject}\n${text}`);
    }
    return;
  }

  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, text, html });
}
