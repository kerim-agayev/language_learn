import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LEVELS } from "@/lib/srs";
import { SITE_DESC, SITE_URL } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "damla",
  url: SITE_URL,
  description: SITE_DESC,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  inLanguage: "tr",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
};

export default async function Home() {
  if (await getUser()) redirect("/learn");
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4">
      <header className="flex items-center py-4">
        <span className="font-display text-xl font-bold">damla</span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="rounded-full px-4 py-1.5 text-sm hover:bg-paper">Giriş yap</Link>
        </div>
      </header>

      <section className="grid flex-1 items-center gap-12 py-10 md:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="font-display text-5xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
            İş arasında, damla damla İngilizce.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            Her birkaç dakikada bir tek kart. Kelime, gündelik kalıp, phrasal verb. A1 bitmeden A2 açılmaz; unuttuğun
            an tekrar gelir. İş arkadaşlarınla her gün aynı kelimelerle yarışırsın.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/register" className="rounded-xl bg-pen px-6 py-3 font-bold text-pen-ink">Hesap aç</Link>
            <Link href="/login" className="rounded-xl border-2 border-line px-6 py-3 font-bold hover:border-pen">Giriş yap</Link>
          </div>
        </div>

        {/* a sample card, tilted like a note stuck to the monitor */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="note -rotate-2 p-7" style={{ "--lv": "var(--A2)" } as React.CSSProperties}>
            <p className="text-6xl" aria-hidden>🏃</p>
            <p className="mt-4 font-display text-4xl font-bold">run out of</p>
            <p className="text-sm text-muted">/rʌn aʊt əv/  phrasal verb</p>
            <p className="mt-4 text-xl font-bold">-i bitmek, tükenmek</p>
            <p className="mt-4 rounded-xl bg-desk px-4 py-3">
              We&apos;ve run out of milk.
              <span className="mt-1 block text-sm text-muted">Süt bitti.</span>
            </p>
          </div>
          <div className="mt-8 flex justify-center gap-1.5">
            {LEVELS.map((l) => (
              <span key={l} className="lv-chip rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ "--lv": `var(--${l})` } as React.CSSProperties}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-8 border-t border-line py-12 sm:grid-cols-3">
        {[
          {
            t: "Bir çocuk gibi",
            d: "5 yaşındaki bir İngiliz çocuk okuyamaz ama konuşur. Sen de onun sırasıyla öğrenirsin: önce her gün duyulan kelimeler, \"come here\", \"put your shoes on\" gibi kalıplar ve phrasal verb'ler.",
          },
          {
            t: "Önce resim ve ses",
            d: "Yeni kelime resmi, sesi ve basit İngilizce açıklamasıyla gelir. Türkçesi bir dokunuş uzakta ama son çare. Testlerin çoğu tamamen İngilizce.",
          },
          {
            t: "Feynman tekniği",
            d: "Her şey 5 yaşındaki birine anlatır gibi açıklanır. Bir kelimeyi iyice öğrendiğinde senden onu kendi cümlende kullanmanı ister; yazarak ya da sesli.",
          },
        ].map((x) => (
          <div key={x.t}>
            <h2 className="font-display text-xl font-bold">{x.t}</h2>
            <p className="mt-2 text-muted">{x.d}</p>
          </div>
        ))}
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
