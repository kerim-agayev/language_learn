import type { MetadataRoute } from "next";
import { SITE_DESC } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "damla — iş arasında İngilizce",
    short_name: "damla",
    description: SITE_DESC,
    lang: "tr",
    start_url: "/learn",
    display: "standalone",
    background_color: "#e9edf3",
    theme_color: "#2b55d9",
    id: "/learn",
    scope: "/",
    orientation: "portrait",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Öğren", url: "/learn" },
      { name: "Takım yarışı", url: "/team" },
    ],
  };
}
