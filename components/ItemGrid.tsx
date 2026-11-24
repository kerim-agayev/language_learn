import Link from "next/link";

/** Public list of cards linking to /kelime/<slug>. grid-cols-1 keeps long nowrap text from widening the page. */
export function ItemGrid({ items }: { items: { en: string; tr: string; slug: string | null }[] }) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => (
        <li key={i.slug}>
          <Link href={`/kelime/${i.slug}`} className="block rounded-xl bg-paper px-3 py-2 hover:outline-2 hover:outline-pen">
            <span className="block truncate font-bold">{i.en}</span>
            <span className="block truncate text-sm text-muted">{i.tr}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
