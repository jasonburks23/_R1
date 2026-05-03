import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql } from "drizzle-orm";

async function main() {
  const { db } = createRunwayDb();
  const rows = (
    await db.run(
      sql.raw(`
        select id, title, day_of_week, week_of, start_date, end_date, sort_order, project_id
        from week_items
        where client_id = (select id from clients where slug = 'convergix')
        order by week_of, sort_order
      `)
    )
  ).rows as any[];

  for (const r of rows) {
    console.log(
      `[${r.id.substring(0, 8)}] ${r.title}\n  dow=${r.day_of_week ?? "∅"} week_of=${r.week_of ?? "∅"} start=${r.start_date ?? "∅"} end=${r.end_date ?? "∅"} sort=${r.sort_order}`
    );
  }

  // Also grab project sort_order values
  console.log(`\n\n=== PROJECTS (sort_order) ===`);
  const projRows = (
    await db.run(
      sql.raw(
        `select id, name, sort_order from projects where client_id = (select id from clients where slug = 'convergix') order by sort_order, name`
      )
    )
  ).rows as any[];
  for (const p of projRows) {
    console.log(`[${p.id.substring(0, 8)}] sort=${p.sort_order} ${p.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
