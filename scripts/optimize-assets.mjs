import sharp from "sharp";
import { resolve } from "node:path";
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error(
    "Usage: node scripts/optimize-assets.mjs input.png output.webp",
  );
await sharp(resolve(input))
  .resize(800, 800, { fit: "inside", withoutEnlargement: true })
  .webp({ quality: 84 })
  .toFile(resolve(output));
