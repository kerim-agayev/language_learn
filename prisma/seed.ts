import fs from "node:fs";
import { db } from "../lib/db";
import { loadContent, imgFile, pageSlug, slug } from "../lib/content";
import type { ItemType, Level } from "../lib/generated/prisma/client";

// Upserts by (type, en) so re-running after content edits keeps user progress.
async function main() {
  const seen = new Set<string>();
  const items = loadContent().filter((i) => {
    const k = `${i.type}|${i.en.toLowerCase()}`;
    if (seen.has(k)) return false; // first occurrence wins (core before anki)
    seen.add(k);
    return true;
  });

  // Same order every run -> same slugs. Clashes ("look" word vs chunk) get the type appended.
  const used = new Set<string>();
  const slugs = items.map((it) => {
    let s = pageSlug(it.en) || slug(it);
    if (used.has(s)) s = `${s}-${it.type.toLowerCase()}`;
    for (let n = 2; used.has(s); n++) s = `${pageSlug(it.en)}-${n}`;
    used.add(s);
    return s;
  });

  for (let i = 0; i < items.length; i += 20) {
    await Promise.all(
      items.slice(i, i + 20).map((it, j) => {
        const file = imgFile(it);
        const data = {
          level: it.level as Level,
          order: it.order,
          tr: it.tr,
          ipa: it.ipa ?? null,
          pos: it.pos ?? null,
          example: it.example,
          exampleTr: it.exampleTr,
          emoji: it.emoji ?? null,
          image: fs.existsSync(file) ? "/" + file.replace(/\\/g, "/").replace(/^public\//, "") : null,
          note: it.note ?? null,
          simple: it.simple ?? null,
          dialogue: it.dialogue ?? [],
          topic: it.topic,
          source: it.source,
          slug: slugs[i + j],
        };
        return db.item.upsert({
          where: { type_en: { type: it.type as ItemType, en: it.en } },
          create: { type: it.type as ItemType, en: it.en, ...data },
          update: data,
        });
      }),
    );
  }
  const byLevel = await db.item.groupBy({ by: ["level"], _count: true, orderBy: { level: "asc" } });
  console.log(byLevel.map((r) => `${r.level}: ${r._count}`).join(", "));
  console.log("with image:", await db.item.count({ where: { image: { not: null } } }));
}

main().finally(() => db.$disconnect());
