import Link from "next/link";
import { register } from "@/app/actions";
import { ActionForm, Field } from "@/components/Forms";

export default function Register() {
  return (
    <>
      <h1 className="mb-5 font-display text-2xl font-bold">Hesap aç</h1>
      <ActionForm action={register} submit="Hesap aç">
        <Field label="Adın (sıralamada görünür)" name="name" autoComplete="given-name" required maxLength={40} />
        <Field label="E-posta" name="email" type="email" autoComplete="email" required />
        <Field label="Şifre (en az 8 karakter)" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </ActionForm>
      <p className="mt-5 text-sm text-muted">
        Hesabın var mı? <Link href="/login" className="font-bold text-pen">Giriş yap</Link>
      </p>
    </>
  );
}
