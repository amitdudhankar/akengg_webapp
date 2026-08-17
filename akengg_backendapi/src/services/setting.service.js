const query = require("../utils/db");

// Editable site-settings fields (single row, id = 1).
const ALLOWED_FIELDS = [
  "company_phone",
  "company_email",
  "company_address",
  "business_hours",
  "social_linkedin",
  "social_facebook",
  "social_instagram",
  "hero_headline",
  "hero_subtext",
  "about_text",
  "founding_year",
  "map_embed_url",
  "stat_years",
  "stat_projects",
  "stat_clients",
  "stat_support",
  "footer_description",
];

const SELECT_COLUMNS = ["id", ...ALLOWED_FIELDS, "updated_at"].join(", ");

const ensureRow = async () => {
  await query("INSERT IGNORE INTO site_settings (id) VALUES (1)");
};

const getSettings = async () => {
  let rows = await query(`SELECT ${SELECT_COLUMNS} FROM site_settings WHERE id = 1`);

  if (!rows.length) {
    await ensureRow();
    rows = await query(`SELECT ${SELECT_COLUMNS} FROM site_settings WHERE id = 1`);
  }

  return rows[0] || null;
};

const updateSettings = async (payload) => {
  const fields = [];
  const values = [];

  ALLOWED_FIELDS.forEach((field) => {
    if (payload[field] === undefined) {
      return;
    }
    const value = payload[field];
    fields.push(`${field} = ?`);
    values.push(typeof value === "string" ? value.trim() : value);
  });

  if (!fields.length) {
    return getSettings();
  }

  await ensureRow();
  await query(
    `UPDATE site_settings SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
    values
  );

  return getSettings();
};

module.exports = {
  getSettings,
  updateSettings,
};
