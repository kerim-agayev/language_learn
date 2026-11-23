// Debug helper: card states and due times for every real (non-test) user.
import { db } from "../lib/db";
(async () => {
  const users = await db.user.findMany({ where: { NOT: { email: { endsWith: "@smoke.test" } } } });
  const now = new Date();
  for (const u of users) {
    const items = await db.userItem.findMany({ where: { userId: u.id }, include: { item: { select: { en: true } } }, orderBy: { due: "asc" } });
    console.log(`user ${u.name} level ${u.level} items ${items.length} now ${now.toISOString()}`);
    for (const i of items) console.log(`  state ${i.state} stab ${i.stability.toFixed(2)} due ${i.due.toISOString()} ${i.due <= now ? "DUE" : "in " + Math.round((i.due.getTime() - now.getTime()) / 60000) + " min"}  ${i.item.en}`);
    const logs = await db.reviewLog.count({ where: { userId: u.id } });
    console.log("  logs", logs);
  }
  await db.$disconnect();
})();
