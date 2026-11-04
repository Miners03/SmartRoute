-- Migration 001_init.sql
BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager','rider')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);

CREATE TABLE IF NOT EXISTS riders (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  max_stops INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS depots (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  CONSTRAINT depots_lat_valid CHECK (lat IS NULL OR (lat >= -90 AND lat <= 90)),
  CONSTRAINT depots_lng_valid CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180))
);

CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  manager_id INTEGER NOT NULL REFERENCES users(id),
  depot_id INTEGER NOT NULL REFERENCES depots(id),
  name TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  objective TEXT NOT NULL DEFAULT 'distance' CHECK (objective IN ('distance','time')),
  return_to_depot BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  raw_address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geocode_status TEXT NOT NULL DEFAULT 'pending' CHECK (geocode_status IN ('pending','ok','not_found','ambiguous','manual')),
  service_time_sec INTEGER NOT NULL DEFAULT 120,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','delivered','failed','cancelled')),
  original_seq INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT deliveries_lat_valid CHECK (lat IS NULL OR (lat >= -90 AND lat <= 90)),
  CONSTRAINT deliveries_lng_valid CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180))
);

CREATE TABLE IF NOT EXISTS geocode_cache (
  address_hash TEXT PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  display_name TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT geocode_cache_lat_valid CHECK (lat >= -90 AND lat <= 90),
  CONSTRAINT geocode_cache_lng_valid CHECK (lng >= -180 AND lng <= 180)
);

CREATE INDEX IF NOT EXISTS idx_deliveries_batch_id ON deliveries(batch_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

COMMIT;
