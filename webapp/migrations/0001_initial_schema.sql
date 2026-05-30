-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audits table
CREATE TABLE IF NOT EXISTS audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  nom_batiment TEXT NOT NULL,
  type_batiment TEXT NOT NULL,
  surface REAL NOT NULL,
  annee_construction INTEGER,
  type_chauffage TEXT NOT NULL,
  electricite_kwh REAL NOT NULL DEFAULT 0,
  gaz_kwh REAL NOT NULL DEFAULT 0,
  isolation TEXT NOT NULL,
  vitrage TEXT NOT NULL,
  climatisation TEXT NOT NULL,
  dpe_classe TEXT NOT NULL,
  consommation_specifique REAL NOT NULL,
  emissions_co2 REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
