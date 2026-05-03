import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql } from "drizzle-orm";

async function main() {
  const { db } = createRunwayDb();
  const convergixId = (
    await db.run(sql.raw(`select id from clients where slug = 'convergix'`))
  ).rows[0] as unknown as { id: string };

  const rows = (
    await db.run(
      sql.raw(
        `select w.id, w.title, w.status, w.category, w.start_date, w.end_date, w.owner, w.resources, w.notes, w.blocked_by, p.name as project_name, p.status as project_status
         from week_items w
         join projects p on p.id = w.project_id
         where w.client_id = '${convergixId.id}' and w.status is null
         order by p.name, w.start_date`
      )
    )
  ).rows as any[];

  console.log(`Convergix week_items with NULL status: ${rows.length}\n`);
  for (const r of rows) {
    console.log(`## Project: ${r.project_name} [${r.project_status}]`);
    console.log(`   Task: ${r.title}`);
    console.log(`   id=${r.id}`);
    console.log(
      `   category=${r.category ?? "∅"} | start=${r.start_date ?? "∅"} | end=${r.end_date ?? "∅"} | owner=${r.owner ?? "∅"} | resources=${r.resources ?? "∅"}`
    );
    if (r.blocked_by && r.blocked_by !== "[]" && r.blocked_by !== null)
      console.log(`   blocked_by=${r.blocked_by}`);
    if (r.notes)
      console.log(`   notes: ${String(r.notes).replace(/\n/g, " | ")}`);
    console.log();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
