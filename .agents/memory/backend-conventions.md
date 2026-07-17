---
name: Backend conventions
description: Durable decisions for the Diner Grill Express backend (DB, auth, printing).
---

- Backend is on Replit's built-in PostgreSQL. Schema is created idempotently at server startup (CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS). Don't reintroduce SQLite/better-sqlite3.
  **Why:** User explicitly asked to use local Postgres; better-sqlite3 also required native build deps (python3/gcc/gnumake) to compile.
- `loadEnv()` must run inside `server/db.js` at import time, not just from entry scripts. **Why:** ESM import hoisting evaluates db.js before callers can call loadEnv(), which broke DATABASE_URL detection in .env-only setups.
- Admin dashboard auth = username/password (bcrypt) with expiring DB session tokens. `ADMIN_TOKEN` remains only as an optional static bearer for the print agent. Admin users are managed via `node server/create-admin.js <user> <pass>`.
- Print queue claims must be atomic (`FOR UPDATE SKIP LOCKED` + `print_claimed_at` with 2-min re-claim). **Why:** plain SELECT-then-UPDATE let concurrent pollers print the same ticket twice.
