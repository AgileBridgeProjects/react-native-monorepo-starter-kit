#!/usr/bin/env node
/**
 * Compresses the tinted emotion-face PNGs in assets/images/emotions/.
 *
 * These are rendered exclusively through `tintColor` (see EmotionFaceBubble), which discards
 * the source RGB entirely and recolours every non-transparent pixel from the alpha channel
 * alone. Only alpha carries the shape, so the fix is: flatten RGB to a single flat white
 * (provably invisible — nothing ever reads it) and resize to the largest size the app actually
 * renders at, with headroom for the highest-density devices. Alpha itself is left untouched at
 * full 8-bit precision — this script never quantises it, so there is no compression artefact
 * on a soft edge.
 *
 * Not a committed dependency — install ad hoc before running:
 *   npm install --no-save sharp@^0.34.4
 * (kept out of package.json so EAS's `npm ci --include=dev` doesn't drag sharp's
 * native build onto build machines where it isn't needed)
 *
 * Usage: node scripts/optimize-face-images.mjs [--check]
 *   --check  exits 1 if any file is not already optimized, without writing (for CI).
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp from 'sharp';

const ASSETS_DIR = join(import.meta.dirname, '..', 'assets', 'images', 'emotions');

/**
 * Largest logical size a face ever renders at is `MAX_BUBBLE_DIAMETER` (352px, in
 * emotion-summary-layout.ts) at its 0.5 width ratio (emotion-face-bubble.tsx) — 176px. Doubled
 * for @3x device pixel ratio and rounded up for headroom against a future larger context.
 */
const MAX_DIMENSION = 512;
const isCheckOnly = process.argv.includes('--check');

async function optimize(filePath) {
  const before = readFileSync(filePath);
  const resized = sharp(before).resize(MAX_DIMENSION, MAX_DIMENSION, {
    fit: 'inside',
    withoutEnlargement: true,
  });
  const { data: alpha, info } = await resized
    .clone()
    .extractChannel('alpha')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const flatWhite = Buffer.alloc(info.width * info.height * 3, 255);
  const after = await sharp(flatWhite, { raw: { width: info.width, height: info.height, channels: 3 } })
    .joinChannel(alpha, { raw: { width: info.width, height: info.height, channels: 1 } })
    // Colours capped at 256 rather than left uncompressed: RGB is now uniform, so every
    // palette slot goes to a distinct alpha level — headroom, not a lossy trade-off.
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, colours: 256 })
    .toBuffer();

  return { before, after };
}

async function main() {
  const files = readdirSync(ASSETS_DIR).filter((name) => name.endsWith('.png'));
  let totalBefore = 0;
  let totalAfter = 0;
  let anyChanged = false;

  for (const name of files) {
    const filePath = join(ASSETS_DIR, name);
    const { before, after } = await optimize(filePath);
    totalBefore += before.length;

    if (after.length < before.length) {
      anyChanged = true;
      if (!isCheckOnly) writeFileSync(filePath, after);
      totalAfter += isCheckOnly ? before.length : after.length;
      console.log(
        `${basename(name)}: ${before.length} -> ${after.length} bytes ` +
          `(-${Math.round((1 - after.length / before.length) * 100)}%)`,
      );
    } else {
      totalAfter += before.length;
      console.log(`${basename(name)}: already optimized (${before.length} bytes)`);
    }
  }

  console.log(
    `\nTotal: ${totalBefore} -> ${totalAfter} bytes ` +
      `(-${Math.round((1 - totalAfter / totalBefore) * 100)}%)`,
  );

  if (isCheckOnly && anyChanged) {
    console.error('\nSome face images are not optimized. Run: node scripts/optimize-face-images.mjs');
    process.exit(1);
  }
}

main();
