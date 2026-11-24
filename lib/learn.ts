import { State, createEmptyCard } from "ts-fsrs";
import { db, todayKey, TZ } from "./db";
import { LEVELS, MASTERED_STABILITY, levelComplete, grade, previews, formatInterval, fromJson, points, normalize, streak, usesItem, blankDialogue, placedCard, type Grade, type LevelName } from "./srs";
import type { Item } from "./generated/prisma/client";

/**
 * Immersion first (Rosetta Stone): pic_en / simple_en / listen_en / blank never show Turkish.
 * Feynman: produce = use the item in your own sentence. en_tr / tr_en are the translation backups.
 */
export type Mode = "pic_en" | "simple_en" | "listen_en" | "blank" | "dialog" | "produce" | "en_tr" | "tr_en";
export type ItemView = Omit<Item, "order" | "source">;
/** What the client gets. For reviews the answer is NOT included; it comes back from answer(). */
export type Quiz = {
  itemId: number;
  level: string;
  mode: Mode;
  prompt: string;
  speak?: string;
  image?: string | null;
  emoji?: string | null;
  options: string[]; // empty for "produce"
  lines?: string[]; // "dialog": the conversation with the item blanked
  learn?: ItemView; // only for brand-new items: show the card first
};

// ponytail: whole item table cached in memory for distractors (~1-5k rows). Restart after re-seeding.
let pool: Promise<Item[]> | null = null;
const allItems = () => (pool ??= db.item.findMany());

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const blankOut = (it: Item) => {
  const re = new RegExp(`\\b${escapeRe(it.en)}\\b`, "i");
  return re.test(it.example) ? it.example.replace(re, "_____") : null;
};

const expected = (it: Pick<Item, "en" | "tr" | "example">, mode: Mode) =>
  mode === "en_tr" ? it.tr : mode === "produce" ? it.example : it.en;

function view(it: Item): ItemView {
  const v: Partial<Item> = { ...it };
  delete v.order;
  delete v.source;
  return v as ItemView;
}

/** Which quiz to give. New items: immersion check (picture or simple English). Reviews: mostly English-only. */
export function pickMode(
  it: Pick<Item, "image" | "simple" | "type">,
  opts: { isNew: boolean; canBlank: boolean; strong: boolean; sound: boolean; canDialog?: boolean },
  rnd = Math.random,
): Mode {
  const english: Mode[] = opts.sound ? ["listen_en"] : []; // no listening quizzes on a silent desk
  if (it.image) english.push("pic_en", "pic_en");
  if (it.simple) english.push("simple_en", "simple_en");
  if (opts.canBlank) english.push("blank");
  if (opts.canDialog) english.push("dialog", "dialog", "dialog"); // real conversation context: favour it
  if (opts.isNew) return it.image ? "pic_en" : it.simple ? "simple_en" : "en_tr";
  if (opts.strong && rnd() < 0.3) return "produce"; // Feynman: once you know it, use it yourself
  const all: Mode[] = [...english, ...english, "en_tr", "tr_en"]; // ~80% immersion, ~20% translation
  return all[Math.floor(rnd() * all.length)];
}

async function buildQuiz(it: Item, isNew: boolean, forced?: Mode, strong = false, sound = true): Promise<Quiz> {
  const canBlank = it.type !== "SENTENCE" && it.type !== "CHUNK" && !!blankOut(it);
  const lines = blankDialogue(it.dialogue, it.en);
  const mode: Mode = forced ?? pickMode(it, { isNew, canBlank, strong, sound, canDialog: !!lines });
  const base = { itemId: it.id, level: it.level, mode, learn: isNew ? view(it) : undefined };

  if (mode === "produce")
    return { ...base, prompt: it.en, speak: it.en, image: it.image, emoji: it.emoji, options: [] };

  const answer = expected(it, mode);
  const items = await allItems();
  const near = items.filter((o) => o.type === it.type && o.id !== it.id);
  const sameLevel = near.filter((o) => o.level === it.level);
  const seen = new Set([normalize(answer)]);
  const distractors: string[] = [];
  for (const o of [...shuffle(sameLevel), ...shuffle(near)]) {
    const v = expected(o, mode);
    if (seen.has(normalize(v))) continue;
    seen.add(normalize(v));
    distractors.push(v);
    if (distractors.length === 3) break;
  }

  const prompt =
    mode === "en_tr" ? it.en
    : mode === "tr_en" ? it.tr
    : mode === "blank" ? blankOut(it)!
    : mode === "simple_en" ? (it.simple ?? it.tr)
    : "";
  return {
    ...base,
    prompt,
    speak: mode === "listen_en" || mode === "en_tr" ? it.en : undefined,
    image: mode === "pic_en" ? it.image : undefined,
    emoji: mode === "pic_en" ? it.emoji : undefined,
    options: shuffle([answer, ...distractors]),
    lines: mode === "dialog" ? lines! : undefined,
  };
}

