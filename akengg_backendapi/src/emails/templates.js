// src/emails/templates.js
// ─────────────────────────────────────────────────────────────────────────
// Email bodies. Each template is a pure function returning
// { subject, html, text } — no I/O, no env reads beyond branding, so they are
// trivially testable and the email.service stays about orchestration.
//
// HTML rules for email clients: tables for layout, inline styles only, no
// external CSS/JS, no web fonts. Everything interpolated from user or DB data
// goes through esc() — an enquiry message containing "<script>" or a stray
// "&" must never break (or inject into) the rendered email.
// ─────────────────────────────────────────────────────────────────────────

const BRAND = {
  accent: "#ea580c", // orange-600, matching the website accent
  ink: "#0f172a", // slate-900
  muted: "#64748b", // slate-500
  border: "#e2e8f0", // slate-200
  surface: "#f8fafc", // slate-50
};

const companyName = () => process.env.MAIL_COMPANY_NAME || "AK Engineering";
const siteUrl = () => process.env.PUBLIC_SITE_URL || "";

/** Escape a value for safe interpolation into HTML. */
const esc = (value) => {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

/** Escape + convert newlines to <br> for multi-line free text. */
const escMultiline = (value) => esc(value).replace(/\r?\n/g, "<br>");

/** ₹ 1,23,456.78 — Indian digit grouping. */
const formatMoney = (value, currency = "INR") => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "";
  }
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return currency === "INR" ? `₹ ${formatted}` : `${currency} ${formatted}`;
};

/** dd-mm-yyyy, matching the PDF renderer's date style. */
const formatDate = (value) => {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${date.getFullYear()}`;
};

/**
 * Shared shell: header bar, white card, footer. `bodyHtml` is inserted as-is,
 * so callers must have escaped anything dynamic before passing it in.
 */
const layout = ({ heading, bodyHtml, preheader }) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.surface};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${BRAND.ink};">
${
  preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>`
    : ""
}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.surface};padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background-color:${BRAND.ink};padding:20px 28px;">
            <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">${esc(companyName())}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;font-weight:700;color:${BRAND.ink};">${esc(heading)}</h1>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px;background-color:${BRAND.surface};border-top:1px solid ${BRAND.border};">
            <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.muted};">
              ${esc(companyName())}${siteUrl() ? ` &middot; <a href="${esc(siteUrl())}" style="color:${BRAND.accent};text-decoration:none;">${esc(siteUrl())}</a>` : ""}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

/** A label/value row used by the detail tables. */
const row = (label, value) =>
  value
    ? `<tr>
        <td style="padding:8px 12px;font-size:13px;color:${BRAND.muted};border-bottom:1px solid ${BRAND.border};white-space:nowrap;vertical-align:top;">${esc(label)}</td>
        <td style="padding:8px 12px;font-size:14px;color:${BRAND.ink};border-bottom:1px solid ${BRAND.border};">${value}</td>
      </tr>`
    : "";

const detailTable = (rowsHtml) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:8px;border-collapse:separate;overflow:hidden;margin:0 0 20px;">${rowsHtml}</table>`;

const paragraph = (html) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${BRAND.ink};">${html}</p>`;

// ── Templates ──────────────────────────────────────────────────────────────

/**
 * Internal alert for a new website enquiry.
 * @param {Object} contact contacts row (already persisted)
 */
const contactNotification = (contact) => {
  const subject = `New enquiry from ${contact.name || "website visitor"}${
    contact.service ? ` — ${contact.service}` : ""
  }`;

  const bodyHtml =
    paragraph("A new enquiry was submitted through the website.") +
    detailTable(
      [
        row("Name", esc(contact.name)),
        row(
          "Email",
          contact.email
            ? `<a href="mailto:${esc(contact.email)}" style="color:${BRAND.accent};text-decoration:none;">${esc(contact.email)}</a>`
            : ""
        ),
        row(
          "Phone",
          contact.number
            ? `<a href="tel:${esc(contact.number)}" style="color:${BRAND.accent};text-decoration:none;">${esc(contact.number)}</a>`
            : ""
        ),
        row("Service", esc(contact.service)),
        row("Source", esc(contact.source)),
        row("Received", formatDate(contact.created_at) || formatDate(new Date())),
      ].join("")
    ) +
    `<div style="margin:0 0 8px;font-size:13px;font-weight:600;color:${BRAND.muted};text-transform:uppercase;letter-spacing:0.5px;">Message</div>` +
    `<div style="padding:14px 16px;background-color:${BRAND.surface};border-left:3px solid ${BRAND.accent};border-radius:4px;font-size:15px;line-height:1.65;color:${BRAND.ink};">${escMultiline(contact.message)}</div>`;

  const text = [
    "New enquiry from the website",
    "",
    `Name:    ${contact.name || "-"}`,
    `Email:   ${contact.email || "-"}`,
    `Phone:   ${contact.number || "-"}`,
    `Service: ${contact.service || "-"}`,
    `Source:  ${contact.source || "-"}`,
    "",
    "Message:",
    contact.message || "-",
  ].join("\n");

  return {
    subject,
    html: layout({
      heading: "New website enquiry",
      preheader: `${contact.name || "Someone"} sent an enquiry`,
      bodyHtml,
    }),
    text,
  };
};

