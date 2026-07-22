#!/usr/bin/env node
/**
 * Re-apply circular logo watermarks from clean sources with more left inset.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const photos = path.join(root, "public", "photos");
const backup = path.join(root, "backups", "photos-pre-watermark");
const assets = "/home/runner/.cursor/projects/home-runner/assets";
const logoPath = path.join(backup, "logo-badge.webp");

/** Prefer clean regenerated masters over backup (which may still be sesame / wrong plate). */
const OVERRIDES = {
  "beef-burger.webp": path.join(assets, "brioche-plain-beef-burger.png"),
  "double-burger.webp": path.join(assets, "brioche-plain-double-burger.png"),
  "cheeseburger.webp": path.join(assets, "brioche-plain-cheeseburger.png"),
  "double-cheeseburger.webp": path.join(assets, "brioche-plain-double-cheeseburger.png"),
  "bacon-cheeseburger.webp": path.join(assets, "brioche-plain-bacon-cheeseburger.png"),
  "double-bacon-cheeseburger.webp": path.join(assets, "brioche-plain-double-bacon-cheeseburger.png"),
  "breakfast-fried-eggs.webp": path.join(assets, "breakfast-fried-eggs-plate.png"),
};

const SKIP_DIRS = new Set(["brand"]); // logos themselves

async function circularLogo(markW) {
  const size = markW;
  // Soft circular mask
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
    </svg>`
  );

  const logo = await sharp(logoPath)
    .resize({ width: size, height: size, fit: "cover" })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  // ~38% opacity so it reads clearly but stays subtle
  return sharp(logo)
    .ensureAlpha()
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.round(255 * 0.38)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();
}

async function watermarkFile(srcAbs, destAbs) {
  const meta = await sharp(srcAbs).metadata();
  let pipeline = sharp(srcAbs).rotate().resize({ width: 1280, withoutEnlargement: true });
  const resized = await pipeline.toBuffer({ resolveWithObject: true });
  const w = resized.info.width;
  const h = resized.info.height;

  const markW = Math.max(80, Math.round(w * 0.15));
  // Pull well in from the right/bottom so object-cover cards don't clip it
  const insetX = Math.max(72, Math.round(w * 0.14));
  const insetY = Math.max(56, Math.round(h * 0.12));

  const logoSoft = await circularLogo(markW);
  const left = Math.max(0, w - markW - insetX);
  const top = Math.max(0, h - markW - insetY);

  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  await sharp(resized.data, {
    raw: { width: w, height: h, channels: resized.info.channels },
  })
    .composite([{ input: logoSoft, left, top, blend: "over" }])
    .webp({ quality: 82, effort: 5, smartSubsample: true })
    .toFile(destAbs + ".tmp");
  fs.renameSync(destAbs + ".tmp", destAbs);
}

function walkWebp(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walkWebp(full, out);
    } else if (/\.webp$/i.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

function resolveSource(destAbs) {
  const base = path.basename(destAbs);
  if (OVERRIDES[base] && fs.existsSync(OVERRIDES[base])) return OVERRIDES[base];

  // flat backup
  const flat = path.join(backup, base);
  if (fs.existsSync(flat)) return flat;

  // nested backup (patio/interior/story)
  const rel = path.relative(photos, destAbs);
  const nested = path.join(backup, rel);
  if (fs.existsSync(nested)) return nested;

  // subfolder in backup by basename walk once cached
  return null;
}

// Build basename index for backup
const backupIndex = new Map();
function indexBackup(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) indexBackup(full);
    else if (/\.webp$/i.test(ent.name) && !backupIndex.has(ent.name)) {
      backupIndex.set(ent.name, full);
    }
  }
}
indexBackup(backup);

const targets = walkWebp(photos);
let ok = 0;
let miss = 0;
for (const dest of targets) {
  const base = path.basename(dest);
  let src = resolveSource(dest);
  if (!src && backupIndex.has(base)) src = backupIndex.get(base);
  if (!src) {
    console.warn("no clean source", path.relative(photos, dest));
    miss++;
    continue;
  }
  try {
    // Prefer buffer path without raw to avoid channel issues
    const metaProbe = await sharp(src).rotate().resize({ width: 1280, withoutEnlargement: true }).toBuffer();
    const meta = await sharp(metaProbe).metadata();
    const w = meta.width;
    const h = meta.height;
    const markW = Math.max(80, Math.round(w * 0.15));
    const insetX = Math.max(72, Math.round(w * 0.14));
    const insetY = Math.max(56, Math.round(h * 0.12));
    const logoSoft = await circularLogo(markW);
    const left = Math.max(0, w - markW - insetX);
    const top = Math.max(0, h - markW - insetY);
    await sharp(metaProbe)
      .composite([{ input: logoSoft, left, top, blend: "over" }])
      .webp({ quality: 82, effort: 5, smartSubsample: true })
      .toFile(dest + ".tmp");
    fs.renameSync(dest + ".tmp", dest);
    ok++;
    if (ok % 25 === 0) console.log(`… ${ok}/${targets.length}`);
  } catch (e) {
    console.warn("fail", base, e.message);
    miss++;
  }
}

console.log(JSON.stringify({ ok, miss, total: targets.length }, null, 2));
