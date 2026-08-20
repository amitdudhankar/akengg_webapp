// src/services/email.service.js
// ─────────────────────────────────────────────────────────────────────────
// Every outbound email in the app, in one place. Templates live in
// src/emails/templates.js; transport lives in src/utils/mailer.js (Brevo SMTP
// relay). This layer decides WHO gets WHAT and WHEN.
//
// Two delivery contracts, deliberately different:
//
//   Courtesy mail (contact form, newsletter) — fire-and-forget via
//   sendMailSafe. The DB row is already committed and the user has already
//   been told "submitted successfully"; a mail failure is logged, never
//   surfaced, and never rolls anything back.
//
//   Requested mail (admin clicks "email this invoice") — awaited and allowed
//   to throw, because the admin is waiting on the result and a silent failure
//   would be worse than an error toast.
// ─────────────────────────────────────────────────────────────────────────
const query = require("../utils/db");
const AppError = require("../utils/appError");
const storage = require("../utils/storage");
const mailer = require("../utils/mailer");
const templates = require("../emails/templates");
const documentPdfService = require("./documentPdf.service");

// ── Recipients ──────────────────────────────────────────────────────────────
// Internal notifications go to MAIL_ADMIN_TO (comma-separated for several
// inboxes); falls back to the From address so a half-configured environment
// still delivers somewhere visible rather than silently dropping enquiries.
const adminRecipients = () => {
  const configured =
    process.env.MAIL_ADMIN_TO ||
    process.env.MAIL_FROM_ADDRESS ||
    process.env.SMTP_USER ||
    "";

  return configured
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
};

// ── Contact form ────────────────────────────────────────────────────────────

/**
 * Notify the team about a new website enquiry. Reply-To is set to the
 * enquirer so hitting reply in the inbox answers the customer directly.
 * Fire-and-forget.
 *
 * @param {Object} contact persisted contacts row
 */
const sendContactNotification = async (contact) => {
  const to = adminRecipients();
  if (!to.length) {
    return { sent: false, skipped: true, reason: "MAIL_ADMIN_TO is not set" };
  }

  const { subject, html, text } = templates.contactNotification(contact);

  return mailer.sendMailSafe({
    to,
    subject,
    html,
    text,
    ...(contact.email && { replyTo: contact.email }),
  });
};

/**
 * Acknowledge the enquiry to the person who submitted it. Fire-and-forget.
 * @param {Object} contact persisted contacts row
 */
const sendContactAutoReply = async (contact) => {
  if (!contact || !contact.email) {
    return { sent: false, skipped: true, reason: "No enquirer email" };
  }

  const { subject, html, text } = templates.contactAutoReply(contact);

  return mailer.sendMailSafe({
    to: contact.email,
    subject,
    html,
    text,
    ...(process.env.MAIL_REPLY_TO && { replyTo: process.env.MAIL_REPLY_TO }),
  });
};

// ── Leads ───────────────────────────────────────────────────────────────────

/**
 * Notify the team about a new lead. Reply-To is set to the lead's own
 * address (when known) so hitting reply in the inbox answers them directly.
 * Fire-and-forget.
 *
 * @param {Object} lead persisted leads row
 * @param {Object} [meta]
 * @param {number} [meta.filesCount]
 */
const sendLeadNotification = async (lead, meta) => {
  const to = adminRecipients();
  if (!to.length) {
    return { sent: false, skipped: true, reason: "MAIL_ADMIN_TO is not set" };
  }

  const { subject, html, text } = templates.leadNotification(lead, meta);

  return mailer.sendMailSafe({
    to,
    subject,
    html,
    text,
    ...(lead.email && { replyTo: lead.email }),
  });
};

/**
 * Acknowledge the enquiry to the lead who submitted it. Fire-and-forget.
 * @param {Object} lead persisted leads row
 */
const sendLeadAutoReply = async (lead) => {
  if (!lead || !lead.email) {
    return { sent: false, skipped: true, reason: "No lead email" };
  }

  const { subject, html, text } = templates.leadAutoReply(lead);

  return mailer.sendMailSafe({
    to: lead.email,
    subject,
    html,
    text,
    ...(process.env.MAIL_REPLY_TO && { replyTo: process.env.MAIL_REPLY_TO }),
  });
};

// ── Newsletter ──────────────────────────────────────────────────────────────

/**
 * Welcome a new newsletter subscriber. Fire-and-forget.
 * @param {string} email
 */
const sendNewsletterWelcome = async (email) => {
  if (!email) {
    return { sent: false, skipped: true, reason: "No email" };
  }

  const { subject, html, text } = templates.newsletterWelcome(email);

  return mailer.sendMailSafe({
    to: email,
    subject,
    html,
    text,
    ...(process.env.MAIL_REPLY_TO && { replyTo: process.env.MAIL_REPLY_TO }),
  });
};

// ── Password reset ──────────────────────────────────────────────────────────

