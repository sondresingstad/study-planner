import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./data/study-planner.db" });
const db = new PrismaClient({ adapter });

async function main() {
  // Cascade deletes handle Events/Tasks/Milestones/ImportBatches/SourceDocuments.
  const { count } = await db.course.deleteMany({ where: { isDemo: true } });
  console.log(`Removed ${count} demo course(s) and everything under them.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
