// Perceptual check: finds pictures that LOOK the same even if the files differ (8x8 average hash, Hamming distance).
// Optional: --sheet <out.png> <word,word,...> builds a labelled contact sheet for eyeballing.
import fs from "node:fs";
import sharp from "sharp";
import { loadContent, imgFile } from "../lib/content";

const ahash = async (f: string) => {
  const px = await sharp(f).resize(8, 8, { fit: "fill" }).grayscale().raw().toBuffer();
  const avg = px.reduce((a, b) => a + b, 0) / px.length;
  return [...px].map((v) => (v > avg ? 1 : 0));
};
const dist = (a: number[], b: number[]) => a.reduce((n, v, i) => n + (v !== b[i] ? 1 : 0), 0);

async function main() {
  const seen = new Set<string>();
  const cards = loadContent().filter((i) => { const f = imgFile(i); if (seen.has(f) || !fs.existsSync(f)) return false; seen.add(f); return true; });
  const sheet = process.argv.indexOf("--sheet");
  if (sheet > 0) {
    const out = process.argv[sheet + 1], words = new Set(process.argv[sheet + 2].split(","));
    const pick = cards.filter((c) => words.has(c.en));
    const W = 240, H = 200, cols = 6;
    const tiles = await Promise.all(pick.map(async (c, i) => {
      const img = await sharp(imgFile(c)).resize(W, 180, { fit: "cover" }).toBuffer();
      const label = Buffer.from(`<svg width="${W}" height="20"><rect width="100%" height="100%" fill="white"/><text x="4" y="15" font-size="14" font-family="Arial">${c.en.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "&#39;")}</text></svg>`);
      return [{ input: img, left: (i % cols) * W, top: Math.floor(i / cols) * H }, { input: label, left: (i % cols) * W, top: Math.floor(i / cols) * H + 180 }];
    }));
    await sharp({ create: { width: cols * W, height: Math.ceil(pick.length / cols) * H, channels: 3, background: "#fff" } })
      .composite(tiles.flat()).png().toFile(out);
    return console.log(`sheet: ${pick.length} images -> ${out}`);
  }
  const hs = await Promise.all(cards.map(async (c) => ({ c, h: await ahash(imgFile(c)) })));
  let n = 0;
  for (let i = 0; i < hs.length; i++)
    for (let j = i + 1; j < hs.length; j++)
      if (dist(hs[i].h, hs[j].h) <= 3) { n++; console.log(`  looks alike: ${hs[i].c.en}  ~  ${hs[j].c.en}`); }
  console.log(`similar pairs: ${n}`);
}
main();
