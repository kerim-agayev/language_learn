"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { challengeAnswer, challengeQuizzes, check, commit, nextBatch, type Mode } from "@/lib/learn";
import type { Grade } from "@/lib/srs";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function register(_: FormState, f: FormData): Promise<FormState> {
  const name = str(f, "name").slice(0, 40), email = str(f, "email").toLowerCase(), password = str(f, "password");
  if (!name) return { error: "Adını yaz." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Geçerli bir e-posta yaz." };
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };
  if (await db.user.findUnique({ where: { email } })) return { error: "Bu e-posta zaten kayıtlı. Giriş yap." };
  const user = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
  await createSession(user.id);
  redirect("/learn");
}

export async function login(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase(), password = str(f, "password");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "E-posta veya şifre yanlış." };
  await createSession(user.id);
  redirect("/learn");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function getBatch() {
  const u = await requireUser();
  return nextBatch(u.id, u.level);
}

export async function checkAnswer(itemId: number, mode: Mode, choice: string, ms: number) {
  const u = await requireUser();
  return check(u.id, itemId, mode, choice, ms);
}

export async function commitAnswer(itemId: number, mode: Mode, choice: string, ms: number, g: Grade) {
  const u = await requireUser();
  if (![1, 2, 3, 4].includes(g)) throw new Error("Geçersiz değerlendirme.");
  return commit(u.id, itemId, mode, choice, ms, g);
}

export async function answerChallenge(challengeId: string, itemId: number, mode: Mode, choice: string, ms: number) {
  const u = await requireUser();
  return challengeAnswer(u.id, challengeId, itemId, mode, choice, ms);
}

export async function saveSettings(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const intervalMin = Number(f.get("intervalMin")), dailyGoal = Number(f.get("dailyGoal"));
  const workStart = str(f, "workStart"), workEnd = str(f, "workEnd");
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (![1, 3, 5, 10, 15, 20, 30].includes(intervalMin)) return { error: "Aralık geçersiz." };
  if (!hhmm.test(workStart) || !hhmm.test(workEnd)) return { error: "Saatleri SS:DD biçiminde gir." };
  if (!(dailyGoal >= 5 && dailyGoal <= 200)) return { error: "Günlük hedef 5 ile 200 arasında olmalı." };
  await db.user.update({ where: { id: u.id }, data: { intervalMin, workStart, workEnd, dailyGoal } });
  revalidatePath("/learn");
  return { ok: "Kaydedildi." };
}

// ---------- teams ----------

export async function createTeam(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const name = str(f, "name").slice(0, 40);
  if (!name) return { error: "Takıma bir ad ver." };
  const code = randomBytes(4).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "X").slice(0, 6);
  await db.team.create({ data: { name, code, members: { create: { userId: u.id } } } });
  revalidatePath("/team");
  return { ok: `Takım kuruldu. Davet kodu: ${code}` };
}

export async function joinTeam(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const team = await db.team.findUnique({ where: { code: str(f, "code").toUpperCase() } });
  if (!team) return { error: "Bu kodla bir takım yok. Kodu kontrol et." };
  await db.teamMember.upsert({
    where: { userId_teamId: { userId: u.id, teamId: team.id } },
    create: { userId: u.id, teamId: team.id },
    update: {},
  });
  revalidatePath("/team");
  return { ok: `${team.name} takımına katıldın.` };
}

export async function leaveTeam(teamId: string) {
  const u = await requireUser();
  await db.teamMember.deleteMany({ where: { userId: u.id, teamId } });
  revalidatePath("/team");
}

export async function getChallenge(teamId: string) {
  const u = await requireUser();
  const member = await db.teamMember.findUnique({ where: { userId_teamId: { userId: u.id, teamId } } });
  if (!member) throw new Error("Bu takımın üyesi değilsin.");
  return challengeQuizzes(u.id, teamId);
}
