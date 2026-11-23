import { fsrs, createEmptyCard, Rating, State, type Card } from "ts-fsrs";

const scheduler = fsrs();

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type LevelName = (typeof LEVELS)[number];

/** An item counts as mastered once FSRS expects it to survive this many days. */
export const MASTERED_STABILITY = 5;
/** Share of a level's items that must be mastered before the next level opens. */
export const GATE_RATIO = 0.9;

export function fromJson(j: unknown): Card {
  const c = j as Card & { due: string; last_review?: string };
  return { ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined };
}

/** Correctness + answer time -> FSRS rating. A brand-new item can't jump straight to "Easy". */
export function rate(card: Card | null, correct: boolean, ms: number, now = new Date()): Card {
  const c = card ?? createEmptyCard(now);
  let rating = !correct ? Rating.Again : ms < 4000 ? Rating.Easy : ms < 12000 ? Rating.Good : Rating.Hard;
  if (c.state === State.New && rating === Rating.Easy) rating = Rating.Good;
  return scheduler.next(c, now, rating).card;
}

export const isMastered = (state: number, stability: number) =>
  state === State.Review && stability >= MASTERED_STABILITY;

/** Strict gate: every item seen AND >= 90% mastered. */
export const levelComplete = (total: number, introduced: number, mastered: number) =>
  total > 0 && introduced >= total && mastered >= Math.ceil(total * GATE_RATIO);

export const points = (correct: boolean, ms: number) =>
  correct ? 10 + (ms < 3000 ? 5 : ms < 6000 ? 2 : 0) : 0;

/** Consecutive days ending today (or yesterday, so the streak isn't "lost" before you study today). */
export function streak(daysDesc: string[], today: string) {
  const set = new Set(daysDesc);
  const d = new Date(today + "T12:00:00Z");
  if (!set.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(d.toISOString().slice(0, 10))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

/** Lenient compare for typed/selected answers. */
export const normalize = (s: string) =>
  // i/ı/İ folded together so neither English nor Turkish casing breaks a match
  s.toLowerCase().replace(/̇/g, "").replace(/ı/g, "i").replace(/[.,!?'’"]/g, "").replace(/\s+/g, " ").trim();
