import { getRunwayDb } from "../../src/lib/db/runway";
import { projects, clients, weekItems } from "../../src/lib/db/runway-schema";
import { inArray } from "drizzle-orm";

const TARGET_SLUGS = ["convergix", "dave-asprey", "soundly", "hopdoddy", "bonterra"];

async function main() {
  const db = getRunwayDb();
  const cs = await db.select().from(clients).where(inArray(clients.slug, TARGET_SLUGS));
  const cIds = cs.map(c => c.id);
  const ps = await db.select().from(projects).where(inArray(projects.clientId, cIds));
  const ws = await db.select().from(weekItems).where(inArray(weekItems.clientId, cIds));

  const cBySlug = new Map(cs.map(c => [c.id, c.slug]));

  console.log(`=== PROJECT (L1) NULL FIELDS ===\n`);
  const projFields = ["status", "owner", "waitingOn", "dueDate", "startDate", "endDate", "contractStart", "contractEnd", "engagementType", "resources", "notes"];
  for (const p of ps) {
    const slug = cBySlug.get(p.clientId);
    const nulls = projFields.filter(f => (p as any)[f] === null || (p as any)[f] === undefined);
    if (nulls.length === 0) continue;
    console.log(`${slug} :: ${p.name}`);
    console.log(`  NULL: ${nulls.join(", ")}`);
  }

  console.log(`\n\n=== WEEK_ITEM (L2) NULL FIELDS ===\n`);
  const wFields = ["status", "owner", "startDate", "endDate", "blockedBy", "notes", "projectId"];
  for (const w of ws.sort((a, b) => ((cBySlug.get(a.clientId) ?? "").localeCompare(cBySlug.get(b.clientId) ?? "")) || (a.startDate ?? "").localeCompare(b.startDate ?? ""))) {
    const slug = cBySlug.get(w.clientId);
    const nulls = wFields.filter(f => (w as any)[f] === null || (w as any)[f] === undefined);
    if (nulls.length === 0) continue;
    console.log(`${slug} :: ${w.startDate ?? "??"} ${w.title}`);
    console.log(`  NULL: ${nulls.join(", ")}`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
