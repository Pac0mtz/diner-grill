// Idempotent menu sync (PostgreSQL) — reconciles an EXISTING database to the
// printed menu in server/seed-data.js.
//
//   - sections upserted by label (note/sort updated)
//   - items upserted by (section_id, name): price/description/tag/sort
//     refreshed, available set back to 1
//   - item.image is only overwritten when the menu entry carries one
//     (COALESCE), so photos uploaded through the admin are never wiped
//   - items that no longer appear in the printed menu are marked available=0
//     (never deleted — order history references them)
//
// Run manually:  node server/sync-menu.js   (or: npm run sync-menu)
// On server boot it runs only when the sections table is empty, or when
// SYNC_MENU=1 is set (see server/index.js).
import { pool, initDb } from "./db.js";
import { MENU } from "./seed-data.js";

export async function syncMenu() {
  const counts = {
    sectionsInserted: 0,
    sectionsUpdated: 0,
    itemsInserted: 0,
    itemsUpdated: 0,
    itemsDeactivated: 0,
  };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const keepItemIds = [];

    for (let si = 0; si < MENU.length; si++) {
      const cat = MENU[si];

      // Upsert section by label.
      const found = await client.query("SELECT id FROM sections WHERE label = $1", [cat.label]);
      let sectionId;
      if (found.rows[0]) {
        await client.query("UPDATE sections SET note = $1, sort = $2 WHERE id = $3", [
          cat.note ?? null,
          si,
          found.rows[0].id,
        ]);
        sectionId = found.rows[0].id;
        counts.sectionsUpdated++;
      } else {
        const ins = await client.query(
          "INSERT INTO sections (label, note, sort) VALUES ($1, $2, $3) RETURNING id",
          [cat.label, cat.note ?? null, si]
        );
        sectionId = ins.rows[0].id;
        counts.sectionsInserted++;
      }

      // Upsert items by (section_id, name).
      for (let ii = 0; ii < cat.items.length; ii++) {
        const item = cat.items[ii];
        const existing = await client.query(
          "SELECT id FROM items WHERE section_id = $1 AND name = $2",
          [sectionId, item.name]
        );
        const image = item.image ?? null;
        if (existing.rows[0]) {
          // COALESCE keeps an admin-uploaded image when the menu has none.
          await client.query(
            `UPDATE items SET price_cents = $1, description = $2, tag = $3, available = 1, sort = $4,
               image = COALESCE($5, image)
             WHERE id = $6`,
            [item.price_cents, item.description ?? null, item.tag ?? null, ii, image, existing.rows[0].id]
          );
          keepItemIds.push(existing.rows[0].id);
          counts.itemsUpdated++;
        } else {
          const ins = await client.query(
            `INSERT INTO items (section_id, name, price_cents, description, tag, available, sort, image)
             VALUES ($1, $2, $3, $4, $5, 1, $6, $7) RETURNING id`,
            [sectionId, item.name, item.price_cents, item.description ?? null, item.tag ?? null, ii, image]
          );
          keepItemIds.push(ins.rows[0].id);
          counts.itemsInserted++;
        }
      }
    }

    // Anything left in the DB that is not on the printed menu gets hidden,
    // not deleted, so historical orders keep their item references.
    const deactivated = await client.query(
      "UPDATE items SET available = 0 WHERE available = 1 AND NOT (id = ANY($1::int[]))",
      [keepItemIds]
    );
    counts.itemsDeactivated = deactivated.rowCount ?? 0;

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return counts;
}

// Allow running directly: `npm run sync-menu`
if (import.meta.url === `file://${process.argv[1]}`) {
  await initDb();
  const counts = await syncMenu();
  console.log(
    `[sync-menu] sections: +${counts.sectionsInserted} inserted, ${counts.sectionsUpdated} updated · ` +
      `items: +${counts.itemsInserted} inserted, ${counts.itemsUpdated} updated, ${counts.itemsDeactivated} deactivated`
  );
  await pool.end();
}
