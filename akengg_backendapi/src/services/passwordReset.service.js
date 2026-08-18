// src/services/passwordReset.service.js
// ─────────────────────────────────────────────────────────────────────────
// Forgot-password flow for the admin panel, in three steps:
//
//   requestOtp(email)            -> emails a 6-digit code, always reports success
//   verifyOtp(email, otp)        -> { resetToken }  (short-lived, single purpose)
//   resetPassword(token, pass)   -> changes the password, consumes the OTP
//
// Security decisions worth knowing about:
//
//  * No account enumeration. requestOtp resolves the same way whether or not
//    the address belongs to a user, so the endpoint cannot be used to discover
//    who has an account.
//
//  * The OTP is bcrypt-hashed at rest. Six digits is only a million options —
//    a plain or fast-hashed column would be reversible instantly if the DB
//    leaked.
//
//  * Step 3 requires a token minted by step 2. Without it, knowing an email
//    address alone would be enough to set a new password — which is exactly
//    what the admin panel's original contract implied, and why it is not
//    implemented that way here.
//
//  * The reset token is deliberately NOT a session token: it carries `sub` and
//    `purpose`, never `id`/`role`, so auth.js's authorizeRoles /
//    authorizeSelfOrRoles can never accept it as a login.
//
//  * Per-row attempt cap. The IP rate limiter is bypassable by rotating IPs;
//    `attempts` is not.
// ─────────────────────────────────────────────────────────────────────────
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const query = require("../utils/db");
const AppError = require("../utils/appError");
const mailer = require("../utils/mailer");
const emailService = require("./email.service");

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESET_TOKEN_TTL = "15m";
const RESET_TOKEN_PURPOSE = "password_reset";

// Same rule the user endpoints enforce, so a reset cannot install a password
// that createUser/updateUser would have rejected.
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

/** Cryptographically random 6-digit code (not Math.random). */
const generateOtp = () => {
  const max = 10 ** OTP_LENGTH;
  // Rejection-free: crypto.randomInt is uniform over [0, max).
  return String(crypto.randomInt(0, max)).padStart(OTP_LENGTH, "0");
};

