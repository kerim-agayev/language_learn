// Finds cards whose pictures are byte-identical (Pixabay returned the same top photo for two queries) and
// re-downloads a different, unused photo for all but one of them. User's Anki pictures are never replaced.
// Usage: npx tsx scripts/dedupe-images.ts          -> report only
//        npx tsx scripts/dedupe-images.ts --fix    -> replace duplicates
import fs from "node:fs";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { loadContent, imgFile } from "../lib/content";

try { process.loadEnvFile(); } catch {}
const KEY = process.env.PIXABAY_API_KEY;
const fix = process.argv.includes("--fix");
const hash = (buf: Buffer) => createHash("sha1").update(buf).digest("hex");
const toWebp = (buf: Buffer) => sharp(buf).resize(480, 360, { fit: "cover" }).webp({ quality: 72 }).toBuffer();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // one entry per image file, in learning order (first occurrence = the card that keeps its picture)
  const seen = new Set<string>();
  const cards = loadContent().filter((i) => {
    const f = imgFile(i);
    if (seen.has(f) || !fs.existsSync(f)) return false;
    seen.add(f);
    return true;
  });
  const byHash = new Map<string, typeof cards>();
  for (const c of cards) {
    const h = hash(fs.readFileSync(imgFile(c)));
    byHash.set(h, [...(byHash.get(h) ?? []), c]);
  }
  const groups = [...byHash.values()].filter((g) => g.length > 1);
  console.log(`images ${cards.length}, duplicate groups ${groups.length}`);
  for (const g of groups) console.log("  " + g.map((c) => `${c.en} [${c.source}${c.imageQuery ? `: ${c.imageQuery}` : ""}]`).join("  =  "));
  if (!fix) return;
  if (!KEY) throw new Error("PIXABAY_API_KEY missing");

  const used = new Set(byHash.keys());
  let replaced = 0;
  const failed: string[] = [];
  for (const g of groups) {
    const keeper = g.find((c) => c.source === "anki") ?? g[0]; // the user's own picture always wins
    for (const c of g) {
      if (c === keeper) continue;
      if (c.source === "anki" || !c.imageQuery) { failed.push(`${c.en} (own/anki picture, left as is)`); continue; }
      const q = encodeURIComponent(c.imageQuery);
      let res = await fetch(`https://pixabay.com/api/?key=${KEY}&q=${q}&image_type=photo&safesearch=true&per_page=20`);
      if (res.status === 429) { await sleep(60_000); res = await fetch(res.url); } // rate limit: wait a minute, retry once
      await sleep(700);
      const hits: { webformatURL: string }[] = (await res.json()).hits ?? [];
      let done = false;
      for (const hit of hits) {
        const dl = await fetch(hit.webformatURL);
        if (!dl.ok) { await sleep(2000); continue; }
        const buf = await toWebp(Buffer.from(await dl.arrayBuffer())).catch(() => null); // not an image (e.g. throttled)
        if (!buf) { await sleep(2000); continue; }
        const h = hash(buf);
        if (used.has(h)) continue;
        fs.writeFileSync(imgFile(c), buf);
        used.add(h);
        replaced++;
        done = true;
        console.log(`  replaced: ${c.en}`);
        break;
      }
      if (!done) failed.push(`${c.en} (no unused photo for "${c.imageQuery}")`);
    }
  }
  console.log(`replaced ${replaced}${failed.length ? `, not replaced: ${failed.join("; ")}` : ""}`);
}

main();
