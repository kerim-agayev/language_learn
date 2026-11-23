import { loadContent } from "../lib/content";
const c = loadContent();
const t: Record<string, Record<string, number>> = {};
for (const i of c) { const k = i.source === "anki" ? "anki" : i.level; (t[k] ??= {})[i.type] = ((t[k] ??= {})[i.type] ?? 0) + 1; }
console.table(t);
console.log("with dialogue:", c.filter((i) => (i as { dialogue?: string[] }).dialogue?.length).length, "of", c.length);
