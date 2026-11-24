import type { Metadata } from "next";
import Link from "next/link";
import { login } from "@/app/actions";
import { ActionForm, Field } from "@/components/Forms";

export const metadata: Metadata = {
  title: "Giriş yap",
  description: "damla hesabına giriş yap, kaldığın karttan İngilizce öğrenmeye devam et.",
  alternates: { canonical: "/login" },
};


export default function Login() {
  return (
    <>
      <h1 className="mb-5 font-display text-2xl font-bold">Giriş yap</h1>
      <ActionForm action={login} submit="Giriş yap">
        <Field label="E-posta" name="email" type="email" autoComplete="email" required />
        <Field label="Şifre" name="password" type="password" autoComplete="current-password" required />
      </ActionForm>
      <p className="mt-5 text-sm text-muted">
        Hesabın yok mu? <Link href="/register" className="font-bold text-pen">Hesap aç</Link>
      </p>
    </>
  );
}
