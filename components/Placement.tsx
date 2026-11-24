"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { answerPlacement, getPlacement, startAtLevel } from "@/app/actions";
import type { Quiz } from "@/lib/learn";
import { LEVELS, type LevelName } from "@/lib/srs";

const PER_LEVEL = 6, PASS = 5; // keep in sync with PLACEMENT in lib/learn.ts

type Done = { level: LevelName; ok: number; n: number };

export function Placement({ current }: { current: LevelName }) {
  const [phase, setPhase] = useState<"intro" | "quiz" | "result">("intro");
  const [lv, setLv] = useState(0);
  const [qs, setQs] = useState<Quiz[]>([]);
  const [qi, setQi] = useState(0);
  const [ok, setOk] = useState(0);
  const [picked, setPicked] = useState<{ choice: string; correct: boolean; expected: string } | null>(null);
  const [done, setDone] = useState<Done[]>([]);
  const [result, setResult] = useState<LevelName>("A1");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  async function load(i: number) {
    setBusy(true);
    setQs(await getPlacement(LEVELS[i]));
    setLv(i); setQi(0); setOk(0); setPicked(null); setPhase("quiz"); setBusy(false);
  }

  function finishLevel(okCount: number, asked: number) {
    const d = [...done, { level: LEVELS[lv], ok: okCount, n: asked }];
    setDone(d);
    const passed = okCount >= PASS;
    if (passed && lv < LEVELS.length - 1) return load(lv + 1);
    setResult(passed ? LEVELS[LEVELS.length - 1] : LEVELS[lv]);
    setPhase("result");
  }

  async function pick(choice: string) {
    if (lock.current || picked) return;
    lock.current = true;
    const q = qs[qi];
    const r = await answerPlacement(q.itemId, choice || "-"); // "Bilmiyorum" = a choice that never matches
    lock.current = false;
    setPicked({ choice, ...r });
    const okNow = ok + (r.correct ? 1 : 0), asked = qi + 1, wrong = asked - okNow;
    setOk(okNow);
    setTimeout(() => {
      // stop early once the level can no longer be passed (or is already passed with all asked)
      if (wrong > PER_LEVEL - PASS || asked >= qs.length) finishLevel(okNow, asked);
      else { setQi(asked); setPicked(null); }
    }, r.correct ? 600 : 1300);
  }

  useEffect(() => {
    if (phase !== "quiz") return;
    const q = qs[qi];
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (q && n >= 1 && n <= q.options.length) pick(q.options[n - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const lvStyle = (l: string) => ({ "--lv": `var(--${l})` }) as React.CSSProperties;

  if (phase === "intro")
    return (
      <div className="note p-6 sm:p-8" style={lvStyle("A1")}>
        <h1 className="font-display text-3xl font-bold">Seviyeni bulalım</h1>
        <p className="mt-3 text-lg leading-snug">
          İngilizcen biraz varsa A1&apos;in 500 kartıyla vakit kaybetme. Her seviyeden 6 kısa soru: İngilizce ifadeyi gör, Türkçesini seç.
          5&apos;ini bilirsen bir üst seviyeye geçeriz. Yaklaşık 3–5 dakika.
        </p>
        <p className="mt-3 text-muted">
          Bilmiyorsan tahmin etme, &ldquo;Bilmiyorum&rdquo; de. Geçtiğin seviyelerin kartları &ldquo;biliniyor&rdquo; sayılır ama tamamen
          kaybolmaz: önümüzdeki aylarda ara ara kontrol için karşına çıkar.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => load(0)} disabled={busy} className="rounded-xl bg-pen px-6 py-3 font-bold text-pen-ink disabled:opacity-60">
            {busy ? "Hazırlanıyor…" : "Teste başla"}
          </button>
          <Link href="/learn" className="rounded-xl border-2 border-line px-6 py-3 font-bold hover:border-pen">
            Atla, {current}&apos;den başla
          </Link>
        </div>
      </div>
    );

  if (phase === "result") {
    const up = LEVELS.indexOf(result) > LEVELS.indexOf(current);
    return (
      <div className="note p-6 sm:p-8" style={lvStyle(result)}>
        <p className="text-muted">Sonuç</p>
        <h1 className="font-display text-4xl font-bold">
          Seviyen: <span className="lv-chip rounded-full px-3">{result}</span>
        </h1>
        <ul className="mt-5 flex flex-wrap gap-2 text-sm">
          {done.map((d) => (
            <li key={d.level} className="rounded-full bg-desk px-3 py-1">
              {d.ok >= PASS ? "✓" : "✗"} {d.level} {d.ok}/{d.n}
            </li>
          ))}
        </ul>
        <p className="mt-5 leading-snug">
          {up
            ? `${LEVELS.slice(0, LEVELS.indexOf(result)).join(", ")} kartlarını biliyor sayacağız; önümüzdeki aylarda ara ara kontrol için gelecekler. Yeni kartlar ${result}'den başlar.`
            : result === current
              ? `Tam yerindesin, ${current}'den devam.`
              : `Şu an ${current} seviyesindesin; seviyeni geri düşürmüyoruz, kaldığın yerden devam.`}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {up ? (
            <>
              <form action={startAtLevel.bind(null, result)}>
                <button className="rounded-xl bg-pen px-6 py-3 font-bold text-pen-ink">{result}&apos;den başla</button>
              </form>
              <Link href="/learn" className="rounded-xl border-2 border-line px-6 py-3 font-bold hover:border-pen">
                Hayır, {current}&apos;den başlayayım
              </Link>
            </>
          ) : (
            <Link href="/learn" className="rounded-xl bg-pen px-6 py-3 font-bold text-pen-ink">Öğrenmeye başla</Link>
          )}
        </div>
      </div>
    );
  }

  const q = qs[qi];
  if (!q) return null;
  return (
    <div className="note p-5 sm:p-7" style={lvStyle(LEVELS[lv])}>
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="lv-chip rounded-full px-2.5 py-0.5 text-xs font-bold">{LEVELS[lv]}</span>
        <span>Soru {qi + 1}/{PER_LEVEL}</span>
        <span className="ml-auto">{ok} doğru</span>
      </div>
      <div className="mt-3 flex h-1.5 gap-1" aria-hidden>
        {LEVELS.map((l, i) => (
          <div key={l} className={`flex-1 rounded-full ${i < lv ? "bg-good" : i === lv ? "bg-pen" : "bg-line"}`} />
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">Türkçesi ne?</p>
      <p className="font-display text-3xl font-bold break-words sm:text-4xl">{q.prompt}</p>
      <div className="mt-6 grid gap-2">
        {q.options.map((o, i) => {
          const state = !picked ? "" : o === picked.expected ? "border-good bg-good/10" : o === picked.choice ? "border-bad bg-bad/10" : "opacity-50";
          return (
            <button
              key={o}
              onClick={() => pick(o)}
              disabled={!!picked}
              className={`flex items-center gap-3 rounded-xl border-2 border-line bg-paper px-4 py-3 text-left text-ink hover:border-pen disabled:text-ink ${state}`}
            >
              <span className="text-xs text-muted">{i + 1}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      <button onClick={() => pick("")} disabled={!!picked} className="mt-4 text-sm text-muted underline decoration-dotted hover:text-ink">
        Bilmiyorum
      </button>
    </div>
  );
}