const findUserByEmail = async (email) => {
  const rows = await query(
    "SELECT id, name, email FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
};

/** The newest reset row for a user that is still usable. */
const findActiveReset = async (userId) => {
  const rows = await query(
    `SELECT id, user_id, otp_hash, expires_at, attempts, verified_at, consumed_at
     FROM password_resets
     WHERE user_id = ? AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY id DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

/**
 * Step 1 — email a one-time code.
 *
 * Always resolves successfully (so the response cannot reveal whether the
 * address exists). The only failure surfaced is a server-side misconfiguration,
 * which is independent of the address supplied and therefore leaks nothing.
 *
 * @param {string} rawEmail
 * @returns {Promise<{ expiresInMinutes: number }>}
 */
const requestOtp = async (rawEmail) => {
  if (!mailer.isConfigured()) {
    throw new AppError(
      "Email is not configured on the server, so a reset code cannot be sent.",
      503
    );
  }

  const email = normalizeEmail(rawEmail);
  const user = await findUserByEmail(email);

  // Unknown address: return the same shape without sending anything.
  if (!user) {
    return { expiresInMinutes: OTP_TTL_MINUTES };
  }

  // Retire any outstanding codes so only the newest one can be used.
  await query(
    `UPDATE password_resets
     SET consumed_at = NOW()
     WHERE user_id = ? AND consumed_at IS NULL`,
    [user.id]
  );

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);

  await query(
    `INSERT INTO password_resets (user_id, otp_hash, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [user.id, otpHash, OTP_TTL_MINUTES]
  );

  await emailService.sendPasswordResetOtp({
    to: user.email,
    otp,
    expiresInMinutes: OTP_TTL_MINUTES,
    name: user.name,
  });

  return { expiresInMinutes: OTP_TTL_MINUTES };
};

/**
 * Step 2 — check the code and mint a token that authorises exactly one
 * password change.
 *
 * @param {string} rawEmail
 * @param {string} otp
 * @returns {Promise<{ resetToken: string, expiresIn: string }>}
 */
const verifyOtp = async (rawEmail, otp) => {
  const email = normalizeEmail(rawEmail);
  const user = await findUserByEmail(email);

  // Deliberately identical error for "no such user", "no active code" and
  // "wrong code" — the three are indistinguishable to a caller.
  const invalid = () =>
    new AppError("The code is invalid or has expired. Request a new one.", 400);

  if (!user) {
    throw invalid();
  }

  const reset = await findActiveReset(user.id);
  if (!reset) {
    throw invalid();
  }

  if (reset.attempts >= MAX_ATTEMPTS) {
    throw new AppError(
      "Too many incorrect attempts. Request a new code.",
      429
    );
  }

  // Count the attempt BEFORE comparing, so a crash mid-verify cannot be used
  // to get free guesses.
  await query(
    "UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?",
    [reset.id]
  );

  const matches = await bcrypt.compare(String(otp), reset.otp_hash);
  if (!matches) {
    throw invalid();
  }

  await query(
    "UPDATE password_resets SET verified_at = NOW() WHERE id = ?",
    [reset.id]
  );

  // `sub`/`prid`/`purpose` only — no `id`, no `role`, so this token is useless
  // against the authenticated routes (see auth.js).
  const resetToken = jwt.sign(
    { sub: user.id, prid: reset.id, purpose: RESET_TOKEN_PURPOSE },
    process.env.SECRET_JWT_KEY,
    { expiresIn: RESET_TOKEN_TTL }
  );

  return { resetToken, expiresIn: RESET_TOKEN_TTL };
};

/**
 * Step 3 — set the new password. Requires the token from step 2.
 *
 * @param {string} token
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
const resetPassword = async (token, newPassword) => {
  if (!token) {
    throw new AppError(
      "A verified reset token is required. Start the reset again.",
      401
    );
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.SECRET_JWT_KEY);
  } catch (error) {
    throw new AppError(
      "Your reset session has expired. Start the reset again.",
      401
    );
  }

  // A login token must not be accepted here.
  if (payload.purpose !== RESET_TOKEN_PURPOSE || !payload.sub || !payload.prid) {
    throw new AppError("Invalid reset token.", 401);
  }

  if (typeof newPassword !== "string" || !STRONG_PASSWORD.test(newPassword)) {
    throw new AppError(
      "Password must be 8 to 64 characters and include uppercase, lowercase, and a number",
      400
    );
  }

  const rows = await query(
    `SELECT id, user_id, verified_at, consumed_at, expires_at
     FROM password_resets
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [payload.prid, payload.sub]
  );
  const reset = rows[0];

  if (!reset || !reset.verified_at) {
    throw new AppError("Invalid reset token.", 401);
  }
  if (reset.consumed_at) {
    throw new AppError(
      "This reset code has already been used. Start the reset again.",
      409
    );
  }
  if (new Date(reset.expires_at).getTime() <= Date.now()) {
    throw new AppError(
      "Your reset code has expired. Start the reset again.",
      401
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Consume the row conditionally: 0 rows affected means another request got
  // here first, so the password change must not proceed twice.
  const consumed = await query(
    "UPDATE password_resets SET consumed_at = NOW() WHERE id = ? AND consumed_at IS NULL",
    [reset.id]
  );
  if (!consumed.affectedRows) {
    throw new AppError(
      "This reset code has already been used. Start the reset again.",
      409
    );
  }

  await query(
    "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [hashedPassword, reset.user_id]
  );

  // Courtesy alert so an unauthorised reset cannot happen silently.
  const userRows = await query(
    "SELECT name, email FROM users WHERE id = ? LIMIT 1",
    [reset.user_id]
  );
  if (userRows.length) {
    emailService
      .sendPasswordChangedNotice({
        to: userRows[0].email,
        name: userRows[0].name,
      })
      .catch((error) =>
        console.error("[passwordReset] change notice failed:", error.message)
      );
  }
};

module.exports = {
  requestOtp,
  verifyOtp,
  resetPassword,
  OTP_TTL_MINUTES,
  MAX_ATTEMPTS,
};
