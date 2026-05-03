/**
 * Scan prod for everything Daniel's post-4/28 info unblocks.
 * Read-only. Pulls Convergix projects + week_items where:
 *   - waiting_on = Daniel
 *   - notes mention Daniel, Fanuc, cert, or award
 */
import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql } from "drizzle-orm";

async function main() {
  const { db } = createRunwayDb();

  const projs = await db.run(sql.raw(`
    select p.name, p.id, p.status, p.category, p.waiting_on, p.start_date, p.end_date, p.notes
    from projects p
    left join clients c on p.client_id = c.id
    where c.slug = 'convergix'
      and (
        p.waiting_on = 'Daniel'
        or lower(p.notes) like '%daniel%'
        or lower(p.notes) like '%fanuc%'
        or lower(p.notes) like '%cert%'
        or lower(p.notes) like '%award%'
      )
    order by p.name
  `));

  const rows = projs.rows as unknown as Record<string, unknown>[];
  console.log(`# Convergix Projects waiting on Daniel or referencing Fanuc/certs/awards (${rows.length})\n`);
  for (const r of rows) {
    console.log(`## ${r.name}  [${r.status}/${r.category}]`);
    console.log(`   waiting_on=${r.waiting_on ?? "∅"}  dates=${r.start_date ?? "∅"}..${r.end_date ?? "∅"}`);
    console.log(`   notes: ${r.notes ?? "∅"}\n`);
  }

  console.log(`\n# Convergix Tasks referencing Daniel / Fanuc / certs / awards\n`);
  const tasks = await db.run(sql.raw(`
    select w.title, w.status, w.category, w.start_date, w.end_date, w.notes, p.name as project
    from week_items w
    left join projects p on w.project_id = p.id
    left join clients c on w.client_id = c.id
    where c.slug = 'convergix'
      and (
        lower(w.notes) like '%daniel%'
        or lower(w.notes) like '%fanuc%'
        or lower(w.notes) like '%cert%'
        or lower(w.notes) like '%award%'
      )
    order by p.name, w.start_date
  `));

  for (const r of tasks.rows as unknown as Record<string, unknown>[]) {
    console.log(`- ${r.project} → "${r.title}"  [${r.status ?? "∅"}/${r.category ?? "∅"}]  ${r.start_date ?? "∅"}..${r.end_date ?? "∅"}`);
    console.log(`  notes: ${r.notes ?? "∅"}\n`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
