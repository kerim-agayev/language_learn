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
- `ts-fsrs` for spaced repetition. Browser-native: speechSynthesis (pronunciation), Notification API,
  Document Picture-in-Picture (always-on-top mini window, Chrome/Edge).
- Hosting: Vercel Hobby + Neon Free. Env: `DATABASE_URL`, `DIRECT_URL`, `APP_TZ` (default Europe/Istanbul),
  `PIXABAY_API_KEY` (local, image script only). `npm run build` runs `prisma migrate deploy` first.

## Core rules (non-negotiable)
1. **Strict level gate** (`levelComplete` in `lib/srs.ts`, tested): next level opens only when every item of the
   current level was introduced AND ≥ 90% are mastered (FSRS state Review, stability ≥ 5 days). Empty levels are skipped.
2. **Deterministic order**: new items served by `(level, order)`. Order = content file name order, then array order.
   User's Anki cards come after core content inside their level.
3. **Reviews before new**: a micro-session = ≤ 3 due reviews + ≤ 1 new item (`nextBatch` in `lib/learn.ts`).
   If nothing is due and the level is fully introduced, weakest items are practised early — with 0 points.
4. **Answers are checked on the server** (`answer()`); review quizzes never ship the answer to the client.
5. **Natural English only**, every item has example + Turkish translation.

## Layout
- `lib/srs.ts` pure logic (rating, gate, points, streak, normalize) + `lib/srs.test.ts` → `npm test`
- `lib/learn.ts` DB logic: batches, quizzes, answer, stats, leaderboard, daily challenge
- `app/actions.ts` all server actions; pages: `/`, `/login`, `/register`, `/learn`, `/team`, `/settings`
- `components/Learner.tsx` timer + notifications + PiP; `components/Card.tsx` learn/quiz/reveal card
- `scripts/smoke.ts` end-to-end check against the real DB (creates & deletes 2 users): `npx tsx --env-file=.env scripts/smoke.ts`

## Content pipeline
- `content/<LEVEL>/<NN>-<topic>.json` (format: `content/SCHEMA.md`), `content/anki.json` = user's imported Anki deck.
- Currently: A1 ~348, A2 ~345 core items; B1–C2 only the Anki words. **Next content job: B1, then B2…**
  (same schema, ~16 topic files per level, written to sound like real spoken English).
- `npx tsx scripts/check-content.ts` validates + lists duplicates (seed keeps the first (type,en) occurrence).
- `npm run images` → Pixabay (+ Anki media) → `public/img/<slug>.webp` 480×360, committed. Re-run safe.
- `npx prisma db seed` upserts by (type,en) → safe to re-run, keeps progress.

## Design
- Load the `frontend-design` skill before UI work. Concept: sticky note on a monitor. Tokens in `app/globals.css`
  (`--desk --paper --ink --muted --line --pen`, level colours `--A1..--C2`). Fonts: Bricolage Grotesque (display),
  Atkinson Hyperlegible Next (body). Light default + toggle (`data-theme` on `<html>`, saved in localStorage).
- Card must work in the 380×620 PiP window. Keyboard: 1–4 answer, Space/Enter continue, Esc snooze 10 min.
- Avoid "·" joined meta strings and all-caps labels.

## Later (only when asked)
Placement test, badges, weekly summary, Google login, PWA/offline, nicer TTS voices, B1+ core content.
