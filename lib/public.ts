import { cache } from "react";
import { db } from "./db";
import type { LevelName } from "./srs";

export const LEVEL_INFO: Record<LevelName, { name: string; desc: string }> = {
  A1: { name: "Başlangıç", desc: "İlk kelimeler, ev, aile, yemek ve en sık gündelik kalıplar." },
  A2: { name: "Temel", desc: "Alışveriş, yol tarifi, iş ve gündelik konuşmada sık phrasal verb'ler." },
  B1: { name: "Orta", desc: "Fikir söyleme, hikâye anlatma, iş hayatı ve doğal sohbet kalıpları." },
  B2: { name: "Orta üstü", desc: "Akıcı konuşma, deyimler, collocation'lar ve dizi İngilizcesi." },
  C1: { name: "İleri", desc: "İnce anlam farkları, ileri phrasal verb'ler ve doğal anadil ifadeleri." },
  C2: { name: "Ustalık", desc: "Anadil konuşurlarının gündelik hayatta kullandığı ince ifadeler." },
};

/** Public pages are cached (ISR); these are the only reads they do. */
export const publicItem = cache((slug: string) => db.item.findUnique({ where: { slug } }));

export const levelItems = cache((level: LevelName) =>
  db.item.findMany({
    where: { level, slug: { not: null } },
    orderBy: { order: "asc" },
    select: { en: true, tr: true, slug: true, topic: true },
  }),
);
