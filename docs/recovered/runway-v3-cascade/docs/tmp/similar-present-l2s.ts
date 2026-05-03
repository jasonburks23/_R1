import { getRunwayDb } from "../../src/lib/db/runway";
import { weekItems, projects, clients } from "../../src/lib/db/runway-schema";
import { or, like, eq } from "drizzle-orm";

async function main() {
  const db = getRunwayDb();
  const ws = await db.select().from(weekItems).where(
    or(
      like(weekItems.title, "%Present%"),
      like(weekItems.title, "%present%"),
      like(weekItems.title, "%Feedback%"),
      like(weekItems.title, "%Revised%")
    )
  );
  const ps = await db.select().from(projects);
  const cs = await db.select().from(clients);
  const pById = new Map(ps.map(p => [p.id, p]));
  const cById = new Map(cs.map(c => [c.id, c]));

  console.log(`=== SIMILAR L2s (Present/Feedback/Revised) ===\n`);
  for (const w of ws.sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))) {
    const p = pById.get(w.projectId ?? "");
    const c = cById.get(w.clientId);
    console.log(`[${c?.slug ?? "?"}] ${p?.name ?? "?"} > ${w.title}`);
    console.log(`  startDate=${w.startDate}  endDate=${w.endDate ?? "null"}  status=${w.status ?? "null"}  category=${w.category}  owner=${w.owner ?? "null"}`);
    console.log(`  notes=${(w.notes ?? "").slice(0, 120)}`);
    console.log();
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
