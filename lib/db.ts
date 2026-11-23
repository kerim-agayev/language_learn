import { PrismaClient } from "./generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const g = globalThis as unknown as { db?: PrismaClient };

export const db =
  g.db ?? new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

if (process.env.NODE_ENV !== "production") g.db = db;

export const TZ = process.env.APP_TZ || "Europe/Istanbul";

/** YYYY-MM-DD in app timezone */
export const todayKey = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
