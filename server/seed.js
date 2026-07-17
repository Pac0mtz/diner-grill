// Seed script — populates the database from seed-data.js on FIRST RUN ONLY.
// If the sections table already has rows, this is a no-op (use sync-menu.js
// to reconcile an existing database to the latest printed menu).
import { pool, initDb, query } from "./db.js";
import { syncMenu } from "./sync-menu.js";

export async function seedIfEmpty() {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM sections");
  if (rows[0].n > 0) return false;
  await syncMenu();
  return true;
}

// Allow running directly: `npm run seed`
if (import.meta.url === `file://${process.argv[1]}`) {
  await initDb();
  const didSeed = await seedIfEmpty();
  if (didSeed) {
    const s = (await query("SELECT COUNT(*)::int AS n FROM sections")).rows[0].n;
    const i = (await query("SELECT COUNT(*)::int AS n FROM items")).rows[0].n;
    console.log(`[seed] Seeded ${s} sections and ${i} items.`);
  } else {
    console.log("[seed] Sections already exist — skipping (use `npm run sync-menu` to reconcile).");
  }
  await pool.end();
}
