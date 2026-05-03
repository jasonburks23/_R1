/**
 * Read-only audit of Convergix v4 field coverage in prod Turso.
 * Run: npx tsx docs/tmp/convergix-v4-gap-audit.ts
 */
import { getRunwayDb } from "../../src/lib/db/runway";
import { projects as runwayProjects, weekItems as runwayWeekItems, clients as runwayClients } from "../../src/lib/db/runway-schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = getRunwayDb();

  const client = await db.select().from(runwayClients).where(eq(runwayClients.slug, "convergix")).limit(1);
  if (!client[0]) throw new Error("Convergix not found");
  const clientId = client[0].id;

  const projects = await db.select().from(runwayProjects).where(eq(runwayProjects.clientId, clientId));
  const weekItems = await db.select().from(runwayWeekItems).where(eq(runwayWeekItems.clientId, clientId));

  console.log(`\n=== CONVERGIX v4 GAP AUDIT ===`);
  console.log(`clientId=${clientId}`);
  console.log(`${projects.length} projects, ${weekItems.length} week items\n`);

  console.log(`--- PROJECTS (engagementType / contractStart / contractEnd / startDate / endDate / dueDate) ---\n`);
  for (const p of projects) {
    console.log(`${p.name}`);
    console.log(`  status=${p.status}`);
    console.log(`  engagementType=${p.engagementType ?? "NULL"}`);
    console.log(`  contractStart=${p.contractStart ?? "NULL"} contractEnd=${p.contractEnd ?? "NULL"}`);
    console.log(`  startDate=${p.startDate ?? "NULL"} endDate=${p.endDate ?? "NULL"} dueDate=${p.dueDate ?? "NULL"}`);
    console.log(`  id=${p.id}`);
    console.log();
  }

  console.log(`--- WEEK ITEMS (blockedBy / startDate / endDate) ---\n`);
  let withBlocked = 0;
  let withStart = 0;
  let withEnd = 0;
  for (const w of weekItems) {
    if (w.blockedBy && w.blockedBy !== "[]" && w.blockedBy !== "null") withBlocked++;
    if (w.startDate) withStart++;
    if (w.endDate) withEnd++;
  }
  console.log(`Total: ${weekItems.length}`);
  console.log(`  with blockedBy: ${withBlocked}`);
  console.log(`  with startDate: ${withStart}`);
  console.log(`  with endDate (multi-day): ${withEnd}`);

  console.log(`\n--- WEEK ITEMS (first 20, sorted by start) ---\n`);
  const sorted = weekItems.slice().sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
  for (const w of sorted.slice(0, 20)) {
    console.log(`  [${w.id.slice(0, 8)}] ${w.startDate ?? "??"} ${w.title}`);
    console.log(`    status=${w.status} category=${w.category} owner=${w.owner ?? "null"} projectId=${w.projectId?.slice(0, 8) ?? "ORPHAN"}`);
    console.log(`    endDate=${w.endDate ?? "null"} blockedBy=${w.blockedBy ?? "null"}`);
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
