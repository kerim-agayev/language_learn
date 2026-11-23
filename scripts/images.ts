// Downloads one small webp per picturable item into public/img (committed; Pixabay forbids hotlinking).
// Anki images are copied first so the user's own pictures win. Safe to re-run: existing files are skipped.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { loadContent, imgFile } from "../lib/content";

try { process.loadEnvFile(); } catch {}
const KEY = process.env.PIXABAY_API_KEY;
const ANKI_MEDIA = process.env.ANKI_MEDIA ?? path.join(process.env.APPDATA ?? "", "Anki2", "Kullanıcı 1", "collection.media");
const toWebp = (input: Buffer | string, out: string) =>
  sharp(input).resize(480, 360, { fit: "cover" }).webp({ quality: 72 }).toFile(out);

async function main() {
  fs.mkdirSync(path.join("public", "img"), { recursive: true });
  const items = loadContent();
  let added = 0, missing = 0;

  for (const it of items.filter((i) => i.image)) {
    const out = imgFile(it), src = path.join(ANKI_MEDIA, it.image!);
    if (fs.existsSync(out) || !fs.existsSync(src)) continue;
    await toWebp(src, out).then(() => added++, (e) => console.warn("anki", it.image, e.message));
  }

  if (!KEY) return console.log(`anki images: ${added}; no PIXABAY_API_KEY, skipping photos`);
  for (const it of items.filter((i) => i.imageQuery)) {
    const out = imgFile(it);
    if (fs.existsSync(out)) continue;
    const q = encodeURIComponent(it.imageQuery!);
    const res = await fetch(`https://pixabay.com/api/?key=${KEY}&q=${q}&image_type=photo&safesearch=true&per_page=3`);
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 60_000)); continue; }
    const hit = (await res.json()).hits?.[0];
    if (!hit) { missing++; continue; }
    const buf = Buffer.from(await (await fetch(hit.webformatURL)).arrayBuffer());
    await toWebp(buf, out);
    added++;
    await new Promise((r) => setTimeout(r, 700)); // stay under 100 req/min
  }
  console.log(`images added: ${added}, no result: ${missing}`);
}

main();
