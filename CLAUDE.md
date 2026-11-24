# CLAUDE.md — damla

@AGENTS.md

Micro-learning English for desk workers (Turkish speakers, Türkiye Türkçesi). Every N minutes a tiny card pops up
(~1 min), then back to work. Strict CEFR order A1 → C2, natural everyday English (not academic).
Coworkers form a team and race daily on the same 10 items. UI text in Turkish; code/identifiers/commits in English.

## Stack
- Next.js 16 App Router (read `node_modules/next/dist/docs/` before using an API), Tailwind v4, Server Actions.
  `cacheComponents` is deliberately OFF: every page is per-user dynamic.
- Prisma 7 (`prisma-client` generator → `lib/generated/prisma`, `prisma.config.ts`, `@prisma/adapter-neon`) + Neon.
  Migrations use `DIRECT_URL` (non-pooled host); runtime uses pooled `DATABASE_URL`.
- Auth: own minimal auth in `lib/auth.ts` (node:crypto scrypt + DB `Session` table, httpOnly cookie, token stored as sha256).
  No auth library. Add OAuth only when asked.
- `ts-fsrs` for spaced repetition. `User.sound` off = no auto-play and no `listen_en` quizzes (silent office PCs). Browser-native: speechSynthesis (pronunciation), Notification API,
  Document Picture-in-Picture (always-on-top mini window, Chrome/Edge).
- Hosting: Vercel Hobby + Neon Free. Env: `DATABASE_URL`, `DIRECT_URL`, `APP_TZ` (default Europe/Istanbul),
  `PIXABAY_API_KEY` (local, image script only). `npm run build` runs `prisma migrate deploy` first.

## Teaching method (the product's core — keep it)
- **Like a native child** (5–6 year-old English kid: speaks fluently, can't read): spoken, concrete, high-frequency
  first; chunks, phrasal verbs and COLLOCATIONs early. A1 starts with `00a–00d` (first words, what parents say,
  little actions, home collocations); office/money topics come last in A1.
- **Rosetta Stone immersion:** new item = picture + audio (auto-played) + `simple` English; Turkish hidden behind
  "Türkçesini göster". ~80% of quizzes are English-only (`pic_en`, `simple_en`, `listen_en`, `blank`).
- **Feynman:** every item has `simple` (explained like to a 5-year-old). Graduated items (FSRS Review state)
  sometimes get `produce`: write/say your own sentence (Web Speech recognition), checked by `usesItem`.
- **Dialogue quiz** (`dialog` mode): a 2–4 line "A:/B:" chat with the item blanked (`blankDialogue`), pick what fits.
  Only items with a `dialogue` field get it (currently the ~300 sitcom items). Revealed cards show the whole chat.
- **"Bir daha gösterme" (Anki suspend):** on the new card and after an answer the learner can hide a too-easy card
  (`markKnown`): `UserItem.known=true`, parked 100 years out with huge stability → never served, counts as mastered
  for the gate, excluded from sidebar counters, no log/points. Ayarlar lists hidden cards with "Geri getir" (`unmarkKnown`
  deletes the UserItem so it comes back as new). Not offered in the team challenge.
- **Nothing fades away:** FSRS `maximum_interval` = 60 days (`MAX_INTERVAL_DAYS`), whatever the learner presses.
- **Review tests** (`/test/week`, `/test/month`, sidebar buttons): weekly = 15 cards studied in the last 7 days,
  monthly = 25 cards studied 7–30 days ago (never the same cards). Mixed modes incl. dialog and "own sentence",
  normal Anki grading (wrong → back to learning). Once per rolling 7/30 days; needs ≥ 5 cards in the pool.
  Test answers score even if the card isn't due, guarded server-side (`testAnswerAllowed`: open test, item in pool,
  once per item, one sitting). `ReviewLog.test` = "week" | "month".
- **Anki route:** after each answer the learner grades Again/Hard/Good/Easy; each button shows its next interval
  (`previews` + `formatInterval`). Nothing is saved until graded (`check` -> `commit`). Wrong answer = Again only.
  "Again" cards come back once more in the same session. Sidebar shows New / Learning / Review as TOTALS with "N şimdi" or "next in X" underneath (due-only counts sat at 0 and the user read that as broken).

## Core rules (non-negotiable)
1. **Strict level gate** (`levelComplete` in `lib/srs.ts`, tested): next level opens only when every item of the
   current level was introduced AND ≥ 90% are mastered (FSRS state Review, stability ≥ 5 days). Empty levels are skipped.
2. **Deterministic order**: new items served by `(level, order)`. Order = content file name order, then array order.
   User's Anki cards come after core content inside their level.
3. **Reviews before new**: a micro-session = ≤ 3 due reviews + ≤ 1 new item (`nextBatch` in `lib/learn.ts`).
   If nothing is due and the level is fully introduced, weakest items are practised early — with 0 points.
4. **Answers are checked on the server** (`check`, `commit`, `challengeAnswer`); review quizzes never ship the answer to the client.
5. **Natural English only**, every item has example + Turkish translation.

