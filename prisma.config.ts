import path from "node:path";
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer reads the datasource URL from schema.prisma directly.
// This file is used by the Prisma CLI (migrate/studio/seed); the app's
// runtime PrismaClient gets its connection via a driver adapter, see
// src/lib/db.ts.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