/**
 * Acknowledgement sent back to whoever submitted the contact form.
 * @param {Object} contact contacts row
 */
const contactAutoReply = (contact) => {
  const firstName = String(contact.name || "").trim().split(/\s+/)[0];

  const bodyHtml =
    paragraph(
      `Hi ${esc(firstName || "there")},`
    ) +
    paragraph(
      `Thank you for reaching out to ${esc(companyName())}. We have received your enquiry and a member of our team will get back to you shortly.`
    ) +
    `<div style="margin:0 0 8px;font-size:13px;font-weight:600;color:${BRAND.muted};text-transform:uppercase;letter-spacing:0.5px;">Your message</div>` +
    `<div style="padding:14px 16px;background-color:${BRAND.surface};border-left:3px solid ${BRAND.accent};border-radius:4px;font-size:15px;line-height:1.65;color:${BRAND.ink};margin:0 0 20px;">${escMultiline(contact.message)}</div>` +
    paragraph(
      "This is an automated confirmation — there is no need to reply to it."
    );

  const text = [
    `Hi ${firstName || "there"},`,
    "",
    `Thank you for reaching out to ${companyName()}. We have received your enquiry and a member of our team will get back to you shortly.`,
    "",
    "Your message:",
    contact.message || "-",
    "",
    "This is an automated confirmation — there is no need to reply to it.",
  ].join("\n");

  return {
    subject: `We've received your enquiry — ${companyName()}`,
    html: layout({
      heading: "Thanks for getting in touch",
      preheader: "We have received your enquiry and will respond shortly.",
      bodyHtml,
    }),
    text,
  };
};

/**
 * Welcome email for a new newsletter subscriber.
 * @param {string} email
 */
const newsletterWelcome = (email) => {
  const bodyHtml =
    paragraph(
      `Thanks for subscribing to the ${esc(companyName())} newsletter.`
    ) +
    paragraph(
      "You'll now receive our occasional updates on new projects, capabilities and industry insights — no spam, and you can unsubscribe at any time."
    ) +
    (siteUrl()
      ? `<p style="margin:24px 0 0;"><a href="${esc(siteUrl())}" style="display:inline-block;padding:12px 22px;background-color:${BRAND.accent};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">Visit our website</a></p>`
      : "");

  const text = [
    `Thanks for subscribing to the ${companyName()} newsletter.`,
    "",
    "You'll now receive our occasional updates on new projects, capabilities and industry insights — no spam, and you can unsubscribe at any time.",
    ...(siteUrl() ? ["", siteUrl()] : []),
  ].join("\n");

  return {
    subject: `You're subscribed — ${companyName()}`,
    html: layout({
      heading: "Welcome aboard",
      preheader: `You're subscribed to the ${companyName()} newsletter.`,
      bodyHtml,
    }),
    text,
  };
};

/**
 * Covering email for a finalized document sent to the party. The PDF itself
 * travels as an attachment (see email.service.sendDocumentEmail).
 *
 * @param {Object} params
 * @param {Object} params.doc      documents row
 * @param {string} params.title    human label, e.g. "Tax Invoice"
 * @param {string} [params.message] optional note typed by the admin user
 */
