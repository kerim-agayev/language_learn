import { requireUser } from "@/lib/auth";
import { stats, syncLevel } from "@/lib/learn";
import { Nav } from "@/components/Nav";
import { Learner } from "@/components/Learner";

export default async function LearnPage() {
  const user = await requireUser();
  const level = await syncLevel(user.id, user.level);
  const s = await stats(user.id, level);
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
            <p className="text-muted">Şu an sırada</p>
            <div className="mt-1 grid grid-cols-3 gap-2 text-center">
              {[
                { n: s.queue.fresh, l: "Yeni", c: "text-pen" },
                { n: s.queue.learning, l: "Öğreniliyor", c: "text-bad" },
                { n: s.queue.review, l: "Tekrar", c: "text-good" },
              ].map((x) => (
                <div key={x.l} className="rounded-xl bg-paper px-2 py-2">
                  <p className={`font-display text-2xl font-bold ${x.c}`}>{x.n}</p>
                  <p className="text-xs text-muted">{x.l}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </>
  );
}
