import { fsrs, generatorParameters, createEmptyCard, Rating, State, type Card } from "ts-fsrs";

/**
 * No card disappears for longer than this, whatever you press. Even "Easy" words get forgotten if you never meet
 * them; plain FSRS would push a twice-"Easy" card past 2 months, then years.
 */
export const MAX_INTERVAL_DAYS = 60;
const scheduler = fsrs(generatorParameters({ maximum_interval: MAX_INTERVAL_DAYS }));

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

export type Grade = 1 | 2 | 3 | 4; // Anki: Again / Hard / Good / Easy

/** Anki-style: the learner rates themselves. A wrong answer can only be "Again". */
export function grade(card: Card | null, g: Grade, correct: boolean, now = new Date()): Card {
  const c = card ?? createEmptyCard(now);
  const rating = (correct ? g : Rating.Again) as Parameters<typeof scheduler.next>[2];
  return scheduler.next(c, now, rating).card;
}

/** Next due time for each of the 4 buttons (shown under them, like Anki). */
export function previews(card: Card | null, now = new Date()): Record<Grade, number> {
  const c = card ?? createEmptyCard(now);
  const r = scheduler.repeat(c, now);
  return {
    1: r[Rating.Again].card.due.getTime() - now.getTime(),
    2: r[Rating.Hard].card.due.getTime() - now.getTime(),
    3: r[Rating.Good].card.due.getTime() - now.getTime(),
    4: r[Rating.Easy].card.due.getTime() - now.getTime(),
  };
}

/** 90_000 -> "2 dk", 3 days -> "3 gün" */
export function formatInterval(ms: number) {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m} dk`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} sa`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} gün`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} ay`;
  return `${(d / 365).toFixed(1).replace(/\.0$/, "")} yıl`;
}

export const isMastered =(state: number, stability: number) =>
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

/**
 * Feynman "use it yourself" check: is `sentence` a real sentence (3+ words) that uses the item?
 * Each word of the item must appear, allowing inflections (go -> goes/going, catch -> caught is NOT caught; fine).
 */
export function usesItem(sentence: string, item: string) {
  const s = normalize(sentence).split(" ").filter(Boolean);
  if (s.length < 3) return false;
  const words = normalize(item).split(" ").filter((w) => w && !["someone", "something", "sb", "sth", "your", "a", "the"].includes(w));
  return words.every((w) => {
    const stem = w.length > 4 ? w.slice(0, w.length - 2) : w;
    return s.some((t) => t === w || t.startsWith(stem));
  });
}

/**
 * Fill-the-gap: replace `phrase` inside `text` with a blank, matching whole words only
 * (works for phrases that start/end with punctuation, e.g. "No way!"). null if it isn't there.
 */
export function blankIn(text: string, phrase: string, blank = "_____") {
  const p = phrase.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![A-Za-z'])${p}(?![A-Za-z])`, "i");
  return re.test(text) ? text.replace(re, blank) : null;
}

/** Dialogue quiz: the lines with the item blanked in the first line that contains it. */
export function blankDialogue(lines: string[], phrase: string) {
  const i = lines.findIndex((l) => blankIn(l, phrase) !== null);
  return i < 0 ? null : lines.map((l, j) => (j === i ? blankIn(l, phrase)! : l));
}

/** Lenient compare for typed/selected answers. */
export const normalize = (s: string) =>
  // i/ı/İ folded together so neither English nor Turkish casing breaks a match
  s.toLowerCase().replace(/̇/g, "").replace(/ı/g, "i").replace(/[.,!?'’"]/g, "").replace(/\s+/g, " ").trim();
