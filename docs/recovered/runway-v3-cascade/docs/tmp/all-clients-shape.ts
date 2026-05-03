import { getRunwayDb } from "../../src/lib/db/runway";
import { projects, clients } from "../../src/lib/db/runway-schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = getRunwayDb();
  const allClients = await db.select().from(clients);
  console.log(`=== ALL CLIENTS (${allClients.length}) ===\n`);

  for (const c of allClients.sort((a, b) => a.name.localeCompare(b.name))) {
    const ps = await db.select().from(projects).where(eq(projects.clientId, c.id));
    const retainers = ps.filter(p => p.engagementType === "retainer").length;
    const proj = ps.filter(p => p.engagementType === "project").length;
    const nullType = ps.filter(p => !p.engagementType).length;
    console.log(`${c.slug.padEnd(25)} "${c.name}" | ${ps.length} L1s | retainer=${retainers} project=${proj} null=${nullType}`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