/** Moves the user up while levels are complete. Empty levels are skipped. */
export async function syncLevel(userId: string, current: string): Promise<LevelName> {
  let idx = LEVELS.indexOf(current as LevelName);
  while (idx < LEVELS.length - 1) {
    const p = await levelProgress(userId, LEVELS[idx]);
    if (p.total > 0 && !levelComplete(p.total, p.introduced, p.mastered)) break;
    idx++;
  }
  if (LEVELS[idx] !== current) await db.user.update({ where: { id: userId }, data: { level: LEVELS[idx] } });
  return LEVELS[idx];
}

export async function levelProgress(userId: string, level: LevelName) {
  const [total, introduced, mastered] = await Promise.all([
    db.item.count({ where: { level } }),
    db.userItem.count({ where: { userId, item: { level } } }),
    db.userItem.count({
      where: { userId, item: { level }, state: State.Review, stability: { gte: MASTERED_STABILITY } },
    }),
  ]);
  return { level, total, introduced, mastered };
}

/** One micro-session: up to 3 due reviews, then at most 1 new item from the current level. */
export async function nextBatch(userId: string, level: string, sound = true): Promise<Quiz[]> {
  const lv = await syncLevel(userId, level);
  const now = new Date();
  const due = await db.userItem.findMany({
    where: { userId, due: { lte: now } },
    orderBy: { due: "asc" },
    take: 3,
    include: { item: true },
  });
  const picks: { item: Item; isNew: boolean; strong?: boolean }[] = due.map((d) => ({
    item: d.item,
    isNew: false,
    strong: d.state === State.Review, // graduated items may get the Feynman "use it yourself" step
  }));

  const fresh = await db.item.findFirst({ where: { level: lv, users: { none: { userId } } }, orderBy: { order: "asc" } });
  if (fresh) picks.push({ item: fresh, isNew: true });

  if (!picks.length) {
    // Level fully introduced, nothing due yet: practise the weakest items early (no points for these).
    const early = await db.userItem.findMany({
      where: { userId, OR: [{ state: { not: State.Review } }, { stability: { lt: MASTERED_STABILITY } }] },
      orderBy: { due: "asc" },
      take: 2,
      include: { item: true },
    });
    picks.push(...early.map((d) => ({ item: d.item, isNew: false })));
  }
  return Promise.all(picks.map((p) => buildQuiz(p.item, p.isNew, undefined, p.strong, sound)));
}

export type AnswerResult = {
  correct: boolean;
  expected: string;
  points: number;
  item: ItemView;
  /** Anki buttons: next interval per grade, and the grade we'd suggest. Absent for challenge answers. */
  intervals?: Record<Grade, string>;
  suggested?: Grade;
};

async function judge(itemId: number, mode: Mode, choice: string) {
  const item = await db.item.findUniqueOrThrow({ where: { id: itemId } });
  const exp = expected(item, mode);
  const correct = mode === "produce" ? usesItem(choice.slice(0, 300), item.en) : normalize(choice) === normalize(exp);
  return { item, exp, correct };
}

// Writing a sentence takes time, so "produce" is rewarded flat instead of by speed.
const answerPoints = (mode: Mode, correct: boolean, ms: number) =>
  mode === "produce" ? (correct ? 20 : 0) : points(correct, Math.max(0, Math.min(ms, 600_000)));

/** Step 1 of personal study: check the answer and show Anki buttons. Nothing is saved yet. */
export async function check(userId: string, itemId: number, mode: Mode, choice: string, ms: number): Promise<AnswerResult> {
  const { item, exp, correct } = await judge(itemId, mode, choice);
  const ui = await db.userItem.findUnique({ where: { userId_itemId: { userId, itemId } } });
  const card = ui ? fromJson(ui.card) : null;
  const p = previews(card);
  const intervals = { 1: formatInterval(p[1]), 2: formatInterval(p[2]), 3: formatInterval(p[3]), 4: formatInterval(p[4]) };
  const suggested: Grade = !correct ? 1 : mode === "produce" || !card ? 3 : ms < 4000 ? 4 : ms < 12000 ? 3 : 2;
  const early = !!ui && ui.due > new Date();
  return { correct, expected: exp, points: early ? 0 : answerPoints(mode, correct, ms), item: view(item), intervals, suggested };
}

