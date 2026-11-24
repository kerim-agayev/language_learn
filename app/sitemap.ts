import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { pageSlug } from "@/lib/content";
import { LEVELS } from "@/lib/srs";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await db.item.findMany({ where: { slug: { not: null } }, orderBy: [{ level: "asc" }, { order: "asc" }], select: { en: true, slug: true } });
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/register`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/login`, changeFrequency: "yearly", priority: 0.3 },
    ...LEVELS.map((l) => ({ url: `${SITE_URL}/seviye/${l.toLowerCase()}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    // only canonical pages (the "-collocation" twin of a chunk points to the plain one)
    ...items
      .filter((i) => i.slug === pageSlug(i.en))
      .map((i) => ({ url: `${SITE_URL}/kelime/${i.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
