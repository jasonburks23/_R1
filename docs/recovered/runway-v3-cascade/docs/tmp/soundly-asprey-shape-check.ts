import { getRunwayDb } from "../../src/lib/db/runway";
import { projects, clients } from "../../src/lib/db/runway-schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = getRunwayDb();
  for (const slug of ["soundly", "asprey"]) {
    const c = await db.select().from(clients).where(eq(clients.slug, slug)).limit(1);
    if (!c[0]) { console.log(`${slug}: not found`); continue; }
    const ps = await db.select().from(projects).where(eq(projects.clientId, c[0].id));
    console.log(`\n=== ${slug.toUpperCase()} (${ps.length} projects) ===`);
    for (const p of ps) {
      console.log(`  ${p.name.padEnd(42)} | et=${(p.engagementType ?? "NULL").padEnd(10)} | cs=${p.contractStart ?? "NULL"} ce=${p.contractEnd ?? "NULL"} | status=${p.status}`);
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
