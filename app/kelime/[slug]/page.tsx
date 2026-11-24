import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageSlug } from "@/lib/content";
import { LISTS, publicItem } from "@/lib/public";
import { SITE_URL } from "@/lib/site";
import { ItemFace } from "@/components/Card";
import { TYPE_LABEL } from "@/lib/srs";
import { PublicHeader } from "@/components/PublicHeader";

// ponytail: ~2400 pages, rendered on first visit and cached for a day (ISR) instead of at build time.
export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

const clean = (en: string) => en.replace(/[.,!?]+$/, "");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const it = await publicItem((await params).slug);
  if (!it) return {};
  const en = clean(it.en);
  return {
    title: `"${en}" ne demek? Türkçe anlamı ve örnek cümleler (${it.level})`,
    description: `${en}: ${it.tr.replace(/[.!?…]$/, "")}. Örnek: "${it.example}" (${it.exampleTr}) ${it.level} seviye ${TYPE_LABEL[it.type]}, telaffuz ve gündelik kullanım.`.slice(0, 300),
    // same phrase as two types (chunk + collocation) -> one canonical page
    alternates: { canonical: `/kelime/${pageSlug(it.en) || it.slug}` },
    openGraph: { title: `"${en}" ne demek?`, description: it.tr, ...(it.image ? { images: [it.image] } : {}) },
  };
}

export default async function ItemPage({ params }: Props) {
  const it = await publicItem((await params).slug);
  if (!it?.slug) notFound();
  const sel = { en: true, tr: true, slug: true } as const;
  const [prev, next, related] = await Promise.all([
    db.item.findFirst({ where: { level: it.level, order: { lt: it.order }, slug: { not: null } }, orderBy: { order: "desc" }, select: sel }),
    db.item.findFirst({ where: { level: it.level, order: { gt: it.order }, slug: { not: null } }, orderBy: { order: "asc" }, select: sel }),
    db.item.findMany({ where: { level: it.level, topic: it.topic, id: { not: it.id }, slug: { not: null } }, orderBy: { order: "asc" }, take: 12, select: sel }),
  ]);
  const en = clean(it.en);
  const lv = it.level.toLowerCase();
  const list = it.topic.startsWith("Dizilerden") ? "dizi-ingilizcesi" : it.topic.includes("deyim") ? "ingilizce-deyimler"
    : ({ PHRASAL: "phrasal-verbs", CHUNK: "gundelik-ingilizce-kaliplar", COLLOCATION: "collocations" } as Record<string, string>)[it.type];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: it.en,
    description: `${it.tr}. ${it.simple ?? ""}`.trim(),
    inLanguage: "en",
    url: `${SITE_URL}/kelime/${it.slug}`,
    inDefinedTermSet: { "@type": "DefinedTermSet", name: `damla ${it.level} İngilizce`, url: `${SITE_URL}/seviye/${lv}` },
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <PublicHeader />
      <nav className="mb-4 text-sm text-muted" aria-label="Konum">
        <Link href="/" className="hover:text-ink">damla</Link> ›{" "}
        <Link href={`/seviye/${lv}`} className="hover:text-ink">{it.level} İngilizce</Link> › {it.topic}
      </nav>
      <h1 className="font-display text-3xl font-bold break-words sm:text-4xl">&ldquo;{en}&rdquo; ne demek?</h1>
      <p className="mt-2 text-muted">
        <b className="text-ink">{it.tr}</b>{/[.!?…]$/.test(it.tr) ? "" : "."} {it.level} seviye {TYPE_LABEL[it.type]}. Dinle, örnek cümleyi oku, sonra damla ile iş
        arasında kalıcı öğren.
      </p>

      <article className="note mt-6 p-5 sm:p-7" style={{ "--lv": `var(--${it.level})` } as React.CSSProperties}>
        <ItemFace item={it} />
      </article>

      <div className="mt-6 rounded-2xl bg-paper p-5">
        <p className="font-display text-xl font-bold">Bunu unutmadan öğren</p>
        <p className="mt-1 text-muted">
          Birkaç dakikada bir tek kart: resim, ses, tekrar. Anki gibi aralıklı tekrar, A1&apos;den C2&apos;ye doğru sırayla. Ücretsiz.
        </p>
        <Link href="/register" className="mt-4 inline-block rounded-xl bg-pen px-5 py-2.5 font-bold text-pen-ink">Ücretsiz hesap aç</Link>
      </div>

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold">Aynı konudan: {it.topic}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/kelime/${r.slug}`} className="block rounded-xl bg-paper px-4 py-2.5 hover:outline-2 hover:outline-pen">
                  <span className="font-bold">{r.en}</span> <span className="text-sm text-muted">{r.tr}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-sm text-muted">
        Daha fazlası:{" "}
        <Link href={`/seviye/${lv}`} className="font-bold text-pen underline">{it.level} kelimeleri</Link>
        {list && (
          <>
            {" ve "}
            <Link href={`/liste/${list}`} className="font-bold text-pen underline">{LISTS[list].h1}</Link>
          </>
        )}
      </p>

      <nav className="mt-4 flex justify-between gap-3 text-sm" aria-label="Önceki ve sonraki">
        {prev ? <Link href={`/kelime/${prev.slug}`} className="min-w-0 truncate rounded-xl px-3 py-2 hover:bg-paper">← {prev.en}</Link> : <span />}
        {next ? <Link href={`/kelime/${next.slug}`} className="min-w-0 truncate rounded-xl px-3 py-2 hover:bg-paper">{next.en} →</Link> : <span />}
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </main>
  );
}
