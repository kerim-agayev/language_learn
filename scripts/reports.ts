// "Hata bildir" inbox. List open reports:  npx tsx --env-file=.env scripts/reports.ts
// Mark fixed ones:                          npx tsx --env-file=.env scripts/reports.ts --resolve 3,7
import { db } from "../lib/db";

(async () => {
  const i = process.argv.indexOf("--resolve");
  if (i > 0) {
    const ids = process.argv[i + 1].split(",").map(Number);
    const r = await db.report.updateMany({ where: { id: { in: ids } }, data: { resolved: true } });
    console.log("resolved", r.count);
  }
  const open = await db.report.findMany({
    where: { resolved: false },
    orderBy: { createdAt: "asc" },
    include: { item: { select: { level: true, type: true, en: true, tr: true, example: true, exampleTr: true } }, user: { select: { name: true } } },
  });
  for (const r of open)
    console.log(`#${r.id} ${r.createdAt.toISOString().slice(0, 10)} ${r.user?.name ?? "?"} | ${r.item.level} ${r.item.type} "${r.item.en}" = ${r.item.tr}\n   ex: ${r.item.example} / ${r.item.exampleTr}\n   >> ${r.text}`);
  console.log(open.length, "open report(s)");
  await db.$disconnect();
})();
