// End-to-end check of learning logic against the real DB. Creates and deletes two throwaway users.
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { hashPassword, verifyPassword } from "../lib/auth";
import { pickMode, nextBatch, check, commit, challengeAnswer, stats, todaysChallenge, challengeQuizzes, leaderboard } from "../lib/learn";

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
    // sound off (silent office PC): never a listening quiz
    const it2 = { image: "/x.webp", simple: "x", type: "WORD" as const };
    for (let i = 0; i < 300; i++) {
      assert.notEqual(pickMode(it2, { isNew: false, canBlank: true, strong: true, sound: false }), "listen_en");
    }
    assert.ok([...Array(300)].some(() => pickMode(it2, { isNew: false, canBlank: true, strong: false, sound: true }) === "listen_en"));
    console.log("smoke OK");
  } finally {
    await db.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    await db.$disconnect();
  }
}
main();
