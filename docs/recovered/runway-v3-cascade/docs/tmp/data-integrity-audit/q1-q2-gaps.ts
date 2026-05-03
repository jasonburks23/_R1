/**
 * Inspect AUTOMATE Booth Design, Events Page Updates, and Corporate
 * Collateral Updates for null / partial / ambiguous fields on the Project
 * row and each Task underneath. Read-only.
 */
import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql } from "drizzle-orm";

async function main() {
  const { db } = createRunwayDb();
  const ids = [
    { slug: "AUTOMATE 2026 Booth Design", id: "272e7eef7f554c03947d9b103d5dee80" },
    { slug: "Events Page Updates (5 tradeshows)", id: "135c5a61d5c343b1b5b39fe08" },
    { slug: "Corporate Collateral Updates", id: "65b2cac113a048f592867a71c" },
  ];

  for (const { slug, id } of ids) {
    console.log(`\n## ${slug}\n`);
    const pr = await db.run(sql.raw(`select * from projects where id='${id}'`));
    const p = pr.rows[0] as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(p)) {
      const display = v === null || v === undefined || v === "" ? "∅" : JSON.stringify(v);
      console.log(`  ${k}: ${display}`);
    }

    const wr = await db.run(sql.raw(`select * from week_items where project_id='${id}' order by start_date, sort_order`));
    const rows = wr.rows as unknown as Record<string, unknown>[];
    console.log(`\n  Tasks (${rows.length}):`);
    for (const w of rows) {
      console.log(`  - "${w.title}"`);
      console.log(`      status=${w.status ?? "∅"}  category=${w.category ?? "∅"}  owner=${w.owner ?? "∅"}  resources=${w.resources ?? "∅"}`);
      console.log(`      start=${w.start_date ?? "∅"}  end=${w.end_date ?? "∅"}  blocked_by=${w.blocked_by ?? "∅"}`);
      console.log(`      notes=${w.notes ?? "∅"}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
