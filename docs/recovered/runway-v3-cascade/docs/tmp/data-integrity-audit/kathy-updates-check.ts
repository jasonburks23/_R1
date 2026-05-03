/**
 * Pull current state of the Tasks Kathy touched at ~9:01 AM local (15:01 UTC)
 * + check for the deleted Partner-of-Year task.
 */
import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql } from "drizzle-orm";

async function main() {
  const { db } = createRunwayDb();
  const titles = [
    "CDS Messaging Pillars — R1 Feedback",
    "April Social — Week of 4/20 Posts (4 posts)",
    "Rockwell Partner Award — Image Swap",
    "Partner-of-Year image swap — push live",
    "Big Win Template — PPT Template",
  ];

  console.log(`# Kathy's 9:01 AM updates — current prod state\n`);
  for (const t of titles) {
    const rows = (await db.run(sql.raw(
      `select w.id, w.title, w.status, w.category, w.start_date, w.end_date, w.updated_at, w.notes, p.name as project
       from week_items w left join projects p on w.project_id = p.id
       where w.title = '${t.replace(/'/g, "''")}'`
    ))).rows as unknown as Record<string, unknown>[];
    if (rows.length === 0) {
      console.log(`## "${t}" — NOT FOUND (deleted or renamed)\n`);
      continue;
    }
    for (const r of rows) {
      const ts = r.updated_at as number;
      const decoded = ts > 9999999999 ? new Date(ts).toISOString() : new Date(ts * 1000).toISOString();
      console.log(`## "${r.title}"`);
      console.log(`   project: ${r.project}`);
      console.log(`   status: ${r.status ?? "∅"}  category: ${r.category ?? "∅"}`);
      console.log(`   start: ${r.start_date ?? "∅"}  end: ${r.end_date ?? "∅"}`);
      console.log(`   updated_at raw: ${ts}  → decoded: ${decoded}`);
      console.log(`   notes: ${r.notes ?? "∅"}\n`);
    }
  }

  console.log(`\n# Recent updates audit log — Kathy's activity today\n`);
  const updates = (await db.run(sql.raw(
    `select update_type, summary, previous_value, new_value, batch_id, created_at, updated_by
     from updates
     where updated_by like '%Kathy%' OR updated_by like '%kathy%'
     order by created_at desc
     limit 20`
  ))).rows as unknown as Record<string, unknown>[];
  for (const u of updates) {
    const ts = u.created_at as number;
    const decoded = ts > 9999999999 ? new Date(ts).toISOString() : new Date(ts * 1000).toISOString();
    console.log(`- ${decoded}  ${u.update_type}  by=${u.updated_by}  batch=${u.batch_id ?? "∅"}`);
    console.log(`  summary: ${u.summary ?? "∅"}`);
    if (u.previous_value || u.new_value) {
      console.log(`  ${u.previous_value ?? "∅"}  →  ${u.new_value ?? "∅"}`);
    }
    console.log();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
