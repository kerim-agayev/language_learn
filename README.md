# language_learn (damla)

İş arasında birkaç dakikada bir tek kart: A1'den C2'ye doğru sırayla gündelik İngilizce, akıllı tekrar (FSRS),
iş arkadaşlarıyla günlük yarış.

## Yerelde çalıştırma
```bash
npm install
cp .env.example .env      # değerleri doldur
npx prisma migrate deploy
npx prisma db seed
npm run dev               # http://localhost:3000
```

## Vercel'e yükleme (ücretsiz)
1. Repoyu Vercel'e import et (Framework: Next.js, ayar gerekmez).
2. Environment Variables: `DATABASE_URL`, `DIRECT_URL`, `APP_TZ`.
3. Deploy. Build sırasında migration otomatik çalışır. İçerik değişince yerelde `npx prisma db seed` çalıştır.

## İçerik
`content/` klasöründe JSON (biçim: `content/SCHEMA.md`). Resimler: `npm run images` (Pixabay anahtarı gerekir).
