import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { TESTS, stats, syncLevel, testStatus, type TestKind } from "@/lib/learn";
import { formatInterval } from "@/lib/srs";
import { Nav } from "@/components/Nav";
import { Learner } from "@/components/Learner";

/** "3 şimdi" when some are due, otherwise when the next one comes back ("8 dk sonra"). */
function when(b: { total: number; dueNow: number; nextIn: number }) {
  if (!b.total) return "—";
  if (b.dueNow) return `${b.dueNow} şimdi`;
  return `${formatInterval(b.nextIn)} sonra`;
}

export const metadata: Metadata = { title: "Öğren", robots: { index: false, follow: false } };


export default async function LearnPage() {
  const user = await requireUser();
  const level = await syncLevel(user.id, user.level);
  const [s, tests] = await Promise.all([stats(user.id, level), testStatus(user.id)]);
  const p = s.progress;
  const goalPct = Math.min(100, Math.round((s.today.n / user.dailyGoal) * 100));
  const lv = { "--lv": `var(--${level})` } as React.CSSProperties;

  return (
    <>
      <Nav name={user.name} level={level} />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 pb-16 md:grid-cols-[minmax(0,1fr)_280px]">
        <section className="mx-auto w-full max-w-xl pt-4">
          <Learner settings={{ intervalMin: user.intervalMin, workStart: user.workStart, workEnd: user.workEnd, sound: user.sound }} />
        </section>

        <aside className="flex flex-col gap-5 pt-4 text-sm">
          <div>
            <p className="text-muted">Bugün</p>
            <p className="font-display text-3xl font-bold">
              {s.today.n}<span className="text-lg text-muted"> / {user.dailyGoal}</span>
            </p>
            <div className="mt-2 h-2 rounded-full bg-line" role="progressbar" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-2 rounded-full bg-pen" style={{ width: `${goalPct}%` }} />
            </div>
            <p className="mt-2 text-muted">{s.today.ok} doğru, {s.today.pts} puan</p>
          </div>

          <div>
            <p className="text-muted">Seri</p>
            <p className="font-display text-3xl font-bold">🔥 {s.streak} gün</p>
          </div>

          <div style={lv}>
            <p className="text-muted">{level} ilerlemesi</p>
            <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-line">
              <div className="lv-chip h-3" style={{ width: `${(p.mastered / Math.max(1, p.total)) * 100}%` }} title="kalıcı öğrenilen" />
              <div className="h-3 opacity-40 lv-chip" style={{ width: `${((p.introduced - p.mastered) / Math.max(1, p.total)) * 100}%` }} title="görülen" />
            </div>
            <p className="mt-2 text-muted">
              {p.introduced}/{p.total} görüldü, {p.mastered} kalıcı. Sonraki seviye için tümü görülmeli ve %90&apos;ı kalıcı olmalı.
            </p>
          </div>

          <div>
            <p className="text-muted">Tekrar testleri</p>
            <div className="mt-1 flex flex-col gap-2">
              {(Object.keys(TESTS) as TestKind[]).map((k) => {
                const t = tests[k];
                return t.available ? (
                  <Link key={k} href={`/test/${k}`} className="flex items-center justify-between rounded-xl bg-pen px-3 py-2.5 font-bold text-pen-ink">
                    <span>{TESTS[k].label}</span>
                    <span className="text-xs font-normal">{Math.min(t.poolSize, TESTS[k].size)} soru, hazır</span>
                  </Link>
                ) : (
                  <div key={k} className="flex items-center justify-between rounded-xl bg-paper px-3 py-2.5">
                    <span>{TESTS[k].label}</span>
                    <span className="text-xs text-muted">
                      {t.nextInMs > 0
                        ? `${formatInterval(t.nextInMs)} sonra`
                        : k === "month" ? `${t.poolSize}/5 kart (7–30 gün önce)` : `${t.poolSize}/5 kart çalışıldı`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-muted">Kartların</p>
            <div className="mt-1 grid grid-cols-3 gap-2 text-center">
              {[
                { n: s.queue.fresh, l: "Yeni", c: "text-pen", sub: "bu seviyede" },
                { n: s.queue.learning.total, l: "Öğreniliyor", c: "text-bad", sub: when(s.queue.learning) },
                { n: s.queue.review.total, l: "Tekrar", c: "text-good", sub: when(s.queue.review) },
              ].map((x) => (
                <div key={x.l} className="rounded-xl bg-paper px-2 py-2">
                  <p className={`font-display text-2xl font-bold ${x.c}`}>{x.n}</p>
                  <p className="text-xs text-muted">{x.l}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-muted">{x.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </>
  );
}
