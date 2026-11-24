import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEVELS, type LevelName } from "@/lib/srs";
import { LEVEL_INFO, levelItems } from "@/lib/public";
import { PublicHeader } from "@/components/PublicHeader";
import { ItemGrid } from "@/components/ItemGrid";

export const revalidate = 86400;
export const dynamicParams = false;
export function generateStaticParams() {
  return LEVELS.map((l) => ({ level: l.toLowerCase() }));
}

type Props = { params: Promise<{ level: string }> };
const toLevel = (s: string) => s.toUpperCase() as LevelName;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const L = toLevel((await params).level);
  if (!LEVELS.includes(L)) return {};
  return {
    title: `${L} İngilizce kelimeler, kalıplar ve phrasal verb'ler (Türkçe anlamlı)`,
    description: `${L} (${LEVEL_INFO[L].name}) seviye İngilizce: ${LEVEL_INFO[L].desc} Her kart resimli, sesli, örnek cümleli ve Türkçe anlamlı.`,
    alternates: { canonical: `/seviye/${L.toLowerCase()}` },
  };
}

export default async function LevelPage({ params }: Props) {
  const L = toLevel((await params).level);
  if (!LEVELS.includes(L)) notFound();
  const items = await levelItems(L);
  const topics = Map.groupBy(items, (i) => i.topic);

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16" style={{ "--lv": `var(--${L})` } as React.CSSProperties}>
      <PublicHeader />
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Seviyeler">
        {LEVELS.map((l) => (
          <Link
            key={l}
            href={`/seviye/${l.toLowerCase()}`}
            aria-current={l === L ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm font-bold ${l === L ? "lv-chip" : "bg-paper text-muted hover:text-ink"}`}
          >
            {l}
          </Link>
        ))}
      </nav>
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{L} İngilizce: {LEVEL_INFO[L].name}</h1>
      <p className="mt-2 max-w-2xl text-muted">
        {LEVEL_INFO[L].desc} Bu seviyede {items.length} kart var, aşağıda öğrenme sırasıyla. damla&apos;da {L} bitmeden bir
        sonraki seviye açılmaz.
      </p>
      <Link href="/register" className="mt-4 inline-block rounded-xl bg-pen px-5 py-2.5 font-bold text-pen-ink">
        {L}&apos;den başla, ücretsiz
      </Link>

      {[...topics].map(([topic, list]) => (
        <section key={topic} className="mt-10">
          <h2 className="font-display text-xl font-bold">{topic}</h2>
          <ItemGrid items={list} />
        </section>
      ))}
    </main>
  );
}
