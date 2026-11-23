import { requireUser } from "@/lib/auth";
import { db, todayKey } from "@/lib/db";
import { leaderboard } from "@/lib/learn";
import { createTeam, joinTeam, leaveTeam } from "@/app/actions";
import { Nav } from "@/components/Nav";
import { ActionForm, Field } from "@/components/Forms";
import { Challenge } from "@/components/Challenge";

function Board({ rows, me, title }: { rows: { id: string; name: string; pts: number; ok: number }[]; me: string; title: string }) {
  return (
    <div>
      <p className="mb-2 text-sm text-muted">{title}</p>
      <ol className="flex flex-col gap-1">
        {rows.map((r, i) => (
          <li key={r.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${r.id === me ? "bg-desk font-bold" : ""}`}>
            <span className="w-6 text-muted tabular-nums">{i === 0 && r.pts > 0 ? "👑" : i + 1}</span>
            <span className="flex-1 truncate">{r.name}</span>
            <span className="text-sm text-muted tabular-nums">{r.ok} doğru</span>
            <span className="w-14 text-right tabular-nums">{r.pts}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default async function TeamPage() {
  const u = await requireUser();
  const teams = await db.team.findMany({ where: { members: { some: { userId: u.id } } }, orderBy: { createdAt: "asc" } });
  const date = todayKey();
  const data = await Promise.all(
    teams.map(async (t) => {
      const [today, week, ch] = await Promise.all([
        leaderboard(t.id, 1),
        leaderboard(t.id, 7),
        db.dailyChallenge.findUnique({ where: { teamId_date: { teamId: t.id, date } } }),
      ]);
      const done = ch ? await db.reviewLog.count({ where: { userId: u.id, challengeId: ch.id } }) : 0;
      return { t, today, week, done, total: ch?.itemIds.length ?? 10 };
    }),
  );

  return (
    <>
      <Nav name={u.name} level={u.level} />
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 pb-16 pt-4">
        <h1 className="font-display text-3xl font-bold">Takım</h1>

        {data.map(({ t, today, week, done, total }) => (
          <section key={t.id} className="note flex flex-col gap-6 p-6" style={{ "--lv": "var(--pen)" } as React.CSSProperties}>
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="font-display text-2xl font-bold">{t.name}</h2>
              <p className="text-sm text-muted">
                Davet kodu <code className="rounded bg-desk px-2 py-0.5 font-bold text-ink select-all">{t.code}</code>
              </p>
              <form action={leaveTeam.bind(null, t.id)} className="ml-auto">
                <button className="text-sm text-muted hover:text-bad">Ayrıl</button>
              </form>
            </div>
            <div>
              <p className="mb-3 text-sm text-muted">Herkese bugün aynı 10 kelime. Hızlı ve doğru cevap daha çok puan.</p>
              <Challenge teamId={t.id} done={done} total={total} />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Board rows={today} me={u.id} title="Bugün" />
              <Board rows={week} me={u.id} title="Son 7 gün" />
            </div>
          </section>
        ))}

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-3 font-bold">{teams.length ? "Başka bir takıma katıl" : "Takıma katıl"}</h2>
            <ActionForm action={joinTeam} submit="Katıl">
              <Field label="Davet kodu" name="code" required maxLength={6} autoComplete="off" className="w-full rounded-xl border-2 border-line bg-paper px-4 py-2.5 uppercase outline-none focus:border-pen" />
            </ActionForm>
          </div>
          <div>
            <h2 className="mb-3 font-bold">Yeni takım kur</h2>
            <ActionForm action={createTeam} submit="Takım kur">
              <Field label="Takım adı" name="name" required maxLength={40} placeholder="Ör. Muhasebe" />
            </ActionForm>
          </div>
        </div>
        <p className="text-sm text-muted">Puanlar: kendi kartlarından ve takım yarışmasından gelir. Zamanı gelmeden yapılan tekrarlar puan getirmez.</p>
      </main>
    </>
  );
}
