// Seed script — populates sections/items from seed-data.js on FIRST RUN ONLY.
// If the sections table already has rows, this is a no-op.
import { db } from "./db.js";
import { MENU } from "./seed-data.js";

function priceToCents(price) {
  return Math.round(parseFloat(price) * 100);
}

export function seedIfEmpty() {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM sections").get();
  if (n > 0) return false;

  const insertSection = db.prepare(
    "INSERT INTO sections (label, note, sort) VALUES (?, ?, ?)"
  );
  const insertItem = db.prepare(
    "INSERT INTO items (section_id, name, price_cents, description, tag, available, sort) VALUES (?, ?, ?, ?, ?, 1, ?)"
  );

  const run = db.transaction(() => {
    MENU.forEach((cat, si) => {
      const info = insertSection.run(cat.label, cat.note ?? null, si);
      const sectionId = info.lastInsertRowid;
      cat.items.forEach((item, ii) => {
        insertItem.run(
          sectionId,
          item.name,
          priceToCents(item.price),
          item.description ?? null,
          item.tag ?? null,
          ii
        );
      });
    });
  });
  run();
  return true;
}

// Allow running directly: `npm run seed`
if (import.meta.url === `file://${process.argv[1]}`) {
  const didSeed = seedIfEmpty();
  if (didSeed) {
    const s = db.prepare("SELECT COUNT(*) AS n FROM sections").get().n;
    const i = db.prepare("SELECT COUNT(*) AS n FROM items").get().n;
    console.log(`[seed] Seeded ${s} sections and ${i} items.`);
  } else {
    console.log("[seed] Sections already exist — skipping (first-run only).");
  }
}
