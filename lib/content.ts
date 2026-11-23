// Shared by seed + image scripts (plain Node, no Next imports).
import fs from "node:fs";
import path from "node:path";

export type RawItem = {
  type: "WORD" | "CHUNK" | "PHRASAL" | "SENTENCE" | "COLLOCATION";
  en: string;
  tr: string;
  ipa?: string | null;
  pos?: string | null;
  example: string;
  exampleTr: string;
  emoji?: string | null;
  imageQuery?: string | null;
  note?: string | null;
  simple?: string | null;
  level?: string; // anki only
  image?: string | null; // anki only: original media filename
  source?: string;
};
export type Loaded = RawItem & { level: string; order: number; topic: string; source: string };

export const slug = (i: { type: string; en: string }) =>
  `${i.type}-${i.en}`.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export const imgFile = (i: { type: string; en: string }) => path.join("public", "img", `${slug(i)}.webp`);

/** All content in learning order. Core files first (by filename), then the user's Anki cards inside their level. */
export function loadContent(root = "content"): Loaded[] {
  const out: Loaded[] = [];
  for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
    const dir = path.join(root, level);
    if (!fs.existsSync(dir)) continue;
    let order = 0;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
      const { topic, items } = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      for (const it of items as RawItem[]) out.push({ ...it, level, order: order++, topic, source: "core" });
    }
  }
  const anki = path.join(root, "anki.json");
  if (fs.existsSync(anki)) {
    const { topic, items } = JSON.parse(fs.readFileSync(anki, "utf8"));
    (items as RawItem[]).forEach((it, i) =>
      out.push({ ...it, level: it.level ?? "B1", order: 100000 + i, topic, source: "anki" }),
    );
  }
  return out;
}
