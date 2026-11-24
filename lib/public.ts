import { cache } from "react";
import { db } from "./db";
import type { Prisma } from "./generated/prisma/client";
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

/** SEO topic lists (/liste/<slug>): things people actually google, built from the cards we already have. */
export const LISTS: Record<string, { title: string; h1: string; desc: string; where: Prisma.ItemWhereInput }> = {
  "phrasal-verbs": {
    title: "İngilizce phrasal verb listesi: A1'den C2'ye Türkçe anlamları ve örnekleri",
    h1: "İngilizce phrasal verb'ler",
    desc: "Günlük konuşmada en çok kullanılan phrasal verb'ler, seviyelere göre sıralı. Her biri Türkçe anlamı, örnek cümlesi ve telaffuzuyla.",
    where: { type: "PHRASAL" },
  },
  "gundelik-ingilizce-kaliplar": {
    title: "Gündelik İngilizce konuşma kalıpları (Türkçe anlamlı, A1–C2)",
    h1: "Gündelik İngilizce konuşma kalıpları",
    desc: "Anadil konuşurlarının her gün kullandığı kısa kalıplar: selamlaşma, tepki verme, rica, öneri, itiraz. Seviyelere göre, örnekli.",
    where: { type: "CHUNK" },
  },
  "collocations": {
    title: "İngilizce collocation listesi: doğal kelime birliktelikleri (Türkçe anlamlı)",
    h1: "İngilizce collocation'lar",
    desc: "\"make a decision\" mı \"do a decision\" mı? Doğal İngilizcenin sırrı collocation'lar: hangi kelime hangisiyle kullanılır, seviyelere göre.",
    where: { type: "COLLOCATION" },
  },
  "dizi-ingilizcesi": {
    title: "Dizilerden İngilizce: Friends, HIMYM ve The Office tarzı gündelik kalıplar",
    h1: "Dizilerden gündelik İngilizce",
    desc: "Friends, How I Met Your Mother, The Office, Breaking Bad gibi dizilerde sürekli duyduğun tepkiler, laf sokmalar ve kalıplar; diyalog örnekleriyle.",
    where: { topic: { startsWith: "Dizilerden" } },
  },
  "is-ingilizcesi": {
    title: "İş İngilizcesi: ofiste ve toplantıda kullanılan kalıplar (Türkçe anlamlı)",
    h1: "İş yerinde İngilizce",
    desc: "Ofiste, toplantıda, e-postada ve iş arkadaşlarıyla konuşurken kullanılan kelime ve kalıplar; A1'den C1'e örnekli.",
    where: { topic: { in: ["İş ve ofis", "İş arkadaşları ve toplantılar", "İş hayatı", "Kariyer", "Eleştiri ve geri bildirim", "İş yerinde ileri İngilizce"] } },
  },
  "ingilizce-deyimler": {
    title: "Gündelik İngilizce deyimler ve anlamları (idioms, Türkçe karşılıklı)",
    h1: "Gündelik İngilizce deyimler",
    desc: "Kitaptaki değil, konuşmada gerçekten kullanılan İngilizce deyimler (idioms): Türkçe karşılıkları, örnek cümleleri ve dizilerden kullanımlarıyla.",
    where: { topic: { contains: "deyim" } },
  },
};

export const listItems = cache((slug: string) =>
  db.item.findMany({
    where: { ...LISTS[slug].where, slug: { not: null } },
    orderBy: [{ level: "asc" }, { order: "asc" }],
    select: { en: true, tr: true, slug: true, level: true },
  }),
);
