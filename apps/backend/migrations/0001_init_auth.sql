-- Migration: Initialize DB with Authentication & User Profile Tables

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- UUID
  cpf TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('MEDICO', 'PACIENTE', 'RECEPCIONISTA')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  jti TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  user_cpf TEXT NOT NULL REFERENCES users(cpf) ON DELETE CASCADE,
  is_used INTEGER DEFAULT 0,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);

-- Seed user: Dr. Gregory House (CPF: 12345678909, Senha: senha123)
INSERT INTO users (id, cpf, name, phone, email, role) 
VALUES ('d9b43c68-8be0-449e-8c3a-864a66a6a2a2', '12345678909', 'Dr. Gregory House', '11999999999', 'house@aura.com.br', 'MEDICO')
ON CONFLICT(cpf) DO NOTHING;

INSERT INTO user_credentials (user_id, password_hash, salt)
VALUES ('d9b43c68-8be0-449e-8c3a-864a66a6a2a2', '051e69f894f4edb10b96d812122603b41a4cd461fe1a07325674ebf13da385e1', 'aura_dev_salt')
ON CONFLICT(user_id) DO NOTHING;
