import { LEVELS } from "@/lib/srs";
import { LEVEL_INFO, LISTS } from "@/lib/public";
import { SITE_URL } from "@/lib/site";
import { FAQ } from "@/lib/faq";

// llms.txt (https://llmstxt.org): a plain summary for AI assistants and AI search crawlers.
export const dynamic = "force-static";

export function GET() {
  const body = `# damla

> Free web app for Turkish speakers to learn everyday spoken English at work: every few minutes one tiny card (about 1 minute), in strict CEFR order from A1 to C2, with pictures, audio, simple-English explanations, example sentences, sitcom-style dialogues and Anki-style spaced repetition. Interface in Turkish.

- Method: learn like a native child (spoken, high-frequency chunks, phrasal verbs and collocations first), Rosetta Stone-style immersion (picture + sound + simple English, Turkish only on request), Feynman technique (every item explained simply; learners later use it in their own sentence) and FSRS spaced repetition with Again/Hard/Good/Easy grading.
- A level opens only after the previous one is mastered (90%). A placement test lets learners skip levels they already know.
- Coworkers can form a team and race daily on the same 10 items. Installable as an app (PWA).
- Every card has a public page: "<phrase> ne demek?" with Turkish meaning, IPA, example sentence + translation, simple English explanation and often a short dialogue.

## Levels
${LEVELS.map((l) => `- [${l} İngilizce: ${LEVEL_INFO[l].name}](${SITE_URL}/seviye/${l.toLowerCase()}): ${LEVEL_INFO[l].desc}`).join("\n")}

## Lists
${Object.entries(LISTS).map(([s, l]) => `- [${l.h1}](${SITE_URL}/liste/${s}): ${l.desc}`).join("\n")}

## Example card pages
- [run out of ne demek?](${SITE_URL}/kelime/run-out-of)
- [Oh my God ne demek?](${SITE_URL}/kelime/oh-my-god)
- [nip it in the bud ne demek?](${SITE_URL}/kelime/nip-it-in-the-bud)

## FAQ (Turkish)
${FAQ.map((f) => `- ${f.q} ${f.a}`).join("\n")}

## Optional
- [Sign up (free)](${SITE_URL}/register)
- [Sitemap](${SITE_URL}/sitemap.xml)
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
