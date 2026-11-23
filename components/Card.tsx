"use client";

import { useEffect, useRef, useState } from "react";
import { answerChallenge, checkAnswer, commitAnswer } from "@/app/actions";
import type { Grade } from "@/lib/srs";
import type { AnswerResult, ItemView, Quiz } from "@/lib/learn";

const TYPE_LABEL: Record<string, string> = {
  WORD: "kelime",
  CHUNK: "kalıp",
  PHRASAL: "phrasal verb",
  SENTENCE: "cümle kalıbı",
  COLLOCATION: "collocation",
};
// English-only questions keep the learner inside English (immersion); Turkish ones are the translation backup.
const QUESTION: Record<Quiz["mode"], string> = {
  pic_en: "What's this?",
  simple_en: "Which one is it?",
  listen_en: "What did you hear?",
  blank: "Fill the gap.",
  produce: "Use it in your own sentence.",
  en_tr: "Türkçesi ne?",
  tr_en: "İngilizcesi ne?",
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

function Picture({ image, emoji, tall }: { image?: string | null; emoji?: string | null; tall?: boolean }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element -- small local webp, PiP window has no next/image loader
    <img src={image} alt="" className={`aspect-[4/3] w-full rounded-xl object-cover ${tall ? "max-h-60" : "max-h-48"}`} />
  ) : (
    <div className="grid h-24 place-items-center text-6xl" aria-hidden>{emoji ?? "💬"}</div>
  );
}

/**
 * Full item. `immersive` = Rosetta Stone style first meeting: picture + sound + simple English,
 * Turkish only on request.
 */
export function ItemFace({ item, immersive }: { item: ItemView; immersive?: boolean }) {
  const [showTr, setShowTr] = useState(!immersive);
  return (
    <div className="flex flex-col gap-4">
      <Picture image={item.image} emoji={item.emoji} tall={immersive} />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-3xl leading-tight font-bold break-words sm:text-4xl">{item.en}</p>
          <p className="mt-1 text-sm text-muted">
            {[item.ipa, item.pos ?? TYPE_LABEL[item.type]].filter(Boolean).join("  ")}
          </p>
        </div>
        <SpeakButton text={item.en} />
      </div>
      {item.simple && <p className="text-lg leading-snug">{item.simple}</p>}
      <div className="rounded-xl bg-desk px-4 py-3">
        <div className="flex items-start gap-2">
          <p className="flex-1 leading-relaxed">{item.example}</p>
          <SpeakButton text={item.example} />
        </div>
        {showTr && <p className="mt-1 text-sm text-muted">{item.exampleTr}</p>}
      </div>
      {showTr ? (
        <>
          <p className="text-xl font-bold">{item.tr}</p>
          {item.note && <p className="text-sm text-muted">💡 {item.note}</p>}
        </>
      ) : (
        <button type="button" onClick={() => setShowTr(true)} className="self-start text-sm text-muted underline decoration-dotted hover:text-ink">
          Anlamadım, Türkçesini göster
        </button>
      )}
    </div>
  );
}

type Stage = "learn" | "ask" | "reveal";

const GRADES: { g: Grade; label: string; cls: string }[] = [
  { g: 1, label: "Tekrar", cls: "text-bad" },
  { g: 2, label: "Zor", cls: "text-muted" },
  { g: 3, label: "İyi", cls: "text-good" },
  { g: 4, label: "Kolay", cls: "text-pen" },
];

