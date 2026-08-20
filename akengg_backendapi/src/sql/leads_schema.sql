-- ─────────────────────────────────────────────────────────────
-- AK Engineering — Leads / CRM migration (run ONCE on the existing
-- akengg_db). Adds lead capture, pipeline tracking, notes, follow-ups
-- and file attachments. Safe to re-run: every table uses IF NOT EXISTS.
--
-- Lead numbers look like "AK-2026-0001" (prefix-calendarYear-seq).
-- lead_sequences deliberately does NOT reuse numbering_sequences:
-- that table's PK is (doc_type ENUM, financial_year) where doc_type
-- is a closed set of document types and the year is a financial year
-- ("2026-27"); leads use an open-ended prefix (VARCHAR) and a plain
-- CHAR(4) calendar year, so they get their own gap-free counter here.
-- ─────────────────────────────────────────────────────────────

USE akengg_db;

-- lead_sequences ----------------------------------------------------------
-- Concurrency anchor for gap-free per-prefix/per-calendar-year lead
-- numbering. The service locks the row with SELECT … FOR UPDATE inside
-- withTransaction (same shape as numbering_sequences).
CREATE TABLE IF NOT EXISTS lead_sequences (
  prefix VARCHAR(10) NOT NULL,
  year_label CHAR(4) NOT NULL,
  last_seq INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (prefix, year_label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- leads ---------------------------------------------------------------------
-- One row per inbound lead. lead_number is assigned via lead_sequences
-- at creation (e.g. "AK-2026-0001"). Optionally links to a party once
-- converted, and to the originating contact-form submission.
CREATE TABLE IF NOT EXISTS leads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lead_number VARCHAR(20) NOT NULL,
  contact_person VARCHAR(100) NOT NULL,
  company_name VARCHAR(200) NULL,
  designation VARCHAR(100) NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150) NULL,
  industry ENUM('Pharmaceutical','Chemical','Food & Beverage','Textile','Dairy','Packaging','Automotive','Engineering','Manufacturing','Paper','Sugar','Distillery','Hospital','Hospitality','Power','Cement','Other') NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  plant_location VARCHAR(200) NULL,
  product ENUM('IBR Steam Boiler','Non-IBR Steam Boiler','Industrial Steam Boiler','Thermic Fluid Heater','Hot Water Generator','Industrial Piping','IBR Piping','Non-IBR Piping','Industrial Fabrication','SS Fabrication','MS Fabrication','Industrial Chimney','Ducting','Industrial Tanks','Pollution Control Equipment','Water Treatment Plant','Installation / Commissioning','Maintenance / Service','Other') NULL,
  requirement TEXT NULL,
  technical_details JSON NULL,
  source VARCHAR(100) NULL,
  medium VARCHAR(100) NULL,
  campaign VARCHAR(150) NULL,
  utm_term VARCHAR(150) NULL,
  utm_content VARCHAR(150) NULL,
  landing_page VARCHAR(500) NULL,
  referrer VARCHAR(500) NULL,
  status ENUM('NEW','CONTACTED','QUALIFIED','SITE_VISIT','TECHNICAL_DISCUSSION','QUOTATION','NEGOTIATION','WON','LOST','ON_HOLD') NOT NULL DEFAULT 'NEW',
  priority ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  assigned_to INT NULL,
  next_followup_date DATE NULL,
  estimated_value DECIMAL(14,2) NULL,
  quotation_value DECIMAL(14,2) NULL,
  lost_reason ENUM('Price','Competitor','Project Cancelled','Project Delayed','No Response','Technical Mismatch','Location','Timeline','Other') NULL,
  lost_note VARCHAR(1000) NULL,
  party_id INT NULL,
  converted_from_contact_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lead_number (lead_number),
  UNIQUE KEY uq_converted_contact (converted_from_contact_id),
  KEY idx_leads_status (status),
  KEY idx_leads_priority (priority),
  KEY idx_leads_product (product),
  KEY idx_leads_industry (industry),
  KEY idx_leads_source (source),
  KEY idx_leads_assigned_to (assigned_to),
  KEY idx_leads_next_followup (next_followup_date),
  KEY idx_leads_created_at (created_at),
  KEY idx_leads_phone (phone),
  KEY idx_leads_email (email),
  KEY idx_leads_party (party_id),
  CONSTRAINT fk_leads_user FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_leads_party FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
  CONSTRAINT fk_leads_contact FOREIGN KEY (converted_from_contact_id) REFERENCES contacts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- lead_status_history ------------------------------------------------------
-- Audit trail of every status transition on a lead.
CREATE TABLE IF NOT EXISTS lead_status_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lead_id INT NOT NULL,
  old_status VARCHAR(30) NULL,
  new_status VARCHAR(30) NOT NULL,
  changed_by INT NULL,
  notes VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_lsh_lead (lead_id),
  KEY idx_lsh_new_status (new_status),
  CONSTRAINT fk_lsh_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_lsh_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- lead_notes ----------------------------------------------------------------
-- Free-text notes/timeline entries logged against a lead.
CREATE TABLE IF NOT EXISTS lead_notes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lead_id INT NOT NULL,
  note TEXT NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ln_lead (lead_id),
  CONSTRAINT fk_ln_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_ln_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- lead_followups --------------------------------------------------------------
-- Scheduled/completed follow-up actions (calls, site visits, etc.) on a lead.
CREATE TABLE IF NOT EXISTS lead_followups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lead_id INT NOT NULL,
  followup_date DATE NOT NULL,
  followup_time TIME NULL,
  type ENUM('CALL','WHATSAPP','EMAIL','SITE_VISIT','MEETING','OTHER') NOT NULL DEFAULT 'CALL',
  notes VARCHAR(1000) NULL,
  status ENUM('PENDING','COMPLETED','MISSED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  created_by INT NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_lf_lead (lead_id),
  KEY idx_lf_status_date (status, followup_date),
  KEY idx_lf_date (followup_date),
  CONSTRAINT fk_lf_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_lf_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- lead_files ------------------------------------------------------------------
-- Attachments (drawings, RFQs, site photos, …) uploaded against a lead.
-- storage_key points at S3; original_name/mime_type/size_bytes are metadata.
CREATE TABLE IF NOT EXISTS lead_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lead_id INT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT NOT NULL DEFAULT 0,
  uploaded_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_lfile_lead (lead_id),
  CONSTRAINT fk_lfile_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_lfile_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- site_settings: WhatsApp click-to-chat number for the lead capture form --
-- Self-heal for DBs created before this column existed (MariaDB syntax).
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(40) NULL AFTER company_phone;
