#!/usr/bin/env node
/**
 * 1) Assumes backups/photos-pre-watermark already exists (or copies first).
 * 2) Organizes menu images into public/photos/<section-id>/
 * 3) Applies a subtle logo watermark to food/menu images.
 * 4) Prints a JSON remap of old → new paths for code updates.
 *
 * Usage: node scripts/organize-watermark-photos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { MENU } from "../server/seed-data.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const photos = path.join(root, "public", "photos");
const backup = path.join(root, "backups", "photos-pre-watermark");
const brandLogo = fs.existsSync(path.join(backup, "logo-badge.webp"))
  ? path.join(backup, "logo-badge.webp")
  : path.join(photos, "logo-badge.webp");

const SECTION_DIRS = MENU.map((c) => c.id);
const EXTRA_DIRS = ["brand", "gallery", "patio", "interior", "story"];

if (!fs.existsSync(backup)) {
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.cpSync(photos, backup, { recursive: true });
  console.log("[backup] created", backup);
}

for (const d of [...SECTION_DIRS, ...EXTRA_DIRS]) {
  fs.mkdirSync(path.join(photos, d), { recursive: true });
}

/** @type {Map<string, string>} basename → sectionId (first claim) */
const fileOwner = new Map();
/** @type {Map<string, string>} old public path → new public path */
const remap = new Map();

function basenameOf(publicPath) {
  return path.basename(publicPath);
}

// Assign each menu image to its section (first section that references it wins).
for (const cat of MENU) {
  for (const item of cat.items) {
    if (!item.image) continue;
    const base = basenameOf(item.image);
    if (!fileOwner.has(base)) fileOwner.set(base, cat.id);
  }
}

// Featured / shared extras that aren't always first-claimed
const FEATURED_HINTS = {
  "skillet-meat-lovers.webp": "skillets",
  "breakfast-bacon-egg.webp": "breakfast-sandwiches",
  "skillet-california.webp": "skillets",
  "omelette-denver.webp": "omelettes",
  "biscuits-gravy.webp": "chefs-creations",
  "waffle-banana-nutella.webp": "pancakes-waffles",
  "french-toast.webp": "french-toast",
  "cheeseburger.webp": "sandwiches",
  "burrito-breakfast.webp": "burritos",
  "fries.webp": "sides",
  "mickey-pancake.webp": "kids",
  "churros.webp": "desserts",
  "soda-coke.webp": "drinks",
  "slinger.webp": "omelettes",
};

for (const [base, sec] of Object.entries(FEATURED_HINTS)) {
  if (!fileOwner.has(base)) fileOwner.set(base, sec);
}

async function watermarkAndWrite(srcAbs, destAbs) {
  const meta = await sharp(srcAbs).metadata();
  const w = meta.width || 1280;
  const h = meta.height || 800;
  const markW = Math.max(56, Math.round(w * 0.12));
  const inset = Math.max(10, Math.round(w * 0.018));

  // Small semi-transparent logo (subtle, bottom-right)
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

// Move + watermark menu files from flat photos (or backup if already moved)
const sourceRoot = fs.existsSync(path.join(backup, "beef-burger.webp")) ? backup : photos;

let moved = 0;
for (const [base, sectionId] of fileOwner) {
  const src = path.join(sourceRoot, base);
  if (!fs.existsSync(src)) {
    // maybe already in a subfolder in backup
    const alt = path.join(photos, base);
    if (!fs.existsSync(alt)) {
      console.warn("missing", base);
      continue;
    }
  }
  const from = fs.existsSync(src) ? src : path.join(photos, base);
  const destDir = path.join(photos, sectionId);
  const dest = path.join(destDir, base);
  const oldPath = `/photos/${base}`;
  const newPath = `/photos/${sectionId}/${base}`;
  remap.set(oldPath, newPath);

  try {
    await watermarkAndWrite(from, dest);
    moved++;
  } catch (e) {
    console.warn("watermark fail", base, e.message);
    fs.copyFileSync(from, dest);
  }
}

// Brand assets (no watermark on logos)
for (const f of ["logo-badge.webp", "logo-neon.webp", "hero-diner.webp"]) {
  const from = path.join(sourceRoot, f);
  if (!fs.existsSync(from)) continue;
  const dest = path.join(photos, "brand", f);
  fs.copyFileSync(from, dest);
  remap.set(`/photos/${f}`, `/photos/brand/${f}`);
}

// Real gallery shots: dg-* → gallery/ (watermark lightly)
for (const ent of fs.readdirSync(sourceRoot)) {
  if (!/^dg-\d+\.webp$/i.test(ent)) continue;
  const from = path.join(sourceRoot, ent);
  const dest = path.join(photos, "gallery", ent);
  try {
    await watermarkAndWrite(from, dest);
  } catch {
    fs.copyFileSync(from, dest);
  }
  remap.set(`/photos/${ent}`, `/photos/gallery/${ent}`);
}

// Patio / interior / story — watermark copies into same relative folders from backup
for (const sub of ["patio", "interior", "story"]) {
  const srcDir = path.join(sourceRoot, sub);
  if (!fs.existsSync(srcDir)) continue;
  for (const ent of fs.readdirSync(srcDir)) {
    if (!/\.webp$/i.test(ent)) continue;
    const from = path.join(srcDir, ent);
    const dest = path.join(photos, sub, ent);
    try {
      await watermarkAndWrite(from, dest);
    } catch {
      fs.copyFileSync(from, dest);
    }
  }
}

// Patio files that were flat (patio-3.webp etc.)
for (const ent of fs.readdirSync(sourceRoot)) {
  if (!/^patio-\d+\.webp$/i.test(ent)) continue;
  const from = path.join(sourceRoot, ent);
  const dest = path.join(photos, "patio", ent);
  try {
    await watermarkAndWrite(from, dest);
  } catch {
    fs.copyFileSync(from, dest);
  }
  remap.set(`/photos/${ent}`, `/photos/patio/${ent}`);
}

// Remove flat menu files that were relocated (keep subdirs)
for (const ent of fs.readdirSync(photos)) {
  const full = path.join(photos, ent);
  if (!fs.statSync(full).isFile()) continue;
  if (/^logo/i.test(ent) || ent === "hero-diner.webp") {
    try {
      fs.unlinkSync(full);
    } catch {
      /* */
    }
    continue;
  }
  if (fileOwner.has(ent) || /^dg-\d+\.webp$/i.test(ent) || /^patio-\d+\.webp$/i.test(ent)) {
    try {
      fs.unlinkSync(full);
    } catch {
      /* */
    }
  }
}

const remapPath = path.join(root, "scripts", "photo-remap.json");
fs.writeFileSync(remapPath, JSON.stringify(Object.fromEntries(remap), null, 2));
console.log(JSON.stringify({ moved, remapCount: remap.size, remapPath }, null, 2));
