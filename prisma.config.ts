import { defineConfig } from "prisma/config";

// ponytail: Node's built-in .env loader instead of dotenv; on Vercel env comes from the platform
try { process.loadEnvFile(); } catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx --env-file=.env prisma/seed.ts" },
  // migrations need the direct (non-pooled) Neon host
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
});
