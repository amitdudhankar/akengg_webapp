const query = require("../utils/db");
const AppError = require("../utils/appError");
const emailService = require("./email.service");

const CONTACT_COLUMNS = [
  "id",
  "name",
  "number",
  "email",
  "message",
  "service",
  "source",
  "status",
  "created_at",
  "updated_at",
];

const sanitizeContactInput = (payload) => {
  const cleanPayload = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (typeof value !== "string") {
      cleanPayload[key] = value;
      return;
    }

    const normalizedValue = value.trim();

    if (key === "email" || key === "status") {
      cleanPayload[key] = normalizedValue.toLowerCase();
      return;
    }

    cleanPayload[key] = normalizedValue;
  });

  return cleanPayload;
};

const mapContact = (contact) => {
  if (!contact) {
    return null;
  }

  return CONTACT_COLUMNS.reduce((accumulator, column) => {
    accumulator[column] = contact[column] ?? null;
    return accumulator;
  }, {});
};

const getContacts = async ({ status } = {}) => {
  const filters = [];
  const values = [];

  if (status) {
    filters.push("status = ?");
    values.push(String(status).trim().toLowerCase());
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const rows = await query(
    `SELECT id, name, number, email, message, service, source, status, created_at, updated_at
     FROM contacts
     ${whereClause}
     ORDER BY id DESC`,
    values
  );

  return rows.map(mapContact);
};

const getContactById = async (id) => {
  const rows = await query(
    `SELECT id, name, number, email, message, service, source, status, created_at, updated_at
     FROM contacts
     WHERE id = ?`,
    [id]
  );

  if (!rows.length) {
    throw new AppError("Contact not found", 404);
  }

  return mapContact(rows[0]);
};

const createContact = async (payload) => {
  const cleanPayload = sanitizeContactInput(payload);

  const result = await query(
    `INSERT INTO contacts (name, number, email, message, service, source, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      cleanPayload.name,
      cleanPayload.number,
      cleanPayload.email,
      cleanPayload.message,
      cleanPayload.service || null,
      cleanPayload.source || null,
      "new",
    ]
  );

  const contact = await getContactById(result.insertId);

  // Fire-and-forget. The enquiry is already committed and the caller is about
  // to get a 201 — waiting on SMTP would add seconds to a public form submit,
  // and a mail outage must never turn a saved enquiry into an error. Both
  // helpers use sendMailSafe internally; .catch() guards everything else.
  emailService
    .sendContactNotification(contact)
    .catch((error) =>
      console.error("[contact] admin notification failed:", error.message)
    );
  emailService
    .sendContactAutoReply(contact)
    .catch((error) =>
      console.error("[contact] auto-reply failed:", error.message)
    );

  return contact;
};

const updateContact = async (id, payload) => {
  await getContactById(id);

  const cleanPayload = sanitizeContactInput(payload);
  const fields = [];
  const values = [];

  Object.entries(cleanPayload).forEach(([key, value]) => {
    fields.push(`${key} = ?`);
    values.push(value);
  });

  values.push(id);

  await query(
    `UPDATE contacts
     SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    values
  );

  return getContactById(id);
};

const deleteContact = async (id) => {
  await getContactById(id);
  await query("DELETE FROM contacts WHERE id = ?", [id]);
};

module.exports = {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
};
