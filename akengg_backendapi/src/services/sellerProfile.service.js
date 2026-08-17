const query = require("../utils/db");
const { assetUrl, deleteAsset } = require("../utils/storage");

// Editable seller-profile fields (single row, id = 1).
const ALLOWED_FIELDS = [
  "legal_name",
  "trade_name",
  "gstin",
  "pan",
  "cin",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "state_code",
  "pincode",
  "country",
  "email",
  "phone",
  "bank_name",
  "bank_account_name",
  "bank_account_no",
  "bank_ifsc",
  "bank_branch",
  "upi_id",
  "logo_key",
  "signature_key",
  "signatory_name",
  "signatory_designation",
  "default_terms",
  "default_declaration",
  "enable_rcm",
  "rounding_mode",
  "default_currency",
];

const SELECT_COLUMNS = ["id", ...ALLOWED_FIELDS, "updated_at"].join(", ");

const ensureRow = async () => {
  await query("INSERT IGNORE INTO seller_profile (id) VALUES (1)");
};

// Keep the raw *_key columns and expose resolved public URLs alongside them.
const mapRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    ...row,
    logo: assetUrl(row.logo_key),
    signature: assetUrl(row.signature_key),
  };
};

const getProfileRow = async () => {
  let rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM seller_profile WHERE id = 1`
  );

  if (!rows.length) {
    await ensureRow();
    rows = await query(
      `SELECT ${SELECT_COLUMNS} FROM seller_profile WHERE id = 1`
    );
  }

  return rows[0] || null;
};

const getSellerProfile = async () => {
  return mapRow(await getProfileRow());
};

const updateSellerProfile = async (payload) => {
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
    return getSellerProfile();
  }

  await ensureRow();
  await query(
    `UPDATE seller_profile SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
    values
  );

  return getSellerProfile();
};

// Set an asset key column (logo_key / signature_key), removing the old asset.
const setAssetKey = async (column, key) => {
  const current = await getProfileRow();
  const oldKey = current ? current[column] : null;

  await ensureRow();
  await query(
    `UPDATE seller_profile SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
    [key]
  );

  if (oldKey && oldKey !== key) {
    await deleteAsset(oldKey);
  }

  return getSellerProfile();
};

const updateLogo = async (key) => setAssetKey("logo_key", key);

const updateSignature = async (key) => setAssetKey("signature_key", key);

module.exports = {
  getSellerProfile,
  updateSellerProfile,
  updateLogo,
  updateSignature,
};
