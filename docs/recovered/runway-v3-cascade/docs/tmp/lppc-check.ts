import { getRunwayDb } from "../../src/lib/db/runway";
import { projects, clients, weekItems, updates } from "../../src/lib/db/runway-schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const db = getRunwayDb();
  const c = await db.select().from(clients).where(eq(clients.slug, "lppc")).limit(1);
  if (!c[0]) throw new Error("lppc not found");

  const ps = await db.select().from(projects).where(eq(projects.clientId, c[0].id));
  console.log(`=== LPPC L1s (${ps.length}) ===\n`);
  for (const p of ps) {
    console.log(`L1: ${p.name} [${p.id.slice(0, 8)}]`);
    console.log(`  status=${p.status} engagementType=${p.engagementType ?? "null"} owner=${p.owner ?? "null"} waitingOn=${p.waitingOn ?? "null"}`);
    console.log(`  startDate=${p.startDate ?? "null"} endDate=${p.endDate ?? "null"} dueDate=${p.dueDate ?? "null"} target=${p.target ?? "null"}`);
    console.log(`  notes=${p.notes ?? "null"}`);
    console.log(`  updatedAt=${p.updatedAt?.toISOString() ?? "null"}`);
    console.log();
  }

  const ws = await db.select().from(weekItems).where(eq(weekItems.clientId, c[0].id));
  console.log(`=== LPPC L2s (${ws.length}) ===\n`);
  for (const w of ws.sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))) {
    console.log(`  ${w.startDate ?? "??"} [${w.id.slice(0, 8)}] ${w.title}`);
    console.log(`    status=${w.status ?? "null"} category=${w.category} owner=${w.owner ?? "null"}`);
    console.log(`    endDate=${w.endDate ?? "null"} blockedBy=${w.blockedBy ?? "null"}`);
    console.log(`    projectId=${w.projectId?.slice(0, 8) ?? "ORPHAN"}`);
    console.log(`    notes=${w.notes ?? "null"}`);
    console.log(`    updatedAt=${w.updatedAt?.toISOString() ?? "null"}`);
    console.log();
  }

  console.log(`=== RECENT LPPC UPDATES (last 10) ===\n`);
  const us = await db.select().from(updates).where(eq(updates.clientId, c[0].id)).orderBy(desc(updates.occurredAt)).limit(10);
  for (const u of us) {
    console.log(`  ${u.occurredAt?.toISOString() ?? "??"} [${u.updateType}] ${u.summary ?? ""}`);
    console.log(`    updatedBy=${u.updatedBy ?? "null"} projectId=${u.projectId?.slice(0, 8) ?? "null"} weekItemId=${u.weekItemId?.slice(0, 8) ?? "null"}`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
