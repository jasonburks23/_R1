import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql } from "drizzle-orm";

async function main() {
  const { db } = createRunwayDb();
  const excluded = ["convergix"];

  const clientsRows = (
    await db.run(
      sql.raw(
        `select id, name, slug, contract_status, contract_value, contract_term, team, client_contacts from clients order by name`
      )
    )
  ).rows as any[];

  for (const c of clientsRows) {
    if (excluded.includes(c.slug as string)) continue;

    console.log(`\n================================================================`);
    console.log(`# ${c.name} (${c.slug})`);
    console.log(
      `Contract: ${c.contract_status} | Value: ${c.contract_value ?? "∅"} | Term: ${c.contract_term ?? "∅"}`
    );
    if (c.team) console.log(`Team: ${c.team}`);
    if (c.client_contacts) console.log(`Client contacts: ${c.client_contacts}`);

    const projects = (
      await db.run(sql.raw(`select * from projects where client_id = '${c.id}' order by name`))
    ).rows as any[];
    console.log(`\nL1 Projects: ${projects.length}`);

    for (const p of projects) {
      console.log(`\n## ${p.name}`);
      console.log(`  id=${p.id}`);
      console.log(
        `  status=${p.status} | category=${p.category} | engagement=${p.engagement_type ?? "NULL"}`
      );
      console.log(
        `  start=${p.start_date ?? "∅"} | end=${p.end_date ?? "∅"} | contract_start=${p.contract_start ?? "∅"} | contract_end=${p.contract_end ?? "∅"}`
      );
      console.log(
        `  owner=${p.owner ?? "∅"} | resources=${p.resources ?? "∅"} | waiting_on=${p.waiting_on ?? "∅"} | stale_days=${p.stale_days ?? "∅"}`
      );
      if (p.notes)
        console.log(`  notes: ${String(p.notes).replace(/\n/g, " | ")}`);
      if (p.parent_project_id) console.log(`  parent=${p.parent_project_id}`);

      const tasks = (
        await db.run(
          sql.raw(
            `select * from week_items where project_id = '${p.id}' order by start_date, sort_order`
          )
        )
      ).rows as any[];
      console.log(`  L2 Tasks: ${tasks.length}`);
      for (const t of tasks) {
        console.log(`    - [${t.status ?? "NULL"}] ${t.title}`);
        console.log(
          `      cat=${t.category ?? "∅"} | start=${t.start_date ?? "∅"} | end=${t.end_date ?? "∅"} | owner=${t.owner ?? "∅"} | resources=${t.resources ?? "∅"}`
        );
        if (t.blocked_by && t.blocked_by !== "[]" && t.blocked_by !== null)
          console.log(`      blocked_by=${t.blocked_by}`);
        if (t.notes)
          console.log(`      notes: ${String(t.notes).replace(/\n/g, " | ")}`);
      }
    }

    const pipe = (
      await db.run(sql.raw(`select * from pipeline_items where client_id = '${c.id}'`))
    ).rows as any[];
    if (pipe.length > 0) {
      console.log(`\n### Pipeline: ${pipe.length}`);
      for (const pi of pipe)
        console.log(
          `  - ${pi.name} [${pi.status}] ${pi.estimated_value ?? "∅"} waiting_on=${pi.waiting_on ?? "∅"}`
        );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
