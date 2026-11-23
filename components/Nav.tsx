import Link from "next/link";
import { logout } from "@/app/actions";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/learn", label: "Öğren" },
  { href: "/team", label: "Takım" },
  { href: "/settings", label: "Ayarlar" },
];

export function Nav({ name, level }: { name: string; level: string }) {
  return (
    <header className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3 sm:gap-4 sm:py-4">
      <Link href="/learn" className="font-display text-xl font-bold tracking-tight">
        damla
      </Link>
      <span className="lv-chip rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ "--lv": `var(--${level})` } as React.CSSProperties}>
        {level}
      </span>
      <nav className="ml-auto flex items-center gap-1 text-sm">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-full px-2 py-1.5 text-muted hover:bg-paper hover:text-ink sm:px-3">
            {l.label}
          </Link>
        ))}
      </nav>
      <ThemeToggle />
      <form action={logout}>
        <button className="rounded-full px-2 py-1.5 text-sm text-muted hover:bg-paper hover:text-ink sm:px-3" title={name}>
          Çıkış
        </button>
      </form>
    </header>
  );
}
