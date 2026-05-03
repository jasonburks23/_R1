import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql } from "drizzle-orm";
async function main() {
  const { db } = createRunwayDb();
  const ids = [
    { slug: "Big Win Template", id: "0157c4232d5c4db58333bb744" },
    { slug: "Social Content (12 posts/mo)", id: "f391dff5ceaf45279a807ace9" },
    { slug: "Brand Guide v2 (secondary palette)", id: "51f39e5cdfbe446992aa155d6" },
    { slug: "New Capacity (PPT, brochure, one-pager)", id: "0c208308ff48427092776c0da" },
    { slug: "AUTOMATE 2026 Booth Design", id: "272e7eef7f554c03947d9b103d5dee80" },
  ];
  for (const { slug, id } of ids) {
    const p = ((await db.run(sql.raw(`select * from projects where id='${id}'`))).rows[0]) as unknown as Record<string, unknown>;
    console.log(`\n## ${slug}`);
    console.log(`  status=${p.status} cat=${p.category} waiting=${p.waiting_on ?? "∅"} stale=${p.stale_days ?? "∅"}`);
    console.log(`  dates: ${p.start_date ?? "∅"}..${p.end_date ?? "∅"} contract=${p.contract_start}..${p.contract_end}`);
    console.log(`  notes: ${p.notes ?? "∅"}`);
    const tasks = (await db.run(sql.raw(`select * from week_items where project_id='${id}' order by start_date, sort_order`))).rows as unknown as Record<string, unknown>[];
    console.log(`  Tasks (${tasks.length}):`);
    for (const w of tasks) {
      console.log(`  - "${w.title}" [${w.status ?? "∅"}/${w.category ?? "∅"}] ${w.start_date ?? "∅"}..${w.end_date ?? "∅"}`);
      console.log(`     notes: ${w.notes ?? "∅"}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