/** Anki's four buttons, each showing when you'll see the card again. */
function GradeButtons({ intervals, suggested, correct, busy, onGrade }: {
  intervals: Record<Grade, string>; suggested: Grade; correct: boolean; busy: boolean; onGrade: (g: Grade) => void;
}) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-sm text-muted">
        {correct ? "Ne kadar kolaydı? Kart buna göre tekrar gelecek." : "Yanlış cevap: kart kısa süre sonra tekrar gelecek."}
      </p>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {GRADES.map(({ g, label, cls }) => {
          const off = busy || (!correct && g !== 1);
          return (
            <button
              key={g}
              autoFocus={g === suggested}
              disabled={off}
              onClick={() => onGrade(g)}
              className={`flex flex-col items-center rounded-xl border-2 px-1 py-2.5 disabled:opacity-30 ${
                g === suggested ? "border-pen bg-pen/10" : "border-line enabled:hover:border-pen"
              }`}
            >
              <span className={`text-sm font-bold sm:text-base ${cls}`}>{label}</span>
              <span className="text-xs text-muted tabular-nums">{intervals[g]}</span>
              <kbd className="mt-1 hidden text-[10px] text-muted sm:block">{g}</kbd>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type SpeechRec = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; start(): void };

/** Feynman step: write or say your own sentence with the item. */
function ProduceInput({ onSubmit, busy }: { onSubmit: (s: string) => void; busy: boolean }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const Rec = typeof window !== "undefined"
    ? ((window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition ??
       (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition)
    : undefined;

  function listen() {
    if (!Rec) return;
    const r = new Rec();
    r.lang = "en-GB";
    r.interimResults = false;
    r.onresult = (e) => setText(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => { e.preventDefault(); if (text.trim()) onSubmit(text); }}
    >
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) onSubmit(text); } }}
        rows={2}
        placeholder="I…"
        className="w-full resize-none rounded-xl border-2 border-line bg-paper px-4 py-3 outline-none focus:border-pen"
      />
      <div className="flex gap-2">
        {Rec && (
          <button type="button" onClick={listen} className="rounded-xl border-2 border-line px-4 py-2.5 hover:border-pen">
            {listening ? "Dinliyorum…" : "🎤 Sesli söyle"}
          </button>
        )}
        <button disabled={busy || !text.trim()} className="flex-1 rounded-xl bg-pen py-2.5 font-bold text-pen-ink disabled:opacity-50">
          Kontrol et
        </button>
      </div>
      <p className="text-xs text-muted">Feynman: bir şeyi gerçekten bildiğini, onu kendi cümlenle kullanabildiğinde anlarsın.</p>
    </form>
  );
}

export function QuizCard({
  quiz,
  challengeId,
  autoSpeak = false,
  onDone,
}: {
  quiz: Quiz;
  challengeId?: string;
  /** off when the user disabled sound (silent office PC) */
  autoSpeak?: boolean;
  onDone: (r: AnswerResult, g?: Grade) => void;
}) {
  const [stage, setStage] = useState<Stage>(quiz.learn ? "learn" : "ask");
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const askedAt = useRef(0);
  const tookMs = useRef(0);
  const root = useRef<HTMLDivElement>(null);

  // Hear it first: like a child, sound before spelling.
  useEffect(() => {
    if (stage === "learn" && quiz.learn && autoSpeak) speak(quiz.learn.en);
    if (stage !== "ask") return;
    askedAt.current = performance.now();
    if (quiz.mode === "listen_en" && quiz.speak && autoSpeak) speak(quiz.speak);
  }, [stage, quiz, autoSpeak]);

  async function choose(opt: string) {
    if (busy || stage !== "ask") return;
    setBusy(true);
    setPicked(opt);
    try {
      const ms = Math.round(performance.now() - askedAt.current);
      tookMs.current = ms;
      const r = challengeId
        ? await answerChallenge(challengeId, quiz.itemId, quiz.mode, opt, ms)
        : await checkAnswer(quiz.itemId, quiz.mode, opt, ms);
      setResult(r);
      setStage("reveal");
    } finally {
      setBusy(false);
    }
  }

  // Anki step: the learner grades the card; the schedule is saved only now.
  async function rateCard(g: Grade) {
    if (!result || busy) return;
    if (!result.correct && g !== 1) return;
    setBusy(true);
    try {
      const c = await commitAnswer(quiz.itemId, quiz.mode, picked ?? "", tookMs.current, g);
      onDone({ ...result, points: c.points }, g);
    } finally {
      setBusy(false);
    }
  }

  // Keyboard: 1-4 answer (or grade after reveal), Space/Enter continue. Bound to the card's own window so it also works in the PiP window.
  useEffect(() => {
    const win = root.current?.ownerDocument.defaultView;
    if (!win) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (stage === "ask" && /^[1-4]$/.test(e.key) && quiz.options.length) choose(quiz.options[Number(e.key) - 1]);
      else if ((e.key === " " || e.key === "Enter") && stage === "learn") { e.preventDefault(); setStage("ask"); }
      else if (stage === "reveal" && result?.intervals && /^[1-4]$/.test(e.key)) rateCard(Number(e.key) as Grade);
      else if ((e.key === " " || e.key === "Enter") && stage === "reveal" && result) {
        e.preventDefault();
        if (result.intervals) rateCard(result.suggested ?? 3);
        else onDone(result);
      }
    };
    win.addEventListener("keydown", onKey);
    return () => win.removeEventListener("keydown", onKey);
  });

  return (
    <div ref={root} className="note pop p-5 sm:p-7" style={{ "--lv": `var(--${quiz.level})` } as React.CSSProperties}>
      {stage === "learn" && quiz.learn && (
        <>
          <p className="mb-4 text-sm font-bold text-pen">New</p>
          <ItemFace item={quiz.learn} immersive />
          <button onClick={() => setStage("ask")} className="mt-6 w-full rounded-xl bg-pen py-3 font-bold text-pen-ink">
            Got it
          </button>
        </>
      )}

      {stage !== "learn" && (
        <>
          <p className="text-sm text-muted">{QUESTION[quiz.mode]}</p>
          {stage === "ask" && (
            <div className="my-5 flex min-h-24 flex-col items-center justify-center gap-3 text-center">
              {quiz.mode === "listen_en" && <SpeakButton text={quiz.speak!} big />}
              {quiz.mode === "pic_en" && <Picture image={quiz.image} emoji={quiz.emoji} tall />}
              {quiz.mode === "produce" && (
                <>
                  {(quiz.image || quiz.emoji) && <Picture image={quiz.image} emoji={quiz.emoji} />}
                  <p className="font-display text-4xl font-bold">{quiz.prompt}</p>
                </>
              )}
              {quiz.mode === "simple_en" && <p className="text-xl leading-snug">&ldquo;{quiz.prompt}&rdquo;</p>}
              {(quiz.mode === "en_tr" || quiz.mode === "tr_en" || quiz.mode === "blank") && (
                <p className={`font-display font-bold break-words ${quiz.mode === "blank" ? "text-2xl leading-snug" : "text-4xl"}`}>
                  {quiz.prompt}
                </p>
              )}
            </div>
          )}

          {quiz.mode === "produce" ? (
            stage === "ask" ? (
              <ProduceInput onSubmit={choose} busy={busy} />
            ) : (
              <p className={`mt-3 rounded-xl border-2 px-4 py-3 ${result?.correct ? "border-good" : "border-bad"}`}>{picked}</p>
            )
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
          )}
        </>
      )}

      {stage === "reveal" && result && (
        <div className="pop mt-6 border-t border-line pt-5">
          <p className={`mb-4 font-bold ${result.correct ? "text-good" : "text-bad"}`}>
            {quiz.mode === "produce"
              ? result.correct ? `Great sentence!  +${result.points}` : `Cümlende "${result.item.en}" geçmeli. Örnek: ${result.expected}`
              : result.correct ? `Correct${result.points ? `  +${result.points}` : ""}` : `Doğrusu: ${result.expected}`}
          </p>
          <ItemFace item={result.item} />
          {result.intervals ? (
            <GradeButtons intervals={result.intervals} suggested={result.suggested ?? 3} correct={result.correct} busy={busy} onGrade={rateCard} />
          ) : (
            <button autoFocus onClick={() => onDone(result)} className="mt-6 w-full rounded-xl bg-pen py-3 font-bold text-pen-ink">
              Devam
            </button>
          )}
        </div>
      )}
    </div>
  );
}
