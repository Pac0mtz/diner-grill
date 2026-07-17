// PostgreSQL database setup for Diner Grill ordering (Replit built-in DB).
import pg from "pg";
import { loadEnv } from "./env.js";

// Load .env before reading DATABASE_URL — this module is imported before
// callers get a chance to run loadEnv() themselves (ESM import hoisting).
loadEnv();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — the PostgreSQL database is required.");
}

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

/** Run a parameterized query; returns the pg result. */
export function query(text, params) {
  return pool.query(text, params);
}

/** Create tables if they don't exist. Called once at startup. */
export async function initDb() {
  await pool.query(`
CREATE TABLE IF NOT EXISTS sections (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  note TEXT,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  description TEXT,
  tag TEXT,
  available INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  items_json TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment','paid','preparing','ready','done','cancelled')),
  stripe_payment_intent TEXT,
  print_status TEXT NOT NULL DEFAULT 'queued'
    CHECK (print_status IN ('queued','printed','failed')),
  print_claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS print_claimed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
`);
}

// Chicago combined restaurant tax rate (10.25%).
export const TAX_RATE = 0.1025;

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "preparing",
  "ready",
  "done",
  "cancelled",
];

export async function getSetting(key) {
  const { rows } = await query("SELECT value FROM settings WHERE key = $1", [key]);
  return rows[0] ? rows[0].value : null;
}

export async function setSetting(key, value) {
  await query(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [key, value == null ? null : String(value)]
  );
}

export function parseOrder(row) {
  if (!row) return null;
  return {
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    items: JSON.parse(row.items_json),
    items_json: undefined,
  };
}
