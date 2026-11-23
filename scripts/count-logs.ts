// Test helper: how many answers are logged for a user (by email).
import { db } from "../lib/db";
(async () => {
  const u = await db.user.findUniqueOrThrow({ where: { email: process.argv[2] } });
  console.log(await db.reviewLog.count({ where: { userId: u.id } }));
  await db.$disconnect();
})();
