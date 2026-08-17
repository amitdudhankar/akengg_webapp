-- ─────────────────────────────────────────────────────────────
-- AK Engineering API — full canonical schema (fresh install).
-- Creates the database + ALL tables. Safe to re-run (IF NOT EXISTS).
-- For an EXISTING database, run cms_schema.sql instead (it only adds
-- the new CMS tables + extends contacts, without touching your data).
-- ─────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS akengg_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE akengg_db;

-- users ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- blogs ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blogs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  descrip VARCHAR(500) NOT NULL,
  content LONGTEXT NOT NULL,
  image VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- contacts ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  number VARCHAR(20) NOT NULL,
  email VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  service VARCHAR(120) NULL,
  source VARCHAR(50) NULL,
  status ENUM('new', 'contacted', 'closed') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- services ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(500) NOT NULL,
  details LONGTEXT NULL,
  image VARCHAR(255) NULL,
  features LONGTEXT NULL,
  icon VARCHAR(100) NULL,
  gradient VARCHAR(120) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- projects ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  industry VARCHAR(120) NOT NULL,
  description VARCHAR(1000) NOT NULL,
  features LONGTEXT NULL,
  image VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- industry_stats ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS industry_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  count INT NOT NULL DEFAULT 0,
  color VARCHAR(40) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- testimonials -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_name VARCHAR(120) NOT NULL,
  company VARCHAR(150) NULL,
  content VARCHAR(2000) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- team_members -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  title VARCHAR(150) NULL,
  subtitle VARCHAR(150) NULL,
  description VARCHAR(1000) NULL,
  image VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- newsletter_subscribers -------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(150) NOT NULL UNIQUE,
  status ENUM('subscribed', 'unsubscribed') NOT NULL DEFAULT 'subscribed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- site_settings (single row, id = 1) -------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  company_phone VARCHAR(40) NULL,
  company_email VARCHAR(150) NULL,
  company_address VARCHAR(500) NULL,
  business_hours VARCHAR(255) NULL,
  social_linkedin VARCHAR(255) NULL,
  social_facebook VARCHAR(255) NULL,
  social_instagram VARCHAR(255) NULL,
  hero_headline VARCHAR(255) NULL,
  hero_subtext VARCHAR(500) NULL,
  about_text LONGTEXT NULL,
  founding_year VARCHAR(10) NULL,
  map_embed_url TEXT NULL,
  stat_years VARCHAR(40) NULL,
  stat_projects VARCHAR(40) NULL,
  stat_clients VARCHAR(40) NULL,
  stat_support VARCHAR(40) NULL,
  footer_description VARCHAR(500) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO site_settings (id) VALUES (1);
