"use client";

import { useState } from "react";
import Link from "next/link";
import type { Quiz, TestKind } from "@/lib/learn";
import { QuizCard } from "./Card";

/** Runs a weekly/monthly review test: every card once, normal Anki grading, score at the end. */
export function TestRunner({ kind, label, quizzes, sound }: { kind: TestKind; label: string; quizzes: Quiz[]; sound: boolean }) {
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(0);
  const [pts, setPts] = useState(0);

  if (i >= quizzes.length) {
    const pct = Math.round((ok / quizzes.length) * 100);
    return (
      <div className="note pop flex flex-col items-center gap-3 px-6 py-10 text-center" style={{ "--lv": "var(--pen)" } as React.CSSProperties}>
        <p className="text-sm text-muted">{label} bitti</p>
        <p className="font-display text-6xl font-bold">{ok}/{quizzes.length}</p>
        <p className="text-muted">%{pct} doğru, {pts} puan</p>
        <p className="max-w-sm text-sm text-muted">
          {pct >= 80 ? "Harika, bu kelimeler yerinde duruyor." : "Yanlış yaptıkların tekrar \"öğreniliyor\" listesine döndü; önümüzdeki günlerde sık sık gelecekler."}
        </p>
        <Link href="/learn" className="mt-2 rounded-xl bg-pen px-6 py-3 font-bold text-pen-ink">Öğrenmeye dön</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-sm text-muted">
        <span>{label} {i + 1}/{quizzes.length}</span>
        <div className="h-1.5 flex-1 rounded-full bg-line">
          <div className="h-1.5 rounded-full bg-pen" style={{ width: `${(i / quizzes.length) * 100}%` }} />
        </div>
        <span>{ok} doğru</span>
      </div>
      <QuizCard
        key={i}
        quiz={quizzes[i]}
        test={kind}
        autoSpeak={sound}
        onDone={(r) => {
          if (r?.correct) setOk((n) => n + 1);
          setPts((p) => p + (r?.points ?? 0));
          setI((n) => n + 1);
        }}
      />
    </div>
  );
}
