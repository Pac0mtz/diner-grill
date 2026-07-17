// Create or update an admin user: node server/create-admin.js <username> <password>
import bcrypt from "bcryptjs";
import { initDb, query, pool } from "./db.js";
import { loadEnv } from "./env.js";

loadEnv();

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error("Usage: node server/create-admin.js <username> <password>");
  process.exit(1);
}

await initDb();
const hash = await bcrypt.hash(password, 12);
await query(
  `INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)
   ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [username, hash]
);
console.log(`[create-admin] Admin user '${username}' created/updated.`);
await pool.end();
