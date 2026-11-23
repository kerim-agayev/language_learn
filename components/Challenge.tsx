"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getChallenge } from "@/app/actions";
import type { Quiz } from "@/lib/learn";
import { QuizCard } from "./Card";

export function Challenge({ teamId, done, total }: { teamId: string; done: number; total: number }) {
  const router = useRouter();
  const [run, setRun] = useState<{ id: string; quizzes: Quiz[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);

  if (run?.quizzes.length) {
    const q = run.quizzes[0];
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">Yarışma {total - run.quizzes.length + 1}/{total}, bu turda {score} puan</p>
        <QuizCard
          key={q.itemId}
          quiz={q}
          challengeId={run.id}
          onDone={(r) => {
            setScore((s) => s + (r?.points ?? 0));
            const rest = run.quizzes.slice(1);
            setRun({ ...run, quizzes: rest });
            if (!rest.length) router.refresh();
          }}
        />
      </div>
    );
  }

  if (done >= total && total > 0) return <p className="text-sm text-good">Bugünün yarışmasını bitirdin. Yarın yeni 10 kelime.</p>;

  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const c = await getChallenge(teamId);
        setRun({ id: c.challengeId, quizzes: c.quizzes });
        setLoading(false);
      }}
      className="self-start rounded-xl bg-pen px-5 py-2.5 font-bold text-pen-ink disabled:opacity-60"
    >
      {loading ? "Hazırlanıyor…" : done ? `Yarışmaya devam et (${done}/${total || 10})` : "Bugünün yarışmasını başlat"}
    </button>
  );
}
