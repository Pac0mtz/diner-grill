#!/usr/bin/env node
/**
 * Re-encode public/photos/* to WebP (max 1280px, q82) for faster menu/site loads.
 * Usage: node scripts/compress-photos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "photos");
const INPUT_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_W = 1280;
const QUALITY = 82;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (INPUT_EXTS.has(path.extname(ent.name).toLowerCase())) out.push(full);
  }
  return out;
}

const files = walk(root);
let before = 0;
let after = 0;

for (const src of files) {
  before += fs.statSync(src).size;
  const ext = path.extname(src).toLowerCase();
  const dest = src.slice(0, -ext.length) + ".webp";
  const tmp = dest + ".tmp";
  await sharp(src)
    .rotate()
    .resize({ width: MAX_W, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
    .toFile(tmp);
  fs.renameSync(tmp, dest);
  if (src !== dest && fs.existsSync(src)) fs.unlinkSync(src);
  after += fs.statSync(dest).size;
}

console.log(
  `[compress-photos] ${files.length} files · ${(before / 1024 / 1024).toFixed(2)}MB → ${(after / 1024 / 1024).toFixed(2)}MB (−${((1 - after / before) * 100).toFixed(1)}%)`
);
