import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql } from "drizzle-orm";

async function main() {
  const { db } = createRunwayDb();

  const retainers = await db.run(sql.raw(`
    select p.id, p.name, c.slug as client, p.status, p.start_date, p.end_date,
           p.contract_start, p.contract_end, p.parent_project_id
    from projects p
    left join clients c on p.client_id = c.id
    where p.engagement_type = 'retainer'
    order by c.slug, p.name
  `));
  const rows = retainers.rows as unknown as Record<string, unknown>[];
  console.log(`# RETAINERS (${rows.length})\n`);

  for (const r of rows) {
    const kidRes = await db.run(sql.raw(`select count(*) as n from projects where parent_project_id = '${r.id}'`));
    const kidCount = (kidRes.rows[0] as unknown as {n: number}).n;
    const wiRes = await db.run(sql.raw(`select count(*) as n from week_items where project_id = '${r.id}'`));
    const wiCount = (wiRes.rows[0] as unknown as {n: number}).n;
    console.log(`  ${r.client}  "${r.name}"`);
    console.log(`    status=${r.status}  contract=${r.contract_start}..${r.contract_end}  computed=${r.start_date}..${r.end_date}`);
    console.log(`    parent=${r.parent_project_id ?? "∅"}  kids=${kidCount}  L2s=${wiCount}`);
  }

  console.log(`\n# week_items category x status\n`);
  const combos = await db.run(sql.raw(`
    select category, status, count(*) as n
    from week_items
    group by category, status
    order by category, status
  `));
  for (const r of combos.rows as unknown as Record<string, unknown>[]) {
    console.log(`  category=${r.category ?? "NULL"}  status=${r.status ?? "NULL"}  n=${r.n}`);
  }

  console.log(`\n# projects without start_date or end_date\n`);
  const noDates = await db.run(sql.raw(`
    select p.id, p.name, c.slug, p.engagement_type, p.status, p.category
    from projects p
    left join clients c on p.client_id = c.id
    where p.start_date is null or p.end_date is null
    order by c.slug, p.name
  `));
  for (const r of noDates.rows as unknown as Record<string, unknown>[]) {
    console.log(`  ${r.slug}  [${r.engagement_type ?? "NULL"}/${r.status}/${r.category}]  "${r.name}"  id=${r.id}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