const documentEmail = ({ doc, title, message }) => {
  const subject = `${title} ${doc.doc_number || ""} from ${companyName()}`.replace(
    /\s+/g,
    " "
  ).trim();

  const bodyHtml =
    paragraph(`Dear ${esc(doc.party_name || "Customer")},`) +
    paragraph(
      `Please find attached ${esc(title.toLowerCase())} <strong>${esc(doc.doc_number || "")}</strong> from ${esc(companyName())}.`
    ) +
    detailTable(
      [
        row("Document", esc(`${title} ${doc.doc_number || ""}`.trim())),
        row("Date", esc(formatDate(doc.doc_date))),
        row("Due date", esc(formatDate(doc.due_date))),
        row("Reference", esc(doc.reference_no)),
        row(
          "Amount",
          `<strong>${esc(formatMoney(doc.grand_total, doc.currency || "INR"))}</strong>`
        ),
      ].join("")
    ) +
    (message
      ? `<div style="padding:14px 16px;background-color:${BRAND.surface};border-left:3px solid ${BRAND.accent};border-radius:4px;font-size:15px;line-height:1.65;color:${BRAND.ink};margin:0 0 20px;">${escMultiline(message)}</div>`
      : "") +
    paragraph(
      "If you have any questions about this document, simply reply to this email."
    );

  const text = [
    `Dear ${doc.party_name || "Customer"},`,
    "",
    `Please find attached ${title.toLowerCase()} ${doc.doc_number || ""} from ${companyName()}.`,
    "",
    `Date:      ${formatDate(doc.doc_date) || "-"}`,
    `Due date:  ${formatDate(doc.due_date) || "-"}`,
    `Reference: ${doc.reference_no || "-"}`,
    `Amount:    ${formatMoney(doc.grand_total, doc.currency || "INR")}`,
    ...(message ? ["", message] : []),
    "",
    "If you have any questions about this document, simply reply to this email.",
  ].join("\n");

  return {
    subject,
    html: layout({
      heading: `${title} ${doc.doc_number || ""}`.trim(),
      preheader: `${title} ${doc.doc_number || ""} — ${formatMoney(doc.grand_total, doc.currency || "INR")}`,
      bodyHtml,
    }),
    text,
  };
};

/**
 * One-time code for the admin-panel password reset.
 *
 * @param {Object} params
 * @param {string} params.otp             the 6-digit code (plain, for the email only)
 * @param {number} params.expiresInMinutes
 * @param {string} [params.name]          recipient's name, if known
 */
const passwordResetOtp = ({ otp, expiresInMinutes, name }) => {
  const firstName = String(name || "").trim().split(/\s+/)[0];

  const bodyHtml =
    paragraph(`Hi ${esc(firstName || "there")},`) +
    paragraph(
      `Use the code below to reset your ${esc(companyName())} admin password.`
    ) +
    `<div style="margin:0 0 20px;padding:18px;background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:8px;text-align:center;">
       <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:${BRAND.ink};font-family:'Courier New',Courier,monospace;">${esc(otp)}</div>
       <div style="margin-top:8px;font-size:13px;color:${BRAND.muted};">This code expires in ${esc(expiresInMinutes)} minutes.</div>
     </div>` +
    paragraph(
      "If you did not request a password reset, you can safely ignore this email — your password will not change. Do not share this code with anyone."
    );

  const text = [
    `Hi ${firstName || "there"},`,
    "",
    `Use this code to reset your ${companyName()} admin password:`,
    "",
    `    ${otp}`,
    "",
    `The code expires in ${expiresInMinutes} minutes.`,
    "",
    "If you did not request a password reset, you can safely ignore this email — your password will not change. Do not share this code with anyone.",
  ].join("\n");

  return {
    subject: `Your password reset code: ${otp}`,
    html: layout({
      heading: "Reset your password",
      preheader: `Your code is ${otp} — expires in ${expiresInMinutes} minutes.`,
      bodyHtml,
    }),
    text,
  };
};

/**
 * Sent after a password is actually changed, so an account takeover cannot
 * happen silently.
 * @param {Object} params
 * @param {string} [params.name]
 */
const passwordChanged = ({ name } = {}) => {
  const firstName = String(name || "").trim().split(/\s+/)[0];

  const bodyHtml =
    paragraph(`Hi ${esc(firstName || "there")},`) +
    paragraph(
      `The password for your ${esc(companyName())} admin account was just changed.`
    ) +
    paragraph(
      "If this was you, nothing further is needed. <strong>If it was not, contact your administrator immediately</strong> — someone else may have access to your account."
    );

  const text = [
    `Hi ${firstName || "there"},`,
    "",
    `The password for your ${companyName()} admin account was just changed.`,
    "",
    "If this was you, nothing further is needed. If it was not, contact your administrator immediately — someone else may have access to your account.",
  ].join("\n");

  return {
    subject: `Your ${companyName()} password was changed`,
    html: layout({
      heading: "Your password was changed",
      preheader: "If this wasn't you, contact your administrator immediately.",
      bodyHtml,
    }),
    text,
  };
};

module.exports = {
  contactNotification,
  contactAutoReply,
  newsletterWelcome,
  documentEmail,
  passwordResetOtp,
  passwordChanged,
  // exported for tests
  esc,
  formatMoney,
};
