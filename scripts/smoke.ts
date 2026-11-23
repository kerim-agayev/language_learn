// End-to-end check of learning logic against the real DB. Creates and deletes two throwaway users.
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { hashPassword, verifyPassword } from "../lib/auth";
import { blankDialogue } from "../lib/srs";
import { testStatus, testQuizzes, markKnown, unmarkKnown, knownItems, levelProgress, pickMode, nextBatch, check, commit, challengeAnswer, stats, todaysChallenge, challengeQuizzes, leaderboard } from "../lib/learn";

async function main() {
  const pw = await hashPassword("secret123");
  assert.ok(await verifyPassword("secret123", pw));
  assert.ok(!(await verifyPassword("wrong", pw)));
  const a = await db.user.create({ data: { name: "smoke-a", email: `a-${Date.now()}@smoke.test`, passwordHash: pw } });
  const b = await db.user.create({ data: { name: "smoke-b", email: `b-${Date.now()}@smoke.test`, passwordHash: pw } });
  try {
    const batch = await nextBatch(a.id, a.level);
    assert.equal(batch.length, 1, "fresh user gets exactly one new item");
    const q = batch[0];
    assert.ok(q.learn && q.learn.level === "A1", "first item is A1 and comes with a learn card");
    assert.equal(q.options.length, 4);
    const first = await db.item.findFirst({ where: { level: "A1" }, orderBy: { order: "asc" } });
    assert.equal(q.itemId, first!.id, "follows the curriculum order");

    assert.notEqual(q.mode, "tr_en", "new items are checked by immersion (picture / simple English)");
    const ans = q.mode === "en_tr" ? q.learn!.tr : q.learn!.en;
    const right = await check(a.id, q.itemId, q.mode, ans, 2500);
    assert.ok(right.correct && right.points === 15 && right.intervals && right.suggested === 3);
    assert.equal(await db.reviewLog.count({ where: { userId: a.id } }), 0, "check() saves nothing");
    const c1 = await commit(a.id, q.itemId, q.mode, ans, 2500, 3);
    assert.equal(c1.points, 15);
    const wrong = await check(a.id, q.itemId, q.mode, "yanlış", 2500);
    assert.ok(!wrong.correct && wrong.suggested === 1);
    const c2 = await commit(a.id, q.itemId, q.mode, "yanlış", 2500, 4); // claims Easy on a wrong answer
    assert.equal(c2.points, 0);
    assert.ok(c2.due.getTime() - Date.now() < 15 * 60_000, "wrong answer is forced to Again");

    const next = await nextBatch(a.id, a.level);
    assert.ok(next.some((x) => x.learn && x.itemId !== q.itemId), "next new item comes in order");

    // Feynman step: own sentence must use the item
    const prod = await check(a.id, q.itemId, "produce", `Oh ${q.learn!.en} to you too`, 9000);
    assert.equal(prod.correct, true);
    assert.equal(prod.points, 0, "early practice gives no points");
    const bad = await check(a.id, q.itemId, "produce", "I like big dogs", 9000);
    assert.equal(bad.correct, false);

    const s = await stats(a.id, "A1");
    assert.equal(s.today.n, 2);
    assert.equal(s.queue.fresh, s.progress.total - 1);
    // counters show totals, not only due cards (due-only counts sat at 0 and looked broken)
    assert.equal(s.queue.learning.total + s.queue.review.total, 1, "the one seen card is counted");
    assert.ok(s.queue.learning.dueNow + s.queue.review.dueNow <= 1);
    assert.equal(s.streak, 1);
    assert.equal(s.progress.introduced, 1);

    const team = await db.team.create({ data: { name: "smoke", code: "SMK" + Math.floor(Math.random() * 999), members: { create: [{ userId: a.id }, { userId: b.id }] } } });
    const ch = await todaysChallenge(team.id);
    assert.equal(ch.itemIds.length, 10);
    assert.deepEqual((await todaysChallenge(team.id)).itemIds, ch.itemIds, "same items for everyone");
    const cq = await challengeQuizzes(b.id, team.id);
    const it = await db.item.findUniqueOrThrow({ where: { id: cq.quizzes[0].itemId } });
    const r1 = await challengeAnswer(b.id, ch.id, it.id, cq.quizzes[0].mode, cq.quizzes[0].mode === "en_tr" ? it.tr : it.en, 1000);
    assert.ok(r1.correct && r1.points === 15);
    const r2 = await challengeAnswer(b.id, ch.id, it.id, cq.quizzes[0].mode, it.tr, 1000);
    assert.equal(r2.points, 0, "can't answer a challenge item twice");
    assert.equal((await challengeQuizzes(b.id, team.id)).done, 1);

    const board = await leaderboard(team.id, 1);
    assert.equal(board[0].name, "smoke-a");
    assert.equal(board[0].pts, 15);
    assert.equal(board.find((r) => r.name === "smoke-b")!.pts, 15);
    await db.team.delete({ where: { id: team.id } });
    // "never show again": hidden card never comes back, counts as mastered, isn't a learning/review card, gives no points
    const logsBefore = await db.reviewLog.count({ where: { userId: a.id } });
    await markKnown(a.id, q.itemId);
    for (let i = 0; i < 3; i++) assert.ok(!(await nextBatch(a.id, "A1")).some((x) => x.itemId === q.itemId), "hidden card never served");
    assert.equal((await levelProgress(a.id, "A1")).mastered, 1, "hidden card counts as mastered for the gate");
    const sh = await stats(a.id, "A1");
    assert.equal(sh.queue.learning.total + sh.queue.review.total, 0, "hidden card not in learning/review counters");
    assert.equal(await db.reviewLog.count({ where: { userId: a.id } }), logsBefore, "hiding logs nothing (no points)");
    assert.deepEqual((await knownItems(a.id)).map((i) => i.id), [q.itemId]);
    await unmarkKnown(a.id, q.itemId);
    assert.equal(await db.userItem.count({ where: { userId: a.id, itemId: q.itemId } }), 0, "restore makes it new again");

    // sound off (silent office PC): never a listening quiz
    const it2 = { image: "/x.webp", simple: "x", type: "WORD" as const };
    for (let i = 0; i < 300; i++) {
      assert.notEqual(pickMode(it2, { isNew: false, canBlank: true, strong: true, sound: false }), "listen_en");
    }
    assert.ok([...Array(300)].some(() => pickMode(it2, { isNew: false, canBlank: true, strong: false, sound: true }) === "listen_en"));
    // dialogue quiz: stored arrays survive the DB round trip and are blankable
    const dlg = await db.item.findFirst({ where: { dialogue: { isEmpty: false } } });
    assert.ok(dlg && blankDialogue(dlg.dialogue, dlg.en), "a seeded dialogue can be blanked");
    assert.ok([...Array(100)].some(() => pickMode(dlg!, { isNew: false, canBlank: false, strong: false, sound: true, canDialog: true }) === "dialog"));
    // weekly review test: opens after 5 studied cards, scores once per item, then closes for 7 days
    const c = await db.user.create({ data: { name: "smoke-c", email: `c-${Date.now()}@smoke.test`, passwordHash: pw } });
    try {
      assert.equal((await testStatus(c.id)).week.available, false, "no test before studying");
      const firsts = await db.item.findMany({ where: { level: "A1" }, orderBy: { order: "asc" }, take: 6 });
      for (const it of firsts) await commit(c.id, it.id, "en_tr", it.tr, 3000, 3);
      await markKnown(c.id, firsts[5].id); // hidden cards stay out of tests
      const st = await testStatus(c.id);
      assert.ok(st.week.available && st.week.poolSize === 5, "test opens with the 5 visible studied cards");
      assert.ok(!st.month.available && st.month.poolSize === 0, "monthly test only covers cards from 7-30 days ago");
      const tq = (await testQuizzes(c.id, "week", true))!;
      assert.equal(tq.length, 5);
      assert.ok(!tq.some((x) => x.itemId === firsts[5].id));
      const t0 = firsts.find((f) => f.id === tq[0].itemId)!;
      const ans = tq[0].mode === "en_tr" ? t0.tr : tq[0].mode === "produce" ? `I really like ${t0.en} a lot` : t0.en;
      const r1 = await commit(c.id, t0.id, tq[0].mode, ans, 3000, 3, "week");
      assert.ok(r1.points > 0, "test answers score even though the card isn't due");
      const r2 = await commit(c.id, t0.id, tq[0].mode, ans, 3000, 3, "week");
      assert.equal(r2.points, 0, "same item can't score twice in a test");
      assert.equal(await db.reviewLog.count({ where: { userId: c.id, test: "week" } }), 1);
      const after = await testStatus(c.id);
      assert.ok(!after.week.available && after.week.nextInMs > 6 * 864e5, "test closes for a week once started");
      assert.equal(await testQuizzes(c.id, "week", true), null);
    } finally {
      await db.user.delete({ where: { id: c.id } });
    }

    console.log("smoke OK");
  } finally {
    await db.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    await db.$disconnect();
  }
}
main();
