import { State } from "ts-fsrs";
import { db, todayKey, TZ } from "./db";
import { LEVELS, MASTERED_STABILITY, levelComplete, rate, fromJson, points, normalize, streak, type LevelName } from "./srs";
import type { Item } from "./generated/prisma/client";

export type Mode = "en_tr" | "tr_en" | "listen" | "blank";
export type ItemView = Omit<Item, "order" | "source">;
/** What the client gets. For reviews the answer is NOT included; it comes back from answer(). */
export type Quiz = {
  itemId: number;
  level: string;
  mode: Mode;
  prompt: string;
  speak?: string;
  options: string[];
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

const expected = (it: Pick<Item, "en" | "tr">, mode: Mode) => (mode === "en_tr" || mode === "listen" ? it.tr : it.en);

function view(it: Item): ItemView {
  const v: Partial<Item> = { ...it };
  delete v.order;
  delete v.source;
  return v as ItemView;
}

async function buildQuiz(it: Item, isNew: boolean, forced?: Mode): Promise<Quiz> {
  const modes: Mode[] = ["en_tr", "tr_en", "listen"];
  if ((it.type === "WORD" || it.type === "PHRASAL") && blankOut(it)) modes.push("blank");
  const mode: Mode = forced ?? (isNew ? "en_tr" : modes[Math.floor(Math.random() * modes.length)]);

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

  const prompt = mode === "en_tr" ? it.en : mode === "tr_en" ? it.tr : mode === "blank" ? blankOut(it)! : "";
  return {
    itemId: it.id,
    level: it.level,
    mode,
    prompt,
    speak: mode === "listen" || mode === "en_tr" ? it.en : undefined,
    options: shuffle([answer, ...distractors]),
    learn: isNew ? view(it) : undefined,
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
export async function nextBatch(userId: string, level: string): Promise<Quiz[]> {
  const lv = await syncLevel(userId, level);
  const now = new Date();
  const due = await db.userItem.findMany({
    where: { userId, due: { lte: now } },
    orderBy: { due: "asc" },
    take: 3,
    include: { item: true },
  });
  const picks: { item: Item; isNew: boolean }[] = due.map((d) => ({ item: d.item, isNew: false }));

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
  return Promise.all(picks.map((p) => buildQuiz(p.item, p.isNew)));
}

export type AnswerResult = { correct: boolean; expected: string; points: number; item: ItemView };

export async function answer(
  userId: string,
  itemId: number,
  mode: Mode,
  choice: string,
  ms: number,
  challengeId?: string,
): Promise<AnswerResult> {
  const item = await db.item.findUniqueOrThrow({ where: { id: itemId } });
  const exp = expected(item, mode);
  const correct = normalize(choice) === normalize(exp);
  ms = Math.max(0, Math.min(ms, 600_000));
  let pts = points(correct, ms);

  if (challengeId) {
    const ch = await db.dailyChallenge.findFirst({
      where: { id: challengeId, date: todayKey(), team: { members: { some: { userId } } } },
    });
    if (!ch || !ch.itemIds.includes(itemId)) throw new Error("Bu yarışma sana ait değil.");
    // unique (userId, challengeId, itemId) blocks answering twice
    const prev = await db.reviewLog.findFirst({ where: { userId, challengeId, itemId } });
    if (prev) return { correct: prev.correct, expected: exp, points: 0, item: view(item) };
    await db.reviewLog.create({ data: { userId, itemId, correct, ms, points: pts, mode, challengeId } });
    return { correct, expected: exp, points: pts, item: view(item) };
  }

  const now = new Date();
  const ui = await db.userItem.findUnique({ where: { userId_itemId: { userId, itemId } } });
  if (ui && ui.due > now) pts = 0; // early practice doesn't farm leaderboard points
  const card = rate(ui ? fromJson(ui.card) : null, correct, ms, now);
  const data = { card: JSON.parse(JSON.stringify(card)), due: card.due, state: card.state, stability: card.stability };
  await db.$transaction([
    db.userItem.upsert({ where: { userId_itemId: { userId, itemId } }, create: { userId, itemId, ...data }, update: data }),
    db.reviewLog.create({ data: { userId, itemId, correct, ms, points: pts, mode } }),
  ]);
  return { correct, expected: exp, points: pts, item: view(item) };
}

export async function stats(userId: string, level: string) {
  const today = todayKey();
  const [[t], days, progress, dueCount] = await Promise.all([
    db.$queryRaw<{ n: number; ok: number; pts: number }[]>`
      SELECT count(*)::int n, (count(*) FILTER (WHERE correct))::int ok, coalesce(sum(points),0)::int pts
      FROM "ReviewLog" WHERE "userId" = ${userId}
      AND ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date = ${today}::date`,
    db.$queryRaw<{ d: string }[]>`
      SELECT DISTINCT to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date, 'YYYY-MM-DD') d
      FROM "ReviewLog" WHERE "userId" = ${userId} ORDER BY d DESC LIMIT 400`,
    levelProgress(userId, level as LevelName),
    db.userItem.count({ where: { userId, due: { lte: new Date() } } }),
  ]);
  return { today: t, streak: streak(days.map((r) => r.d), today), progress, dueCount };
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
    const ids = (await db.item.findMany({ where: { level, type: { in: ["WORD", "PHRASAL"] } }, select: { id: true } })).map((i) => i.id);
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
