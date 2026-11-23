// End-to-end check of learning logic against the real DB. Creates and deletes two throwaway users.
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { hashPassword, verifyPassword } from "../lib/auth";
import { nextBatch, answer, stats, todaysChallenge, challengeQuizzes, leaderboard } from "../lib/learn";

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

    const right = await answer(a.id, q.itemId, q.mode, q.learn!.tr, 2500);
    assert.ok(right.correct && right.points === 15);
    const wrong = await answer(a.id, q.itemId, q.mode, "yanlış", 2500);
    assert.ok(!wrong.correct && wrong.points === 0);

    const next = await nextBatch(a.id, a.level);
    assert.ok(next.some((x) => x.learn && x.itemId !== q.itemId), "next new item comes in order");

    const s = await stats(a.id, "A1");
    assert.equal(s.today.n, 2);
    assert.equal(s.streak, 1);
    assert.equal(s.progress.introduced, 1);

    const team = await db.team.create({ data: { name: "smoke", code: "SMK" + Math.floor(Math.random() * 999), members: { create: [{ userId: a.id }, { userId: b.id }] } } });
    const ch = await todaysChallenge(team.id);
    assert.equal(ch.itemIds.length, 10);
    assert.deepEqual((await todaysChallenge(team.id)).itemIds, ch.itemIds, "same items for everyone");
    const cq = await challengeQuizzes(b.id, team.id);
    const it = await db.item.findUniqueOrThrow({ where: { id: cq.quizzes[0].itemId } });
    const r1 = await answer(b.id, it.id, cq.quizzes[0].mode, cq.quizzes[0].mode === "en_tr" ? it.tr : it.en, 1000, ch.id);
    assert.ok(r1.correct && r1.points === 15);
    const r2 = await answer(b.id, it.id, cq.quizzes[0].mode, it.tr, 1000, ch.id);
    assert.equal(r2.points, 0, "can't answer a challenge item twice");
    assert.equal((await challengeQuizzes(b.id, team.id)).done, 1);

    const board = await leaderboard(team.id, 1);
    assert.equal(board[0].name, "smoke-a");
    assert.equal(board[0].pts, 15);
    assert.equal(board.find((r) => r.name === "smoke-b")!.pts, 15);
    await db.team.delete({ where: { id: team.id } });
    console.log("smoke OK");
  } finally {
    await db.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    await db.$disconnect();
  }
}
main();
