import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bağlantı yok", robots: { index: false, follow: false } };

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <div className="note p-6" style={{ "--lv": "var(--A1)" } as React.CSSProperties}>
        <p className="text-5xl" aria-hidden>📡</p>
        <h1 className="mt-3 font-display text-2xl font-bold">İnternet bağlantısı yok</h1>
        <p className="mt-2 text-muted">
          Cevapların sunucuda kontrol edilip kaydedildiği için kartlar internet ister. Bağlantı gelince kaldığın yerden devam.
        </p>
        <a href="/learn" className="mt-5 inline-block rounded-xl bg-pen px-5 py-2.5 font-bold text-pen-ink">Tekrar dene</a>
      </div>
    </main>
  );
}
