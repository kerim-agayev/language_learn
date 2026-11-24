import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

/** Header for public (logged-out, cacheable) pages: no cookies read here. */
export function PublicHeader() {
  return (
    <header className="flex items-center gap-2 py-4">
      <Link href="/" className="font-display text-xl font-bold">damla</Link>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Link href="/login" className="rounded-full px-3 py-1.5 text-sm hover:bg-paper">Giriş yap</Link>
        <Link href="/register" className="rounded-full bg-pen px-3 py-1.5 text-sm font-bold text-pen-ink">Hesap aç</Link>
      </div>
    </header>
  );
}
