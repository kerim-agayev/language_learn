import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col px-4">
      <header className="flex items-center py-4">
        <Link href="/" className="font-display text-xl font-bold">damla</Link>
        <div className="ml-auto"><ThemeToggle /></div>
      </header>
      <div className="note mt-10 p-6" style={{ "--lv": "var(--A1)" } as React.CSSProperties}>{children}</div>
    </main>
  );
}