/** Step 2: the learner picks Again/Hard/Good/Easy. The answer is re-judged here, so points can't be faked. */
export async function commit(userId: string, itemId: number, mode: Mode, choice: string, ms: number, g: Grade, test?: TestKind) {
  const { correct } = await judge(itemId, mode, choice);
  const now = new Date();
  const ui = await db.userItem.findUnique({ where: { userId_itemId: { userId, itemId } } });
  // early practice doesn't farm points; a review test does score, but only while that test is genuinely open
  const inTest = test ? await testAnswerAllowed(userId, itemId, test) : false;
  const pts = !inTest && ui && ui.due > now ? 0 : answerPoints(mode, correct, ms);
  const card = grade(ui ? fromJson(ui.card) : null, g, correct, now);
  const data = { card: JSON.parse(JSON.stringify(card)), due: card.due, state: card.state, stability: card.stability };
  await db.$transaction([
    db.userItem.upsert({ where: { userId_itemId: { userId, itemId } }, create: { userId, itemId, ...data }, update: data }),
    db.reviewLog.create({ data: { userId, itemId, correct, ms: Math.min(ms, 600_000), points: pts, mode, test: inTest ? test : null } }),
  ]);
  return { points: pts, due: card.due };
}

// ---------- weekly / monthly review tests ----------
// Words you "know" still fade. Once a week (and once a month) you get a mixed test of what you met recently:
// dialogues, gaps, pictures, simple-English clues, your own sentence. Answers go through the normal Anki grading,
// so anything you got wrong drops back into "learning" and comes round often again.

export type TestKind = "week" | "month";
// Pool = cards you studied between `fromDays` and `toDays` ago: the weekly test covers the last week, the monthly one
// the 3 weeks before that (the cards most at risk of fading), so the two never ask the same thing.
export const TESTS: Record<TestKind, { days: number; fromDays: number; toDays: number; size: number; label: string }> = {
  week: { days: 7, fromDays: 0, toDays: 7, size: 15, label: "Haftalık test" },
  month: { days: 30, fromDays: 7, toDays: 30, size: 25, label: "Aylık test" },
};
const MIN_POOL = 5;

/** Items you answered in the test's window (outside tests and challenges), minus the ones you hid. */
async function testPool(userId: string, kind: TestKind) {
  const { fromDays, toDays } = TESTS[kind];
  const createdAt = { gte: new Date(Date.now() - toDays * 864e5), lte: new Date(Date.now() - fromDays * 864e5) };
  const rows = await db.reviewLog.findMany({
    where: { userId, test: null, challengeId: null, createdAt, item: { users: { some: { userId, known: false } } } },
    distinct: ["itemId"],
    select: { itemId: true },
  });
  return rows.map((r) => r.itemId);
}

