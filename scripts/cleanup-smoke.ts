// Deletes throwaway test users (…@smoke.test) and their teams.
import { db } from "../lib/db";
(async () => {
  const ids = (await db.user.findMany({ where: { email: { endsWith: "@smoke.test" } }, select: { id: true } })).map((u) => u.id);
  await db.team.deleteMany({ where: { members: { some: { userId: { in: ids } } } } });
  const d = await db.user.deleteMany({ where: { id: { in: ids } } });
  console.log("deleted", d.count, "users left", await db.user.count());
  await db.$disconnect();
})();
