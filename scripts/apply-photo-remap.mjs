#!/usr/bin/env node
/**
 * Apply photo-remap.json + orphan leftovers; rewrite source path strings.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const photos = path.join(root, "public", "photos");
const backup = path.join(root, "backups", "photos-pre-watermark");
const remapPath = path.join(root, "scripts", "photo-remap.json");
const remap = JSON.parse(fs.readFileSync(remapPath, "utf8"));

const brandLogo = path.join(backup, "logo-badge.webp");

const ORPHANS = {
  "alaskan-waffle.webp": "pancakes-waffles",
  "breakfast-steak-eggs.webp": "breakfast",
  "burger-shake.webp": "sandwiches",
  "burrito.webp": "burritos",
  "melt.webp": "sandwiches",
  "pancakes-coffee.webp": "pancakes-waffles",
  "pancakes.webp": "pancakes-waffles",
  "sandwich.webp": "sandwiches",
  "soda-diet-coke.webp": "drinks",
  "soda-ginger-ale.webp": "drinks",
  "soda-root-beer.webp": "drinks",
  "soda-sprite.webp": "drinks",
  "waffle.webp": "pancakes-waffles",
};

async function watermarkAndWrite(srcAbs, destAbs) {
  const meta = await sharp(srcAbs).metadata();
  const w = meta.width || 1280;
  const h = meta.height || 800;
  const markW = Math.max(56, Math.round(w * 0.12));
  const inset = Math.max(10, Math.round(w * 0.018));

  const logoSoft = await sharp(brandLogo)
    .resize({ width: markW, withoutEnlargement: true })
    .ensureAlpha()
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.round(255 * 0.32)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const logoMeta = await sharp(logoSoft).metadata();
  const left = Math.max(0, w - (logoMeta.width || markW) - inset);
  const top = Math.max(0, h - (logoMeta.height || markW) - inset);

  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  await sharp(srcAbs)
    .composite([{ input: logoSoft, left, top, blend: "over" }])
    .webp({ quality: 82, effort: 5 })
    .toFile(destAbs + ".tmp");
  fs.renameSync(destAbs + ".tmp", destAbs);
}

for (const [base, sectionId] of Object.entries(ORPHANS)) {
  const flat = path.join(photos, base);
  const fromBackup = path.join(backup, base);
  const from = fs.existsSync(fromBackup) ? fromBackup : flat;
  if (!fs.existsSync(from)) continue;
  const dest = path.join(photos, sectionId, base);
  try {
    await watermarkAndWrite(from, dest);
  } catch {
    fs.copyFileSync(from, dest);
  }
  remap[`/photos/${base}`] = `/photos/${sectionId}/${base}`;
  if (fs.existsSync(flat)) fs.unlinkSync(flat);
}

fs.writeFileSync(remapPath, JSON.stringify(remap, null, 2));

const targets = [
  "src/data/menu.ts",
  "src/data/gallery.ts",
  "src/lib/menu-section-icons.ts",
  "src/sections/Hero.tsx",
  "src/sections/Navbar.tsx",
  "src/sections/Footer.tsx",
  "src/sections/Slinger.tsx",
  "src/sections/Story.tsx",
  "src/sections/Patio.tsx",
  "src/sections/admin/receipt-print.ts",
  "server/seed-data.js",
  "server/index.js",
];

// Longest keys first so partial replacements don't collide
const entries = Object.entries(remap).sort((a, b) => b[0].length - a[0].length);
let filesTouched = 0;
for (const rel of targets) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  let text = fs.readFileSync(abs, "utf8");
  const before = text;
  for (const [oldPath, newPath] of entries) {
    if (text.includes(oldPath)) text = text.split(oldPath).join(newPath);
  }
  if (text !== before) {
    fs.writeFileSync(abs, text);
    filesTouched++;
    console.log("updated", rel);
  }
}

console.log(JSON.stringify({ orphanRemaps: Object.keys(ORPHANS).length, filesTouched, remapCount: Object.keys(remap).length }, null, 2));
