// Test helper: make 3 dialogue items due now for one user, so a review batch shows the dialogue quiz.
import { createEmptyCard } from "ts-fsrs";
import { db } from "../lib/db";
import { grade } from "../lib/srs";
(async () => {
  const email = process.argv[2];
  const u = await db.user.findUniqueOrThrow({ where: { email } });
  const items = await db.item.findMany({ where: { dialogue: { isEmpty: false }, level: "A1" }, take: 3 });
  const past = new Date(Date.now() - 3 * 864e5);
  for (const it of items) {
    const card = { ...grade(grade(createEmptyCard(past), 3, true, past), 3, true, past), due: new Date(Date.now() - 60_000) };
    const data = { card: JSON.parse(JSON.stringify(card)), due: card.due, state: card.state, stability: card.stability };
    await db.userItem.upsert({ where: { userId_itemId: { userId: u.id, itemId: it.id } }, create: { userId: u.id, itemId: it.id, ...data }, update: data });
  }
  console.log("due:", items.map((i) => i.en).join(" | "));
  await db.$disconnect();
})();
