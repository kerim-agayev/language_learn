import { test } from "node:test";
import assert from "node:assert/strict";
import { State } from "ts-fsrs";
import { rate, levelComplete, isMastered, points, normalize, fromJson, streak } from "./srs";

test("level gate is strict", () => {
  assert.equal(levelComplete(100, 99, 99), false); // one item never seen
  assert.equal(levelComplete(100, 100, 89), false); // under 90% mastered
  assert.equal(levelComplete(100, 100, 90), true);
  assert.equal(levelComplete(0, 0, 0), false); // empty level never "complete"
});

test("new item rated Good at most, wrong answer goes back to learning", () => {
  const now = new Date("2026-01-01T09:00:00Z");
  const c = rate(null, true, 1000, now);
  assert.equal(c.state, State.Learning);
  assert.equal(isMastered(c.state, c.stability), false);
  const wrong = rate(c, false, 1000, new Date(now.getTime() + 600e3));
  assert.ok(wrong.due.getTime() - now.getTime() < 864e5);
});

test("card survives JSON round trip", () => {
  const c = rate(null, true, 5000);
  const back = fromJson(JSON.parse(JSON.stringify(c)));
  assert.ok(back.due instanceof Date);
  assert.doesNotThrow(() => rate(back, true, 5000));
});

test("streak counts back from today, or from yesterday if today is empty", () => {
  assert.equal(streak(["2026-03-10", "2026-03-09", "2026-03-07"], "2026-03-10"), 2);
  assert.equal(streak(["2026-03-09", "2026-03-08"], "2026-03-10"), 2);
  assert.equal(streak(["2026-03-08"], "2026-03-10"), 0);
  assert.equal(streak(["2026-03-01", "2026-02-28"], "2026-03-01"), 2); // month boundary
});

test("points and normalize", () => {
  assert.equal(points(false, 100), 0);
  assert.equal(points(true, 2000), 15);
  assert.equal(points(true, 20000), 10);
  assert.equal(normalize("  I'm on my WAY! "), "im on my way");
  assert.equal(normalize("IŞIK"), normalize("ışık"));
  assert.equal(normalize("İstanbul"), normalize("istanbul"));
});