## Layout
- `lib/srs.ts` pure logic (grade/previews, gate, points, streak, normalize, usesItem) + `lib/srs.test.ts` → `npm test`
- `lib/learn.ts` DB logic: batches, quizzes, answer, stats, leaderboard, daily challenge
- `app/actions.ts` all server actions; pages: `/`, `/login`, `/register`, `/learn`, `/team`, `/settings`
- SEO: `lib/site.ts` (SITE_URL from VERCEL_PROJECT_PRODUCTION_URL), root `metadata` in `app/layout.tsx`, `app/robots.ts`,
  `sitemap.ts`, `manifest.ts`, `opengraph-image.tsx`, `icon.svg`, `apple-icon.tsx`, JSON-LD on `/`. Logged-in pages are
  `noindex` and disallowed in robots. Public SEO pages: `/seviye/[level]` (all items of a level, by topic) and
  `/kelime/[slug]` (one item, ISR: rendered on first visit, cached 1 day; no cookies read there). `Item.slug` is set by the
  seed (`pageSlug(en)`, type appended on clashes; the twin's canonical points to the plain slug; sitemap lists canonical only). Nav must fit 320px (level chip hides below 360px).
- `components/Learner.tsx` timer + notifications + PiP; `components/Card.tsx` learn/quiz/reveal card
- `scripts/smoke.ts` end-to-end check against the real DB (creates & deletes 2 users): `npx tsx --env-file=.env scripts/smoke.ts`

## Content pipeline
- `content/<LEVEL>/<NN>-<topic>.json` (format: `content/SCHEMA.md`), `content/anki.json` = user's imported Anki deck.
- Currently in DB: A1 446, A2 360, B1 379, B2 417, C1 464 (incl. Anki words); C2 only the Anki words. **Next content job: C2.**
- **Sitcom English**: `<LEVEL>/20-sitcom-*.json` and `21-sitcom-*.json` (A1–C2) — everyday dialogue typical of Friends,
  HIMYM, Malcolm in the Middle, The Office, Seinfeld, Big Bang Theory, B99, Modern Family, Breaking Bad. Based on model
  knowledge of the shows (no transcripts, no frequency counts); original examples, ≤3 short catchphrases in total;
  `note` names the show. Every sitcom item has `dialogue`.
- When 2 agents write one level in parallel, split phrasal verbs by first letter (A–L / M–Z) and collocations by kind
  (verb+noun / adj+adv) — that cut overlaps from 26 (B2) to 2 (C1).
  (same schema incl. `simple`, ~16 topic files per level, written to sound like real spoken English).
- Parallel content agents must not share scratchpad script names or clear a level folder (B1 09–16 once got
  lost that way). After parallel writes always run `check-content` and count files.
- `npx tsx scripts/check-content.ts` validates + lists duplicates (seed keeps the first (type,en) occurrence).
- `npm run images` → Pixabay (+ Anki media) → `public/img/<slug>.webp` 480×360, committed. Re-run safe.
- After fetching images run `npx tsx scripts/dedupe-images.ts` (byte-identical pictures; `--fix` re-downloads an unused
  photo, never touches Anki pictures) and `npx tsx scripts/similar-images.ts` (look-alikes; `--sheet out.png a,b,c`
  makes a labelled contact sheet to eyeball relevance). Pixabay often returns the same top photo for related queries.
  Abstract chunks/idioms get no picture (`imageQuery: null` → emoji); a misleading photo is worse than none.
  Never delete images by iterating loadContent(): duplicate (type,en) entries share one file.
- `npx prisma db seed` upserts by (type,en) → safe to re-run, keeps progress.

## Design
- Load the `frontend-design` skill before UI work. Concept: sticky note on a monitor. Tokens in `app/globals.css`
  (`--desk --paper --ink --muted --line --pen`, level colours `--A1..--C2`). Fonts: Bricolage Grotesque (display),
  Atkinson Hyperlegible Next (body). Light default + toggle (`data-theme` on `<html>`, saved in localStorage).
- Card must work in the 380×620 PiP window and at 390px phone width (no horizontal scroll).
  Keyboard: 1–4 answer, then 1–4 grade (Space/Enter = suggested grade), Esc snooze 10 min.
- Dev server caches the Prisma client on globalThis: restart `next dev` after `prisma generate`.
- `npx tsx -e` hangs in this environment; write a script file instead (e.g. `scripts/cleanup-smoke.ts`).
- Avoid "·" joined meta strings and all-caps labels.

## TODO — agreed with the user, deferred for cost
- **Add `dialogue` to ALL remaining items (~2180, every level + anki.json)** so every card can get the dialogue quiz.
  The user asked for it (2026-11-23) but postponed it because it needs ~11 parallel agents. Plan: one agent per half
  level (A1 00a–07 / 08–16, A2 01–08 / 09–17, B1/B2/C1 01–08 / 09–16) + one for anki.json; each edits only its own
  files with a scratchpad script prefixed by its group name; rule: one line contains `en` verbatim; then run
  `scripts/check-content.ts` (reports unblankable dialogues) and re-seed.
- C2 core content (C2 currently = sitcom files + Anki words).

## Later (only when asked)
Placement test, badges, weekly summary, Google login, PWA/offline, nicer TTS voices, C2 core content, de-duplicate B2 phrasal/collocation files (two writers overlapped ~26 items).
