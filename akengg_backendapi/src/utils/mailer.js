// src/utils/mailer.js
// ─────────────────────────────────────────────────────────────────────────
// Thin nodemailer wrapper around the Brevo SMTP relay. The rest of the app
// never touches nodemailer directly — it calls sendMail() and gets back a
// small result object.
//
// Design notes:
//  - The transport is LAZY and cached. Nothing is constructed (and no
//    connection is attempted) until the first email is actually sent.
//  - When SMTP is not configured, sendMail() is a logged no-op returning
//    { skipped: true } instead of throwing. That keeps local/dev environments
//    and the public contact form working without credentials; callers that
//    genuinely need delivery (e.g. "email this invoice") check the result.
//  - `from` MUST be a sender you have verified in Brevo, otherwise the relay
//    rejects the message with a 550.
// ─────────────────────────────────────────────────────────────────────────
const nodemailer = require("nodemailer");

let transporterSingleton = null;

/** True when enough SMTP settings are present to attempt delivery. */
const isConfigured = () =>
  !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  );

const smtpPort = () => Number(process.env.SMTP_PORT) || 587;

const getTransporter = () => {
  if (transporterSingleton) {
    return transporterSingleton;
  }

  const port = smtpPort();

  transporterSingleton = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 (Brevo's default) starts plaintext and upgrades
    // via STARTTLS, which nodemailer does automatically when secure is false.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return transporterSingleton;
};

/** The RFC5322 From header, e.g. `AK Engineering <no-reply@akengg.com>`. */
const defaultFrom = () => {
  const address = process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER;
  const name = process.env.MAIL_FROM_NAME || "AK Engineering";
  return address ? `"${name}" <${address}>` : undefined;
};

/**
 * Send one email through the configured SMTP relay.
 *
 * @param {Object}   options
 * @param {string|string[]} options.to        recipient(s)
 * @param {string}   options.subject
 * @param {string}   options.html
 * @param {string}   [options.text]           plain-text alternative
 * @param {string|string[]} [options.cc]
 * @param {string}   [options.replyTo]
 * @param {Array}    [options.attachments]    nodemailer attachment objects
 * @returns {Promise<{ sent: boolean, skipped?: boolean, messageId?: string, reason?: string }>}
 */
const sendMail = async ({
  to,
  subject,
  html,
  text,
  cc,
  replyTo,
  attachments,
}) => {
  if (!isConfigured()) {
    console.warn(
      `[mailer] SMTP is not configured — skipped email "${subject}" to ${to}`
    );
    return { sent: false, skipped: true, reason: "SMTP is not configured" };
  }

  if (!to) {
    return { sent: false, skipped: true, reason: "No recipient" };
  }

  const info = await getTransporter().sendMail({
    from: defaultFrom(),
    to,
    subject,
    html,
    text,
    ...(cc && { cc }),
    ...(replyTo && { replyTo }),
    ...(attachments && attachments.length && { attachments }),
  });

  return { sent: true, messageId: info.messageId };
};

/**
 * Send without letting a delivery failure break the caller's flow. Used for
 * notifications that must never fail a user-facing write (contact form,
 * newsletter signup) — the record is already saved; the email is a courtesy.
 *
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
const sendMailSafe = async (options) => {
  try {
    return await sendMail(options);
  } catch (error) {
    console.error(
      `[mailer] Failed to send "${options && options.subject}":`,
      error.message
    );
    return { sent: false, error: error.message };
  }
};

/**
 * Verify the SMTP credentials/connection. Not called automatically — use it
 * from a health check or a one-off script to confirm configuration.
 * @returns {Promise<boolean>}
 */
const verifyConnection = async () => {
  if (!isConfigured()) {
    return false;
  }
  await getTransporter().verify();
  return true;
};

module.exports = {
  isConfigured,
  sendMail,
  sendMailSafe,
  verifyConnection,
};
