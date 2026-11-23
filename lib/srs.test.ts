import { test } from "node:test";
import assert from "node:assert/strict";
import { State } from "ts-fsrs";
import { levelComplete, isMastered, points, normalize, fromJson, streak, usesItem, grade, previews, formatInterval } from "./srs";

test("level gate is strict", () => {
  assert.equal(levelComplete(100, 99, 99), false); // one item never seen
  assert.equal(levelComplete(100, 100, 89), false); // under 90% mastered
  assert.equal(levelComplete(100, 100, 90), true);
  assert.equal(levelComplete(0, 0, 0), false); // empty level never "complete"
});

test("new item answered Good stays in learning; wrong goes back to minutes", () => {
  const now = new Date("2026-01-01T09:00:00Z");
  const c = grade(null, 3, true, now);
  assert.equal(c.state, State.Learning);
  assert.equal(isMastered(c.state, c.stability), false);
  const wrong = grade(c, 3, false, new Date(now.getTime() + 600e3));
  assert.ok(wrong.due.getTime() - now.getTime() < 864e5);
});

test("card survives JSON round trip", () => {
  const c = grade(null, 3, true);
  const back = fromJson(JSON.parse(JSON.stringify(c)));
  assert.ok(back.due instanceof Date);
  assert.doesNotThrow(() => grade(back, 3, true));
});

test("streak counts back from today, or from yesterday if today is empty", () => {
  assert.equal(streak(["2026-03-10", "2026-03-09", "2026-03-07"], "2026-03-10"), 2);
  assert.equal(streak(["2026-03-09", "2026-03-08"], "2026-03-10"), 2);
  assert.equal(streak(["2026-03-08"], "2026-03-10"), 0);
  assert.equal(streak(["2026-03-01", "2026-02-28"], "2026-03-01"), 2); // month boundary
});

test("usesItem: own sentence must really use the item", () => {
  assert.equal(usesItem("I am hungry now", "hungry"), true);
  assert.equal(usesItem("hungry", "hungry"), false); // not a sentence
  assert.equal(usesItem("I always brush my teeth at night", "brush your teeth"), true);
  assert.equal(usesItem("She is looking for her keys", "look for"), true);
  assert.equal(usesItem("I want some water please", "hungry"), false);
  assert.equal(usesItem("We ran out of milk again", "run out of"), false); // irregular past not accepted (documented limit)
  assert.equal(usesItem("We have run out of milk", "run out of"), true);
});

test("anki-style grading: buttons grow intervals, wrong answer forced to Again", () => {
  const now = new Date("2026-01-01T09:00:00Z");
  const p = previews(null, now);
  assert.ok(p[1] < p[2] && p[2] <= p[3] && p[3] < p[4], "Again < Hard <= Good < Easy");
  assert.ok(p[1] <= 2 * 60_000, "Again on a new card = about 1 minute");
  const wrongButEasy = grade(null, 4, false, now);
  const again = grade(null, 1, true, now);
  assert.equal(wrongButEasy.due.getTime(), again.due.getTime());
  // a card answered Good repeatedly graduates to days
  let c = grade(null, 3, true, now);
  let t = now;
  for (let i = 0; i < 3; i++) { t = c.due; c = grade(c, 3, true, t); }
  assert.ok(c.due.getTime() - t.getTime() > 864e5);
});

test("formatInterval", () => {
  assert.equal(formatInterval(30_000), "1 dk");
  assert.equal(formatInterval(10 * 60_000), "10 dk");
  assert.equal(formatInterval(5 * 3600_000), "5 sa");
  assert.equal(formatInterval(4 * 864e5), "4 gün");
  assert.equal(formatInterval(65 * 864e5), "2 ay");
  assert.equal(formatInterval(400 * 864e5), "1.1 yıl");
});

test("points and normalize", () => {
  assert.equal(points(false, 100), 0);
  assert.equal(points(true, 2000), 15);
  assert.equal(points(true, 20000), 10);
  assert.equal(normalize("  I'm on my WAY! "), "im on my way");
  assert.equal(normalize("IŞIK"), normalize("ışık"));
  assert.equal(normalize("İstanbul"), normalize("istanbul"));
});
