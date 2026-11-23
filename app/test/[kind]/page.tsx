import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { TESTS, testQuizzes, testStatus, type TestKind } from "@/lib/learn";
import { formatInterval } from "@/lib/srs";
import { Nav } from "@/components/Nav";
import { TestRunner } from "@/components/TestRunner";

export default async function TestPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!(kind in TESTS)) notFound();
  const k = kind as TestKind;
  const u = await requireUser();
  const quizzes = await testQuizzes(u.id, k, u.sound);
  const status = quizzes ? null : (await testStatus(u.id))[k];

  return (
    <>
      <Nav name={u.name} level={u.level} />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-4">
        {quizzes ? (
          <TestRunner kind={k} label={TESTS[k].label} quizzes={quizzes} sound={u.sound} />
        ) : (
          <div className="note px-6 py-10 text-center" style={{ "--lv": "var(--line)" } as React.CSSProperties}>
            <h1 className="font-display text-2xl font-bold">{TESTS[k].label} şu an hazır değil</h1>
            <p className="mt-3 text-muted">
              {status!.nextInMs > 0
                ? `Bu testi yakın zamanda yaptın. ${formatInterval(status!.nextInMs)} sonra tekrar açılacak.`
                : k === "month"
                  ? `Aylık test, 7–30 gün önce çalıştığın kartları sorar; en az 5 tane olmalı (şu an ${status!.poolSize}). Haftalık test son 7 günü kapsar.`
                  : `Test için son 7 günde en az 5 kart çalışmış olman gerekiyor (şu an ${status!.poolSize}).`}
            </p>
            <Link href="/learn" className="mt-6 inline-block rounded-xl bg-pen px-6 py-3 font-bold text-pen-ink">Öğrenmeye dön</Link>
          </div>
        )}
      </main>
    </>
  );
}
