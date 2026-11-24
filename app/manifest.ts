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
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
