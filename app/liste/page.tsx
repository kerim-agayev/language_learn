import type { Metadata } from "next";
import Link from "next/link";
import { LISTS } from "@/lib/public";
import { PublicHeader } from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "İngilizce kelime ve kalıp listeleri: phrasal verb, collocation, deyim, iş İngilizcesi",
  description: "Türkçe anlamlı İngilizce listeler: phrasal verb'ler, gündelik kalıplar, collocation'lar, deyimler, dizi ve iş İngilizcesi. Hepsi örnekli ve sesli.",
  alternates: { canonical: "/liste" },
};

export default function ListsIndex() {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      <PublicHeader />
      <h1 className="font-display text-3xl font-bold sm:text-4xl">İngilizce listeler</h1>
      <p className="mt-2 max-w-2xl text-muted">Seviyelere göre sıralı, her kart Türkçe anlamı, örnek cümlesi ve sesiyle.</p>
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Object.entries(LISTS).map(([s, l]) => (
          <li key={s}>
            <Link href={`/liste/${s}`} className="block h-full rounded-2xl bg-paper p-5 hover:outline-2 hover:outline-pen">
              <span className="font-display text-xl font-bold">{l.h1}</span>
              <span className="mt-1 block text-sm text-muted">{l.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
