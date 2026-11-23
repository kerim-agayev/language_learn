"use client";

import { useEffect, useRef, useState } from "react";
import { submitAnswer } from "@/app/actions";
import type { AnswerResult, ItemView, Quiz } from "@/lib/learn";

const TYPE_LABEL: Record<string, string> = { WORD: "kelime", CHUNK: "kalıp", PHRASAL: "phrasal verb", SENTENCE: "cümle kalıbı" };
const QUESTION: Record<Quiz["mode"], string> = {
  en_tr: "Türkçesi ne?",
  tr_en: "İngilizcesi ne?",
  listen: "Ne duydun?",
  blank: "Boşluğa ne gelir?",
};

export function speak(text: string) {
  try {
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = 0.92;
    u.voice = s.getVoices().find((v) => v.lang === "en-GB") ?? s.getVoices().find((v) => v.lang.startsWith("en")) ?? null;
    s.speak(u);
  } catch {}
}

function SpeakButton({ text, big }: { text: string; big?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      aria-label={`Dinle: ${text}`}
      className={`grid shrink-0 place-items-center rounded-full bg-desk text-ink hover:bg-pen hover:text-pen-ink ${big ? "size-20" : "size-9"}`}
    >
      <svg viewBox="0 0 24 24" className={big ? "size-9" : "size-4"} fill="currentColor"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" /></svg>
    </button>
  );
}

/** Full item: picture, word, pronunciation, meaning, example. */
export function ItemFace({ item }: { item: ItemView }) {
  return (
    <div className="flex flex-col gap-4">
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- small local webp, PiP window has no next/image loader
        <img src={item.image} alt="" className="aspect-[4/3] max-h-48 w-full rounded-xl object-cover" />
      ) : (
        <div className="grid h-24 place-items-center text-6xl" aria-hidden>{item.emoji ?? "💬"}</div>
      )}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-3xl leading-tight font-bold break-words sm:text-4xl">{item.en}</p>
          <p className="mt-1 text-sm text-muted">
            {[item.ipa, item.pos ?? TYPE_LABEL[item.type]].filter(Boolean).join("  ")}
          </p>
        </div>
        <SpeakButton text={item.en} />
      </div>
      <p className="text-xl font-bold">{item.tr}</p>
      <div className="rounded-xl bg-desk px-4 py-3">
        <div className="flex items-start gap-2">
          <p className="flex-1 leading-relaxed">{item.example}</p>
          <SpeakButton text={item.example} />
        </div>
        <p className="mt-1 text-sm text-muted">{item.exampleTr}</p>
      </div>
      {item.note && <p className="text-sm text-muted">💡 {item.note}</p>}
    </div>
  );
}

type Stage = "learn" | "ask" | "reveal";

export function QuizCard({
  quiz,
  challengeId,
  onDone,
}: {
  quiz: Quiz;
  challengeId?: string;
  onDone: (r: AnswerResult) => void;
}) {
  const [stage, setStage] = useState<Stage>(quiz.learn ? "learn" : "ask");
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const askedAt = useRef(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stage !== "ask") return;
    askedAt.current = performance.now();
    if (quiz.mode === "listen" && quiz.speak) speak(quiz.speak);
  }, [stage, quiz]);

  async function choose(opt: string) {
    if (busy || stage !== "ask") return;
    setBusy(true);
    setPicked(opt);
    try {
      const r = await submitAnswer(quiz.itemId, quiz.mode, opt, Math.round(performance.now() - askedAt.current), challengeId);
      setResult(r);
      setStage("reveal");
    } finally {
      setBusy(false);
    }
  }

  // Keyboard: 1-4 answer, Space/Enter continue. Bound to the card's own window so it also works in the PiP window.
  useEffect(() => {
    const win = root.current?.ownerDocument.defaultView;
    if (!win) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (stage === "ask" && /^[1-4]$/.test(e.key)) choose(quiz.options[Number(e.key) - 1]);
      else if ((e.key === " " || e.key === "Enter") && stage === "learn") { e.preventDefault(); setStage("ask"); }
      else if ((e.key === " " || e.key === "Enter") && stage === "reveal" && result) { e.preventDefault(); onDone(result); }
    };
    win.addEventListener("keydown", onKey);
    return () => win.removeEventListener("keydown", onKey);
  });

  return (
    <div ref={root} className="note pop p-5 sm:p-7" style={{ "--lv": `var(--${quiz.level})` } as React.CSSProperties}>
      {stage === "learn" && quiz.learn && (
        <>
          <p className="mb-4 text-sm font-bold text-pen">Yeni</p>
          <ItemFace item={quiz.learn} />
          <button onClick={() => setStage("ask")} className="mt-6 w-full rounded-xl bg-pen py-3 font-bold text-pen-ink">
            Öğrendim, sor
          </button>
        </>
      )}

      {stage !== "learn" && (
        <>
          <p className="text-sm text-muted">{QUESTION[quiz.mode]}</p>
          <div className={`my-5 min-h-24 items-center justify-center text-center ${stage === "reveal" ? "hidden" : "flex"}`}>
            {quiz.mode === "listen" ? (
              <SpeakButton text={quiz.speak!} big />
            ) : (
              <p className={`font-display font-bold break-words ${quiz.mode === "blank" ? "text-2xl leading-snug" : "text-4xl"}`}>
                {quiz.prompt}
              </p>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {quiz.options.map((o, i) => {
              const isAnswer = result && o === result.expected;
              const isWrongPick = result && o === picked && !result.correct;
              return (
                <button
                  key={o}
                  disabled={stage !== "ask" || busy}
                  onClick={() => choose(o)}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-ink transition-colors disabled:text-ink ${
                    isAnswer ? "border-good bg-good/10" : isWrongPick ? "border-bad bg-bad/10" : "border-line enabled:hover:border-pen"
                  } ${(o === picked && busy) || (result && !isAnswer && !isWrongPick) ? "opacity-50" : ""}`}
                >
                  <kbd className="grid size-6 shrink-0 place-items-center rounded-md bg-desk text-xs text-muted">{i + 1}</kbd>
                  <span>{o}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {stage === "reveal" && result && (
        <div className="pop mt-6 border-t border-line pt-5">
          <p className={`mb-4 font-bold ${result.correct ? "text-good" : "text-bad"}`}>
            {result.correct ? `Doğru${result.points ? `  +${result.points}` : ""}` : `Doğrusu: ${result.expected}`}
          </p>
          <ItemFace item={result.item} />
          <button autoFocus onClick={() => onDone(result)} className="mt-6 w-full rounded-xl bg-pen py-3 font-bold text-pen-ink">
            Devam
          </button>
        </div>
      )}
    </div>
  );
}
