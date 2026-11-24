import type { Metadata, Viewport } from "next";
import { SITE_DESC, SITE_NAME, SITE_URL } from "@/lib/site";
import { Bricolage_Grotesque, Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-display" });
const body = Atkinson_Hyperlegible_Next({ subsets: ["latin", "latin-ext"], variable: "--font-body", adjustFontFallback: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "damla: iş arasında İngilizce öğren (A1–C2)", template: "%s | damla" },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: ["İngilizce öğren", "ücretsiz İngilizce", "İngilizce kelime", "phrasal verbs", "gündelik İngilizce", "A1 C2 İngilizce", "aralıklı tekrar", "Anki", "iş arasında İngilizce"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "tr_TR", siteName: SITE_NAME, url: "/", title: "damla: iş arasında, damla damla İngilizce", description: SITE_DESC },
  twitter: { card: "summary_large_image", title: "damla: iş arasında, damla damla İngilizce", description: SITE_DESC },
  appleWebApp: { title: SITE_NAME, capable: true },
  formatDetection: { telephone: false },
  verification: { google: "XySCFs0ifXUaUP9V4jzdHWuSRTdNX6s4pyY60JCeAac" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9edf3" },
    { media: "(prefers-color-scheme: dark)", color: "#10151e" },
  ],
};

// Default light; saved choice applied before first paint (no flash).
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" data-theme="light" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