/** A test can be taken once per period (rolling: 7 / 30 days since you last took it). */
export async function testStatus(userId: string) {
  const out = {} as Record<TestKind, { available: boolean; poolSize: number; nextInMs: number }>;
  for (const kind of Object.keys(TESTS) as TestKind[]) {
    const [last, pool] = await Promise.all([
      db.reviewLog.findFirst({ where: { userId, test: kind }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      testPool(userId, kind),
    ]);
    const nextInMs = last ? Math.max(0, last.createdAt.getTime() + TESTS[kind].days * 864e5 - Date.now()) : 0;
    out[kind] = { available: nextInMs === 0 && pool.length >= MIN_POOL, poolSize: pool.length, nextInMs };
  }
  return out;
}

/** Server-side guard so test points can't be farmed: the test must be open and the item must be in its pool. */
async function testAnswerAllowed(userId: string, itemId: number, kind: TestKind) {
  const { days, size } = TESTS[kind];
  const since = new Date(Date.now() - days * 864e5);
  const answered = await db.reviewLog.findMany({ where: { userId, test: kind, createdAt: { gte: since } }, select: { itemId: true, createdAt: true } });
  if (answered.length >= size || answered.some((a) => a.itemId === itemId)) return false;
  // started within the last 2 hours (one sitting) or not started yet
  if (answered.length && Date.now() - Math.min(...answered.map((a) => a.createdAt.getTime())) > 2 * 3600e3) return false;
  return (await testPool(userId, kind)).includes(itemId);
}

export async function testQuizzes(userId: string, kind: TestKind, sound: boolean) {
  const status = (await testStatus(userId))[kind];
  if (!status.available) return null;
  const ids = shuffle(await testPool(userId, kind)).slice(0, TESTS[kind].size);
  const items = await db.item.findMany({ where: { id: { in: ids } } });
  // strong=true: the Feynman "use it in your own sentence" step is allowed here
  return Promise.all(shuffle(items).map((it) => buildQuiz(it, false, undefined, true, sound)));
}

/**
 * "Too easy, never show it again" (Anki's suspend). The card is parked 100 years out with huge stability, so no query
 * picks it up again and the level gate counts it as mastered. No points, no log: it can't be used to farm the leaderboard.
 */
export async function markKnown(userId: string, itemId: number) {
  const now = new Date();
  const due = new Date(now.getTime() + 100 * 365 * 864e5);
  const card = { ...createEmptyCard(now), state: State.Review, stability: 36500, difficulty: 1, reps: 1, due, last_review: now };
  const data = { card: JSON.parse(JSON.stringify(card)), due, state: State.Review, stability: 36500, known: true };
  await db.userItem.upsert({ where: { userId_itemId: { userId, itemId } }, create: { userId, itemId, ...data }, update: data });
}

/** Undo: the item becomes new again and comes back in curriculum order. */
export async function unmarkKnown(userId: string, itemId: number) {
  await db.userItem.deleteMany({ where: { userId, itemId, known: true } });
}

export async function knownItems(userId: string) {
  const rows = await db.userItem.findMany({
    where: { userId, known: true },
    include: { item: { select: { id: true, en: true, tr: true, level: true } } },
    orderBy: { item: { level: "asc" } },
  });
  return rows.map((r) => r.item);
}

/** Team challenge: one shot per item, no self-grading, doesn't touch your own schedule. */
export async function challengeAnswer(userId: string, challengeId: string, itemId: number, mode: Mode, choice: string, ms: number): Promise<AnswerResult> {
  const ch = await db.dailyChallenge.findFirst({
    where: { id: challengeId, date: todayKey(), team: { members: { some: { userId } } } },
  });
  if (!ch || !ch.itemIds.includes(itemId)) throw new Error("Bu yarışma sana ait değil.");
  const { item, exp, correct } = await judge(itemId, mode, choice);
  const prev = await db.reviewLog.findFirst({ where: { userId, challengeId, itemId } });
  if (prev) return { correct: prev.correct, expected: exp, points: 0, item: view(item) };
  const pts = answerPoints(mode, correct, ms);
  // unique (userId, challengeId, itemId) also blocks a double submit race
  await db.reviewLog.create({ data: { userId, itemId, correct, ms: Math.min(ms, 600_000), points: pts, mode, challengeId } });
  return { correct, expected: exp, points: pts, item: view(item) };
}

export async function stats(userId: string, level: string) {
  const today = todayKey();
  const now = new Date();
  const [[t], days, progress, due, dueNow] = await Promise.all([
    db.$queryRaw<{ n: number; ok: number; pts: number }[]>`
      SELECT count(*)::int n, (count(*) FILTER (WHERE correct))::int ok, coalesce(sum(points),0)::int pts
      FROM "ReviewLog" WHERE "userId" = ${userId}
      AND ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date = ${today}::date`,
    db.$queryRaw<{ d: string }[]>`
      SELECT DISTINCT to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date, 'YYYY-MM-DD') d
      FROM "ReviewLog" WHERE "userId" = ${userId} ORDER BY d DESC LIMIT 400`,
    levelProgress(userId, level as LevelName),
    // per state: how many cards, how many due now, and when the next one comes back
    db.userItem.groupBy({ by: ["state"], where: { userId, known: false }, _count: true, _min: { due: true } }),
    db.userItem.groupBy({ by: ["state"], where: { userId, known: false, due: { lte: now } }, _count: true }),
  ]);
  const learningStates: number[] = [State.Learning, State.Relearning];
  const bucket = (states: number[]) => {
    const rows = due.filter((d) => states.includes(d.state));
    const next = rows.map((r) => r._min.due).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime())[0];
    return {
      total: rows.reduce((a, r) => a + r._count, 0),
      dueNow: dueNow.filter((d) => states.includes(d.state)).reduce((a, d) => a + d._count, 0),
      nextIn: next && next > now ? next.getTime() - now.getTime() : 0, // ms until the next card of this kind
    };
  };
  // Anki-style counters, but showing totals too (due-only counts sat at 0 and looked broken)
  const queue = { fresh: progress.total - progress.introduced, learning: bucket(learningStates), review: bucket([State.Review]) };
  return { today: t, streak: streak(days.map((r) => r.d), today), progress, queue };
}

// ---------- teams ----------

export async function leaderboard(teamId: string, days: number) {
  return db.$queryRaw<{ id: string; name: string; pts: number; ok: number }[]>`
    SELECT u.id, u.name, coalesce(sum(r.points),0)::int pts, (count(r.id) FILTER (WHERE r.correct))::int ok
    FROM "TeamMember" m JOIN "User" u ON u.id = m."userId"
    LEFT JOIN "ReviewLog" r ON r."userId" = u.id
      AND (r."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date > (${todayKey()}::date - ${days}::int)
    WHERE m."teamId" = ${teamId}
    GROUP BY u.id, u.name ORDER BY pts DESC, ok DESC`;
}

/** Same 10 items for every member today, from the team's lowest level so it's fair. */
export async function todaysChallenge(teamId: string) {
  const date = todayKey();
  let ch = await db.dailyChallenge.findUnique({ where: { teamId_date: { teamId, date } } });
  if (!ch) {
    const members = await db.user.findMany({ where: { teams: { some: { teamId } } }, select: { level: true } });
    const level = LEVELS[Math.min(...members.map((m) => LEVELS.indexOf(m.level as LevelName)))];
    const ids = (await db.item.findMany({ where: { level, type: { in: ["WORD", "PHRASAL", "COLLOCATION"] } }, select: { id: true } })).map((i) => i.id);
    ch = await db.dailyChallenge.upsert({
      where: { teamId_date: { teamId, date } },
      create: { teamId, date, itemIds: shuffle(ids).slice(0, 10) },
      update: {},
    });
  }
  return ch;
}

export async function challengeQuizzes(userId: string, teamId: string) {
  const ch = await todaysChallenge(teamId);
  const [items, done] = await Promise.all([
    db.item.findMany({ where: { id: { in: ch.itemIds } } }),
    db.reviewLog.findMany({ where: { userId, challengeId: ch.id }, select: { itemId: true } }),
  ]);
  const doneIds = new Set(done.map((d) => d.itemId));
  const todo = ch.itemIds.map((id) => items.find((i) => i.id === id)!).filter((i) => i && !doneIds.has(i.id));
  const quizzes = await Promise.all(todo.map((it, i) => buildQuiz(it, false, i % 2 ? "tr_en" : "en_tr")));
  return { challengeId: ch.id, total: ch.itemIds.length, done: doneIds.size, quizzes };
}

// ---------- placement test ----------
// A learner who already speaks some English shouldn't grind 500 A1 cards. Level by level: 6 "what's the Turkish?"
// questions; 5 right = level passed. The first level not passed is where they start. Everything below it is filed
// as known (placedCard) and comes back spread over the next ~3 months, so lucky guesses get caught.

export const PLACEMENT = { perLevel: 6, pass: 5 };

export async function placementQuizzes(level: LevelName) {
  const items = (await allItems()).filter((i) => i.level === level && i.source === "core" && i.type !== "SENTENCE");
  return Promise.all(shuffle(items).slice(0, PLACEMENT.perLevel).map((it) => buildQuiz(it, false, "en_tr")));
}

export async function placementAnswer(itemId: number, choice: string) {
  const { correct, exp } = await judge(itemId, "en_tr", choice);
  return { correct, expected: exp };
}

/** Start at `level`: file every unseen card below it as known. Never moves a learner down. Returns cards filed. */
export async function applyPlacement(userId: string, level: LevelName) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { level: true } });
  if (LEVELS.indexOf(level) <= LEVELS.indexOf(user.level as LevelName)) return 0;
  const below = LEVELS.slice(0, LEVELS.indexOf(level));
  const items = await db.item.findMany({ where: { level: { in: below }, users: { none: { userId } } }, select: { id: true } });
  const now = new Date();
  const rows = items.map(({ id }) => {
    const card = placedCard(now, 10 + Math.random() * 80); // ponytail: random spread so they don't all come back on one day
    return { userId, itemId: id, card: JSON.parse(JSON.stringify(card)), due: card.due, state: card.state, stability: card.stability };
  });
  await db.$transaction([
    db.userItem.createMany({ data: rows, skipDuplicates: true }),
    db.user.update({ where: { id: userId }, data: { level } }),
  ]);
  return rows.length;
}
