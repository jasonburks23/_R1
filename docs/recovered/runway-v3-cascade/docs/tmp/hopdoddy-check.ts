import { getRunwayDb } from "../../src/lib/db/runway";
import { projects, clients, weekItems } from "../../src/lib/db/runway-schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = getRunwayDb();
  const c = await db.select().from(clients).where(eq(clients.slug, "hopdoddy")).limit(1);
  if (!c[0]) throw new Error("hopdoddy not found");

  const ps = await db.select().from(projects).where(eq(projects.clientId, c[0].id));
  console.log(`=== HOPDODDY (${ps.length} L1s) ===\n`);
  for (const p of ps) {
    console.log(`L1: ${p.name}`);
    console.log(`  id=${p.id.slice(0, 8)}`);
    console.log(`  owner=${p.owner ?? "null"} status=${p.status} category=${p.category}`);
    console.log(`  waitingOn=${p.waitingOn ?? "null"} resources=${p.resources ?? "null"}`);
    console.log(`  notes=${(p.notes ?? "").slice(0, 200)}`);
    console.log();
  }

  const ws = await db.select().from(weekItems).where(eq(weekItems.clientId, c[0].id));
  console.log(`\n=== L2 WEEK ITEMS (${ws.length}) ===\n`);
  for (const w of ws) {
    console.log(`  [${w.id.slice(0, 8)}] ${w.title}`);
    console.log(`    projectId=${w.projectId?.slice(0, 8) ?? "ORPHAN"} owner=${w.owner ?? "null"}`);
    console.log(`    status=${w.status} category=${w.category}`);
    console.log(`    notes=${(w.notes ?? "").slice(0, 150)}`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
