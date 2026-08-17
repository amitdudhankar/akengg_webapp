-- ─────────────────────────────────────────────────────────────
-- AK Engineering — Document Builder migration (Phase 0 foundations).
-- Adds the 6 tables that power the Quotation / Proforma / Purchase
-- Order / Tax Invoice builders (full Indian GST). Run ONCE on the
-- existing akengg_db. Safe to re-run: every table uses IF NOT EXISTS
-- and the single-row seed uses INSERT IGNORE.
--
-- Money    DECIMAL(14,2)  · percent DECIMAL(5,2) · qty DECIMAL(12,3)
-- round_off DECIMAL(6,2). mysql2 returns DECIMAL as strings — the
-- engine coerces with Number() and guards outputs with round2().
-- One hard FK only: document_items.document_id → documents (CASCADE);
-- everything else is a soft ref + frozen snapshot.
-- ─────────────────────────────────────────────────────────────

USE akengg_db;

-- seller_profile (single row, id = 1) ------------------------------------
-- Our company: GSTIN/state, bank, branding, defaults, rounding mode.
CREATE TABLE IF NOT EXISTS seller_profile (
  id TINYINT PRIMARY KEY DEFAULT 1,
  legal_name VARCHAR(200) NULL,
  trade_name VARCHAR(200) NULL,
  gstin VARCHAR(15) NULL,
  pan VARCHAR(10) NULL,
  cin VARCHAR(21) NULL,
  address_line1 VARCHAR(255) NULL,
  address_line2 VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  state_code CHAR(2) NULL,
  pincode VARCHAR(10) NULL,
  country VARCHAR(100) NULL DEFAULT 'India',
  email VARCHAR(150) NULL,
  phone VARCHAR(20) NULL,
  bank_name VARCHAR(150) NULL,
  bank_account_name VARCHAR(150) NULL,
  bank_account_no VARCHAR(40) NULL,
  bank_ifsc VARCHAR(20) NULL,
  bank_branch VARCHAR(150) NULL,
  upi_id VARCHAR(100) NULL,
  logo_key VARCHAR(255) NULL,          -- storage key, e.g. "seller/172..-logo.png"
  signature_key VARCHAR(255) NULL,     -- storage key (kept; no longer printed)
  signatory_name VARCHAR(150) NULL,        -- printed in the signature block
  signatory_designation VARCHAR(150) NULL, -- optional line under the name
  default_terms LONGTEXT NULL,
  default_declaration LONGTEXT NULL,
  enable_rcm TINYINT(1) NOT NULL DEFAULT 0,
  rounding_mode VARCHAR(10) NOT NULL DEFAULT 'nearest',  -- nearest|up|down|none
  default_currency CHAR(3) NOT NULL DEFAULT 'INR',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO seller_profile (id) VALUES (1);

-- Self-heal for DBs created before finalized_at existed (MariaDB syntax).
ALTER TABLE documents ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP NULL;

-- Self-heal for DBs created before the signatory fields existed (MariaDB syntax).
ALTER TABLE seller_profile ADD COLUMN IF NOT EXISTS signatory_name VARCHAR(150) NULL;
ALTER TABLE seller_profile ADD COLUMN IF NOT EXISTS signatory_designation VARCHAR(150) NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS seller_signatory_name VARCHAR(150) NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS seller_signatory_designation VARCHAR(150) NULL;

-- parties (clients & vendors) --------------------------------------------
-- Reusable address book; documents snapshot the party at finalize.
CREATE TABLE IF NOT EXISTS parties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  party_type ENUM('client', 'vendor') NOT NULL DEFAULT 'client',
  name VARCHAR(200) NOT NULL,
  gstin VARCHAR(15) NULL,
  party_is_registered TINYINT(1) NOT NULL DEFAULT 0,
  pan VARCHAR(10) NULL,
  email VARCHAR(150) NULL,
  phone VARCHAR(20) NULL,
  -- billing address
  billing_address_line1 VARCHAR(255) NULL,
  billing_address_line2 VARCHAR(255) NULL,
  billing_city VARCHAR(100) NULL,
  billing_state VARCHAR(100) NULL,
  billing_state_code CHAR(2) NULL,
  billing_pincode VARCHAR(10) NULL,
  billing_country VARCHAR(100) NULL DEFAULT 'India',
  -- shipping address
  shipping_address_line1 VARCHAR(255) NULL,
  shipping_address_line2 VARCHAR(255) NULL,
  shipping_city VARCHAR(100) NULL,
  shipping_state VARCHAR(100) NULL,
  shipping_state_code CHAR(2) NULL,
  shipping_pincode VARCHAR(10) NULL,
  shipping_country VARCHAR(100) NULL DEFAULT 'India',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- item_catalog -----------------------------------------------------------
-- Reusable goods/services master; lines snapshot the item at save.
CREATE TABLE IF NOT EXISTS item_catalog (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kind ENUM('goods', 'service') NOT NULL DEFAULT 'goods',
  name VARCHAR(200) NOT NULL,
  description VARCHAR(1000) NULL,
  hsn_sac VARCHAR(8) NULL,
  uqc VARCHAR(10) NULL,                -- standard GST unit code, e.g. NOS/PCS/KGS
  default_rate DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  default_gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- numbering_sequences ----------------------------------------------------
-- Concurrency anchor for gap-free per-type/per-FY numbering. The service
-- locks the row with SELECT … FOR UPDATE inside withTransaction.
CREATE TABLE IF NOT EXISTS numbering_sequences (
  doc_type ENUM('quotation', 'proforma', 'purchase_order', 'tax_invoice') NOT NULL,
  financial_year VARCHAR(7) NOT NULL,  -- "2026-27"
  prefix VARCHAR(10) NOT NULL,         -- QTN | PI | PO | INV
  last_seq INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (doc_type, financial_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- documents (header) -----------------------------------------------------
-- One row per Quotation/Proforma/PO/Tax Invoice. doc_number is NULL until
-- finalize (gap-free, GST-compliant). Party + seller are SNAPSHOTTED here
-- at finalize so historical documents never change when masters edit.
CREATE TABLE IF NOT EXISTS documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  doc_type ENUM('quotation', 'proforma', 'purchase_order', 'tax_invoice') NOT NULL,
  status ENUM('draft', 'finalized', 'cancelled') NOT NULL DEFAULT 'draft',
  doc_number VARCHAR(40) NULL,         -- e.g. "INV/2026-27/0001"; NULL until finalize
  financial_year VARCHAR(7) NULL,      -- "2026-27"; set at finalize
  seq_no INT NULL,                     -- per type/FY sequence; set at finalize
  doc_date DATE NULL,
  due_date DATE NULL,
  reference_no VARCHAR(100) NULL,

  -- party snapshot (frozen at finalize) ----------------------------------
  party_id INT NULL,                   -- soft ref to parties.id
  party_type ENUM('client', 'vendor') NULL,
  party_name VARCHAR(200) NULL,
  party_gstin VARCHAR(15) NULL,
  party_pan VARCHAR(10) NULL,
  party_email VARCHAR(150) NULL,
  party_phone VARCHAR(20) NULL,
  party_is_registered TINYINT(1) NOT NULL DEFAULT 0,
  party_billing_address_line1 VARCHAR(255) NULL,
  party_billing_address_line2 VARCHAR(255) NULL,
  party_billing_city VARCHAR(100) NULL,
  party_billing_state VARCHAR(100) NULL,
  party_billing_state_code CHAR(2) NULL,
  party_billing_pincode VARCHAR(10) NULL,
  party_billing_country VARCHAR(100) NULL,
  party_shipping_address_line1 VARCHAR(255) NULL,
  party_shipping_address_line2 VARCHAR(255) NULL,
  party_shipping_city VARCHAR(100) NULL,
  party_shipping_state VARCHAR(100) NULL,
  party_shipping_state_code CHAR(2) NULL,
  party_shipping_pincode VARCHAR(10) NULL,
  party_shipping_country VARCHAR(100) NULL,

  -- seller snapshot (frozen at finalize) ---------------------------------
  seller_legal_name VARCHAR(200) NULL,
  seller_trade_name VARCHAR(200) NULL,
  seller_gstin VARCHAR(15) NULL,
  seller_pan VARCHAR(10) NULL,
  seller_cin VARCHAR(21) NULL,
  seller_address_line1 VARCHAR(255) NULL,
  seller_address_line2 VARCHAR(255) NULL,
  seller_city VARCHAR(100) NULL,
  seller_state VARCHAR(100) NULL,
  seller_state_code CHAR(2) NULL,
  seller_pincode VARCHAR(10) NULL,
  seller_country VARCHAR(100) NULL,
  seller_email VARCHAR(150) NULL,
  seller_phone VARCHAR(20) NULL,
  seller_bank_name VARCHAR(150) NULL,
  seller_bank_account_name VARCHAR(150) NULL,
  seller_bank_account_no VARCHAR(40) NULL,
  seller_bank_ifsc VARCHAR(20) NULL,
  seller_bank_branch VARCHAR(150) NULL,
  seller_upi_id VARCHAR(100) NULL,
  seller_logo_key VARCHAR(255) NULL,
  seller_signature_key VARCHAR(255) NULL,
  seller_signatory_name VARCHAR(150) NULL,
  seller_signatory_designation VARCHAR(150) NULL,

  -- GST routing ----------------------------------------------------------
  place_of_supply VARCHAR(100) NULL,
  place_of_supply_code CHAR(2) NULL,
  supply_type ENUM('intra', 'inter') NULL,
  tax_treatment ENUM('exclusive', 'inclusive', 'no_tax') NOT NULL DEFAULT 'exclusive',
  reverse_charge TINYINT(1) NOT NULL DEFAULT 0,

  -- totals (server-authoritative; round2-guarded) ------------------------
  total_taxable DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_discount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_cgst DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_sgst DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_igst DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_tax DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  round_off DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(14,2) NOT NULL DEFAULT 0.00,  -- EXCLUDES RCM tax when reverse_charge=1
  amount_in_words VARCHAR(500) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',

  -- free text ------------------------------------------------------------
  terms LONGTEXT NULL,
  declaration LONGTEXT NULL,
  notes LONGTEXT NULL,

  -- lifecycle / provenance ----------------------------------------------
  converted_from_id INT NULL,          -- soft ref to documents.id

  -- stored PDF -----------------------------------------------------------
  pdf_key VARCHAR(255) NULL,           -- storage key, e.g. "documents/tax_invoice/INV-..pdf"
  pdf_hash VARCHAR(64) NULL,           -- content hash for cache invalidation

  -- e-invoice scaffold (Phase 6; all NULL in v1) -------------------------
  irn VARCHAR(64) NULL,
  ack_no VARCHAR(64) NULL,
  ack_date DATETIME NULL,
  signed_qr_code LONGTEXT NULL,
  einvoice_status VARCHAR(20) NULL,

  finalized_at TIMESTAMP NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_doc_number (doc_number),
  UNIQUE KEY uq_type_fy_seq (doc_type, financial_year, seq_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- document_items (line snapshot) -----------------------------------------
-- Hard FK to documents (cascade delete). Each line freezes its own
-- name/hsn/qty/rate/discount + computed taxable & per-tax amounts so the
-- printed tax columns always match what the engine computed at save.
CREATE TABLE IF NOT EXISTS document_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  document_id INT NOT NULL,
  item_id INT NULL,                    -- soft ref to item_catalog.id
  line_no INT NOT NULL DEFAULT 0,
  kind ENUM('goods', 'service') NOT NULL DEFAULT 'goods',
  name VARCHAR(200) NOT NULL,
  description VARCHAR(1000) NULL,
  hsn_sac VARCHAR(8) NULL,
  qty DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  uqc VARCHAR(10) NULL,
  rate DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  discount_type ENUM('percent', 'amount') NOT NULL DEFAULT 'amount',
  discount_value DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  taxable_value DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  cgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  cgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  sgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  sgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  igst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  igst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_di_doc FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
