-- Chaml Database Schema (PostgreSQL)

-- Enable uuid-ossp extension if UUID generation is needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: site_config (Single-row configuration storage)
CREATE TABLE IF NOT EXISTS site_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  app_name VARCHAR(100) DEFAULT 'Chaml',
  app_logo VARCHAR(100) DEFAULT '🕌',
  smic_value NUMERIC DEFAULT 1823,
  surface_zone_a NUMERIC DEFAULT 22,
  surface_zone_b NUMERIC DEFAULT 24,
  surface_zone_c NUMERIC DEFAULT 28,
  smtp_host VARCHAR(100) DEFAULT 'smtp.mailgun.org',
  smtp_port INT DEFAULT 587,
  smtp_user VARCHAR(100) DEFAULT 'postmaster@chaml.ma',
  smtp_password VARCHAR(255) DEFAULT '',
  smtp_protocol VARCHAR(10) DEFAULT 'TLS',
  smtp_sender_name VARCHAR(100) DEFAULT 'Chaml Team',
  smtp_sender_email VARCHAR(100) DEFAULT 'noreply@chaml.ma',
  app_domain VARCHAR(255) DEFAULT 'chaml' || '.fr'
);

-- Table: couples
CREATE TABLE IF NOT EXISTS couples (
  id VARCHAR(50) PRIMARY KEY,
  is_approved BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP WITH TIME ZONE NULL,
  dossier_status VARCHAR(20) DEFAULT 'draft' -- 'draft', 'submitted', 'approved', 'rejected'
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'demandeur', 'beneficiaire', 'admin'
  couple_id VARCHAR(50) REFERENCES couples(id) ON DELETE CASCADE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  phone VARCHAR(30),
  city VARCHAR(50),
  department VARCHAR(10), -- French department
  zone VARCHAR(5), -- Housing zone A/B/C
  living_surface NUMERIC DEFAULT 0,
  family_size INT DEFAULT 2,
  is_frozen BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  is_email_verified BOOLEAN DEFAULT FALSE,
  reset_password_token VARCHAR(255),
  reset_password_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: documents
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  couple_id VARCHAR(50) REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  doc_key VARCHAR(50) NOT NULL, -- 'fr_identity', 'fr_cerfa', etc.
  owner VARCHAR(20) NOT NULL, -- 'demandeur', 'beneficiaire'
  category VARCHAR(30) NOT NULL,
  required BOOLEAN DEFAULT TRUE,
  uploaded BOOLEAN DEFAULT FALSE,
  file_name VARCHAR(255),
  file_path VARCHAR(255),
  uploaded_at TIMESTAMP WITH TIME ZONE NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  comment TEXT,
  CONSTRAINT unique_couple_doc_key UNIQUE (couple_id, doc_key)
);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  user_email VARCHAR(100) NOT NULL
);
