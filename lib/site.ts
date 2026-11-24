/** Public origin for canonical URLs, sitemap and OG tags. Vercel sets VERCEL_PROJECT_PRODUCTION_URL. */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://language-learn-92zm.vercel.app";

export const SITE_NAME = "damla";
export const SITE_DESC =
  "İş arasında İngilizce öğren: birkaç dakikada bir tek kart, A1'den C2'ye doğru sırayla. Resimli kelimeler, gündelik kalıplar, phrasal verb'ler, dizi diyalogları ve Anki tarzı aralıklı tekrar. Ücretsiz.";
