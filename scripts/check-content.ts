import { loadContent } from "../lib/content";
const c = loadContent();
console.log("total", c.length, "imageQuery", c.filter((i) => i.imageQuery).length, "ankiImg", c.filter((i) => i.image).length);
const bad = c.filter((i) => !i.en || !i.tr || !i.example || !i.exampleTr || !["WORD", "CHUNK", "PHRASAL", "SENTENCE"].includes(i.type) || !["A1","A2","B1","B2","C1","C2"].includes(i.level));
console.log("bad", bad.length, bad.slice(0, 3).map((i) => i.en));
const k = new Map<string, string[]>();
for (const i of c) { const key = i.type + "|" + i.en.toLowerCase(); k.set(key, [...(k.get(key) ?? []), `${i.level}/${i.topic}`]); }
console.log([...k].filter(([, v]) => v.length > 1).map(([a, v]) => a + " -> " + v.join(" | ")).join("\n"));
