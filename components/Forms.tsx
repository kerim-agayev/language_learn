"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";

export const inputCls =
  "w-full rounded-xl border-2 border-line bg-paper px-4 py-2.5 outline-none focus:border-pen";

/** Generic server-action form with inline error/success message. */
export function ActionForm({
  action,
  submit,
  children,
  className = "flex flex-col gap-3",
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  submit: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className={className}>
      {children}
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-good">{state.ok}</p>}
      <button disabled={pending} className="rounded-xl bg-pen px-5 py-2.5 font-bold text-pen-ink disabled:opacity-60">
        {pending ? "…" : submit}
      </button>
    </form>
  );
}

export function Field({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{label}</span>
      <input className={inputCls} {...p} />
    </label>
  );
}
