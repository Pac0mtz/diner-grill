// Seed script — populates sections/items from seed-data.js on FIRST RUN ONLY.
// If the sections table already has rows, this is a no-op.
import { pool, initDb, query } from "./db.js";
import { MENU } from "./seed-data.js";

function priceToCents(price) {
  return Math.round(parseFloat(price) * 100);
}

export async function seedIfEmpty() {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM sections");
  if (rows[0].n > 0) return false;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let si = 0; si < MENU.length; si++) {
      const cat = MENU[si];
      const res = await client.query(
        "INSERT INTO sections (label, note, sort) VALUES ($1, $2, $3) RETURNING id",
        [cat.label, cat.note ?? null, si]
      );
      const sectionId = res.rows[0].id;
      for (let ii = 0; ii < cat.items.length; ii++) {
        const item = cat.items[ii];
        await client.query(
          "INSERT INTO items (section_id, name, price_cents, description, tag, available, sort) VALUES ($1, $2, $3, $4, $5, 1, $6)",
          [sectionId, item.name, priceToCents(item.price), item.description ?? null, item.tag ?? null, ii]
        );
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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
    console.log("[seed] Sections already exist — skipping (first-run only).");
  }
  await pool.end();
}
