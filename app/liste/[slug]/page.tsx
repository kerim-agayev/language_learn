import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LISTS, listItems } from "@/lib/public";
import { LEVELS } from "@/lib/srs";
import { PublicHeader } from "@/components/PublicHeader";
import { ItemGrid } from "@/components/ItemGrid";

export const revalidate = 86400;
export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(LISTS).map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = LISTS[slug];
  if (!l) return {};
  return { title: l.title, description: l.desc, alternates: { canonical: `/liste/${slug}` }, openGraph: { title: l.h1, description: l.desc } };
}

export default async function ListPage({ params }: Props) {
  const { slug } = await params;
  const l = LISTS[slug];
  if (!l) notFound();
  const items = await listItems(slug);
  const byLevel = Map.groupBy(items, (i) => i.level);

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      <PublicHeader />
      <nav className="mb-4 text-sm text-muted" aria-label="Konum">
        <Link href="/" className="hover:text-ink">damla</Link> › <Link href="/liste" className="hover:text-ink">Listeler</Link>
      </nav>
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{l.h1}</h1>
      <p className="mt-2 max-w-2xl text-muted">
        {l.desc} Bu listede {items.length} kart var.
      </p>
      <Link href="/register" className="mt-4 inline-block rounded-xl bg-pen px-5 py-2.5 font-bold text-pen-ink">
        Bunları iş arasında öğren, ücretsiz
      </Link>

      {LEVELS.filter((lv) => byLevel.has(lv)).map((lv) => (
        <section key={lv} className="mt-10" style={{ "--lv": `var(--${lv})` } as React.CSSProperties}>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="lv-chip rounded-full px-2.5 py-0.5 text-sm">{lv}</span>
            {byLevel.get(lv)!.length} kart
          </h2>
          <ItemGrid items={byLevel.get(lv)!} />
        </section>
      ))}

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-xl font-bold">Diğer listeler</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {Object.entries(LISTS)
            .filter(([s]) => s !== slug)
            .map(([s, x]) => (
              <li key={s}>
                <Link href={`/liste/${s}`} className="block rounded-full bg-paper px-4 py-2 text-sm hover:outline-2 hover:outline-pen">{x.h1}</Link>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