/**
 * Deliver a one-time reset code. AWAITED and allowed to throw, unlike the other
 * courtesy mail here: if this email does not arrive the user simply cannot
 * proceed, so a silent failure would strand them.
 *
 * @param {Object} params
 * @param {string} params.to
 * @param {string} params.otp
 * @param {number} params.expiresInMinutes
 * @param {string} [params.name]
 */
const sendPasswordResetOtp = async ({ to, otp, expiresInMinutes, name }) => {
  const { subject, html, text } = templates.passwordResetOtp({
    otp,
    expiresInMinutes,
    name,
  });

  return mailer.sendMail({
    to,
    subject,
    html,
    text,
    ...(process.env.MAIL_REPLY_TO && { replyTo: process.env.MAIL_REPLY_TO }),
  });
};

/**
 * Tell the account owner their password changed, so a takeover is not silent.
 * Fire-and-forget — the password is already updated.
 */
const sendPasswordChangedNotice = async ({ to, name }) => {
  const { subject, html, text } = templates.passwordChanged({ name });

  return mailer.sendMailSafe({
    to,
    subject,
    html,
    text,
    ...(process.env.MAIL_REPLY_TO && { replyTo: process.env.MAIL_REPLY_TO }),
  });
};

// ── Documents ───────────────────────────────────────────────────────────────

const loadDocumentRow = async (documentId) => {
  const rows = await query("SELECT * FROM documents WHERE id = ?", [documentId]);
  if (!rows.length) {
    throw new AppError("Document not found", 404);
  }
  return rows[0];
};

/**
 * Fetch the stored PDF for a finalized document as a Buffer, rendering and
 * storing it first if pdf_key is missing (finalize stores it best-effort, so
 * a document CAN legitimately arrive here without one).
 */
const loadDocumentPdfBuffer = async (doc) => {
  let key = doc.pdf_key;
  if (!key) {
    key = await documentPdfService.generateAndStorePdf(doc.id);
  }
  return storage.readBuffer(key);
};

/**
 * Email a finalized document to the party as a PDF attachment.
 *
 * Only FINALIZED documents can be emailed: a draft has no number and carries a
 * DRAFT watermark, and a cancelled one must not be presented as payable. This
 * throws on failure — the admin user is waiting for the outcome.
 *
 * @param {number|string} documentId
 * @param {Object}  [options]
 * @param {string|string[]} [options.to]      override recipient(s); defaults to party_email
 * @param {string|string[]} [options.cc]
 * @param {string}  [options.subject]         override the generated subject
 * @param {string}  [options.message]         optional note included in the body
 * @returns {Promise<{ sent: boolean, to: string[], subject: string, filename: string, messageId?: string }>}
 */
const sendDocumentEmail = async (documentId, options = {}) => {
  if (!mailer.isConfigured()) {
    throw new AppError(
      "Email is not configured on the server. Set the SMTP_* variables to enable sending.",
      503
    );
  }

  const doc = await loadDocumentRow(documentId);

  if (doc.status !== "finalized") {
    throw new AppError(
      doc.status === "cancelled"
        ? "A cancelled document cannot be emailed"
        : "Only a finalized document can be emailed. Finalize it first.",
      409
    );
  }

  const toList = (value) =>
    (Array.isArray(value) ? value : String(value || "").split(","))
      .map((address) => String(address).trim())
      .filter(Boolean);

  const recipients = options.to ? toList(options.to) : toList(doc.party_email);

  if (!recipients.length) {
    throw new AppError(
      "No recipient address. This party has no email on file — pass one explicitly or add it to the party.",
      422
    );
  }

  const ccList = options.cc ? toList(options.cc) : [];
  const title = documentPdfService.getDocConfig(doc.doc_type).title;
  const filename = documentPdfService.pdfFilename(doc);
  const pdfBuffer = await loadDocumentPdfBuffer(doc);

  const { subject, html, text } = templates.documentEmail({
    doc,
    title,
    message: options.message,
  });

  const finalSubject = options.subject
    ? String(options.subject).trim()
    : subject;

  // Replies go to the seller's own address, not the no-reply sender.
  const replyTo = doc.seller_email || process.env.MAIL_REPLY_TO;

  const result = await mailer.sendMail({
    to: recipients,
    ...(ccList.length && { cc: ccList }),
    subject: finalSubject,
    html,
    text,
    ...(replyTo && { replyTo }),
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  return {
    sent: !!result.sent,
    to: recipients,
    ...(ccList.length && { cc: ccList }),
    subject: finalSubject,
    filename,
    ...(result.messageId && { messageId: result.messageId }),
  };
};

module.exports = {
  sendContactNotification,
  sendContactAutoReply,
  sendLeadNotification,
  sendLeadAutoReply,
  sendNewsletterWelcome,
  sendPasswordResetOtp,
  sendPasswordChangedNotice,
  sendDocumentEmail,
};
