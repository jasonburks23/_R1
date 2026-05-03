import { getRunwayDb } from "../../src/lib/db/runway";
import { projects, clients, weekItems } from "../../src/lib/db/runway-schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = getRunwayDb();
  const c = await db.select().from(clients).where(eq(clients.slug, "bonterra")).limit(1);
  if (!c[0]) throw new Error("bonterra not found");

  const ps = await db.select().from(projects).where(eq(projects.clientId, c[0].id));
  console.log(`=== BONTERRA (${ps.length} L1s) ===\n`);
  for (const p of ps) {
    console.log(`L1: ${p.name}`);
    console.log(`  id=${p.id.slice(0, 8)}`);
    console.log(`  engagementType=${p.engagementType ?? "null"} status=${p.status}`);
    console.log(`  owner=${p.owner ?? "null"} waitingOn=${p.waitingOn ?? "null"}`);
    console.log(`  startDate=${p.startDate ?? "null"} endDate=${p.endDate ?? "null"} dueDate=${p.dueDate ?? "null"}`);
    console.log(`  resources=${p.resources ?? "null"}`);
    console.log(`  notes=${p.notes ?? ""}`);
    console.log();
  }

  const ws = await db.select().from(weekItems).where(eq(weekItems.clientId, c[0].id));
  console.log(`\n=== L2 WEEK ITEMS (${ws.length}) ===\n`);
  for (const w of ws.sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))) {
    console.log(`  ${w.startDate ?? "??"} [${w.id.slice(0, 8)}] ${w.title}`);
    console.log(`    owner=${w.owner ?? "null"} status=${w.status} category=${w.category}`);
    console.log(`    endDate=${w.endDate ?? "null"} blockedBy=${w.blockedBy ?? "null"}`);
    console.log(`    notes=${(w.notes ?? "").slice(0, 150)}`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
