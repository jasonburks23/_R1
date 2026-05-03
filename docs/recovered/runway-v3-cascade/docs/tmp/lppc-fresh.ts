import { getRunwayDb } from "../../src/lib/db/runway";
import { projects, clients, weekItems } from "../../src/lib/db/runway-schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = getRunwayDb();
  const c = await db.select().from(clients).where(eq(clients.slug, "lppc")).limit(1);
  const ps = await db.select().from(projects).where(eq(projects.clientId, c[0].id));
  const ws = await db.select().from(weekItems).where(eq(weekItems.clientId, c[0].id));

  console.log(`=== LPPC L1s (${ps.length}) — sorted by name ===\n`);
  for (const p of ps.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`L1 [${p.id.slice(0, 8)}] ${p.name}`);
    console.log(`  status=${p.status}  owner=${p.owner ?? "null"}  waitingOn=${p.waitingOn ?? "null"}`);
    console.log(`  startDate=${p.startDate ?? "null"}  endDate=${p.endDate ?? "null"}  dueDate=${p.dueDate ?? "null"}`);
    console.log(`  target=${p.target ?? "null"}`);
    console.log(`  notes=${p.notes ?? "null"}`);
    console.log(`  updatedAt=${p.updatedAt?.toISOString() ?? "null"}`);
    console.log();
  }

  console.log(`\n=== LPPC L2s (${ws.length}) — sorted by startDate ===\n`);
  const pidToName = new Map(ps.map(p => [p.id, p.name]));
  for (const w of ws.sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))) {
    console.log(`L2 [${w.id.slice(0, 8)}] ${w.startDate ?? "??"}  ${w.title}`);
    console.log(`  parent=${pidToName.get(w.projectId ?? "") ?? "ORPHAN"}`);
    console.log(`  status=${w.status ?? "null"}  category=${w.category}  owner=${w.owner ?? "null"}`);
    console.log(`  endDate=${w.endDate ?? "null"}  blockedBy=${w.blockedBy ?? "null"}`);
    console.log(`  notes=${w.notes ?? "null"}`);
    console.log(`  updatedAt=${w.updatedAt?.toISOString() ?? "null"}`);
    console.log();
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
