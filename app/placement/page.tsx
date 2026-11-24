import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { Placement } from "@/components/Placement";
import type { LevelName } from "@/lib/srs";

export const metadata: Metadata = { title: "Seviye testi", robots: { index: false, follow: false } };

export default async function PlacementPage() {
  const u = await requireUser();
  return (
    <>
      <Nav name={u.name} level={u.level} />
      <main className="mx-auto max-w-xl px-4 pt-4 pb-16">
        <Placement current={u.level as LevelName} />
      </main>
    </>
  );
}
