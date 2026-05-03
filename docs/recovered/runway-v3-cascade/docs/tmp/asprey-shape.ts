import { getRunwayDb } from "../../src/lib/db/runway";
import { projects, clients, weekItems } from "../../src/lib/db/runway-schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = getRunwayDb();
  const c = await db.select().from(clients).where(eq(clients.slug, "dave-asprey")).limit(1);
  if (!c[0]) throw new Error("dave-asprey not found");
  console.log(`Client: ${c[0].name} (${c[0].slug})`);

  const ps = await db.select().from(projects).where(eq(projects.clientId, c[0].id));
  console.log(`\n${ps.length} L1 projects:`);
  for (const p of ps) {
    console.log(`  ${p.name}`);
    console.log(`    id=${p.id}`);
    console.log(`    engagementType=${p.engagementType ?? "null"} contractStart=${p.contractStart ?? "null"} contractEnd=${p.contractEnd ?? "null"}`);
    console.log(`    status=${p.status} startDate=${p.startDate ?? "null"} endDate=${p.endDate ?? "null"} dueDate=${p.dueDate ?? "null"}`);
    console.log(`    owner=${p.owner ?? "null"} waitingOn=${p.waitingOn ?? "null"}`);
    console.log(`    notes=${(p.notes ?? "").slice(0, 100)}`);
  }

  const ws = await db.select().from(weekItems).where(eq(weekItems.clientId, c[0].id));
  console.log(`\n${ws.length} L2 week items:`);
  for (const w of ws) {
    console.log(`  [${w.id.slice(0, 8)}] ${w.title}`);
    console.log(`    status=${w.status} category=${w.category} owner=${w.owner ?? "null"}`);
    console.log(`    startDate=${w.startDate ?? "null"} endDate=${w.endDate ?? "null"} blockedBy=${w.blockedBy ?? "null"}`);
    console.log(`    projectId=${w.projectId?.slice(0, 8) ?? "ORPHAN"}`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
