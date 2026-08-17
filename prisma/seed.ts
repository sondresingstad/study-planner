import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { generateDemoCourses } from "../src/server/seed/demo-data";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./data/study-planner.db" });
const db = new PrismaClient({ adapter });

async function main() {
  const existingDemo = await db.course.count({ where: { isDemo: true } });
  if (existingDemo > 0) {
    console.log(`Found ${existingDemo} existing demo course(s) — skipping seed (run "npm run db:reset-demo" first to reseed).`);
    return;
  }

  await db.settings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });

  const courses = await generateDemoCourses(db);
  for (const course of courses) {
    console.log(`Seeded ${course.code} — ${course.name}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
