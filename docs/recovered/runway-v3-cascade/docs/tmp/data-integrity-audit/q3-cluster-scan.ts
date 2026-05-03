import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql } from "drizzle-orm";

async function main() {
  const { db } = createRunwayDb();
  const ids = [
    { slug: "Rockwell PartnerNetwork Article", id: "394f9e5e5b864c2eb2260f468" },
    { slug: "Texas Instruments Article", id: "c0935359406e40709a0790372" },
    { slug: "Rockwell Automation Co-Marketing Efforts", id: "1923fc1a36524a9c810a73763" },
  ];

  for (const { slug, id } of ids) {
    console.log(`\n## ${slug}\n`);
    const p = ((await db.run(sql.raw(`select * from projects where id='${id}'`))).rows[0]) as unknown as Record<string, unknown>;
    console.log(`  status=${p.status}  category=${p.category}  waiting=${p.waiting_on ?? "∅"}  stale=${p.stale_days ?? "∅"}`);
    console.log(`  dates: start=${p.start_date ?? "∅"}  end=${p.end_date ?? "∅"}  contract=${p.contract_start}..${p.contract_end}`);
    console.log(`  notes: ${p.notes ?? "∅"}`);

    const tasks = (await db.run(sql.raw(`select * from week_items where project_id='${id}' order by start_date, sort_order`))).rows as unknown as Record<string, unknown>[];
    console.log(`\n  Tasks (${tasks.length}):`);
    for (const w of tasks) {
      console.log(`  - "${w.title}"  [${w.status ?? "∅"}/${w.category ?? "∅"}]  ${w.start_date ?? "∅"}..${w.end_date ?? "∅"}`);
      console.log(`      notes: ${w.notes ?? "∅"}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
