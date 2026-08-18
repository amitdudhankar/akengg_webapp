-- src/sql/password_resets.sql
-- ---------------------------------------------------------------------------
-- Backs the admin-panel "forgot password" flow (send-otp -> verify-otp ->
-- reset-password).
--
-- The OTP is stored as a BCRYPT HASH, never in plain text: a 6-digit code has
-- only a million possibilities, so a leaked table of raw (or fast-hashed) codes
-- would be trivially reversible within the code's lifetime.
--
-- `attempts` caps brute force at the row level (the IP rate limiter alone is
-- not enough — an attacker can rotate IPs but not the row). `verified_at` marks
-- a successfully verified OTP, and `consumed_at` is set once the password has
-- actually been changed, so a single OTP can never reset a password twice.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS password_resets (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT          NOT NULL,
  otp_hash     VARCHAR(255) NOT NULL,
  expires_at   DATETIME     NOT NULL,
  attempts     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  verified_at  DATETIME     NULL,
  consumed_at  DATETIME     NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_password_resets_active (user_id, consumed_at, expires_at),

  CONSTRAINT fk_password_resets_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
