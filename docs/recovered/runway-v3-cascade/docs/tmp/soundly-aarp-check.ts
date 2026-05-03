import { getRunwayDb } from "../../src/lib/db/runway";
import { projects, clients, weekItems, pipelineItems } from "../../src/lib/db/runway-schema";
import { eq, like, and } from "drizzle-orm";

async function main() {
  const db = getRunwayDb();
  const c = await db.select().from(clients).where(eq(clients.slug, "soundly")).limit(1);
  if (!c[0]) throw new Error("Soundly not found");

  const ps = await db.select().from(projects).where(eq(projects.clientId, c[0].id));
  const aarp = ps.find(p => p.name.toLowerCase().includes("aarp"));
  console.log(`=== AARP PROJECT L1 ===`);
  if (aarp) {
    console.log(JSON.stringify(aarp, null, 2));
  } else {
    console.log("Not found by name");
  }

  console.log(`\n=== AARP WEEK ITEMS ===`);
  const ws = await db.select().from(weekItems).where(eq(weekItems.clientId, c[0].id));
  const aarpWs = ws.filter(w => w.title.toLowerCase().includes("aarp") || w.projectId === aarp?.id);
  for (const w of aarpWs) {
    console.log(`  [${w.id.slice(0, 8)}] ${w.title}`);
    console.log(`    status=${w.status} category=${w.category} owner=${w.owner ?? "null"}`);
    console.log(`    startDate=${w.startDate ?? "null"} endDate=${w.endDate ?? "null"}`);
    console.log(`    notes=${(w.notes ?? "").slice(0, 120)}`);
  }

  console.log(`\n=== AARP PIPELINE ITEM ===`);
  const pipes = await db.select().from(pipelineItems).where(eq(pipelineItems.clientId, c[0].id));
  const aarpPipe = pipes.filter(p => p.title?.toLowerCase().includes("aarp") || p.notes?.toLowerCase().includes("aarp"));
  for (const p of aarpPipe) {
    console.log(JSON.stringify(p, null, 2));
  }
  if (aarpPipe.length === 0) console.log("No AARP pipeline items found");

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
