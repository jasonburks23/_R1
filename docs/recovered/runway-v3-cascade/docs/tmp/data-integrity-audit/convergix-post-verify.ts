import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql } from "drizzle-orm";

const BATCH_ID = "convergix-kathy-cleanup-2026-04-22";

async function main() {
  const { db } = createRunwayDb();

  console.log(`\n=== POST-APPLY VERIFICATION: ${BATCH_ID} ===\n`);

  // 1. Count audit rows for this batch
  const auditCount = (
    await db.run(
      sql.raw(
        `select count(*) as c from updates where batch_id = '${BATCH_ID}'`
      )
    )
  ).rows[0] as any;
  console.log(`1. Audit rows with batch_id:                 ${auditCount.c}  (expected 92)`);

  // 2. ms-encoding check — no created_at > 9999999999 (year 2286)
  const msEncodedNew = (
    await db.run(
      sql.raw(
        `select count(*) as c from updates where batch_id = '${BATCH_ID}' and created_at > 9999999999`
      )
    )
  ).rows[0] as any;
  console.log(`2. Audit rows with ms-encoded created_at:    ${msEncodedNew.c}  (expected 0)`);

  // 3. Convergix project counts
  const projectCount = (
    await db.run(
      sql.raw(
        `select count(*) as c from projects where client_id = (select id from clients where slug = 'convergix')`
      )
    )
  ).rows[0] as any;
  console.log(`3. Convergix projects:                       ${projectCount.c}  (was 16, now should be 20 after 4 creates)`);

  // 4. Convergix week_item counts
  const taskCount = (
    await db.run(
      sql.raw(
        `select count(*) as c from week_items where client_id = (select id from clients where slug = 'convergix')`
      )
    )
  ).rows[0] as any;
  console.log(`4. Convergix week_items:                     ${taskCount.c}  (was 30, now should be 30 - 2 deletes + 5 creates = 33)`);

  // 5. Convergix week_items with NULL status
  const nullStatusCount = (
    await db.run(
      sql.raw(
        `select count(*) as c from week_items where client_id = (select id from clients where slug = 'convergix') and status is null`
      )
    )
  ).rows[0] as any;
  console.log(`5. Convergix week_items with NULL status:    ${nullStatusCount.c}  (should be 0 — all resolved per-row)`);

  // 6. Confirm 4 monthly Social Content L1s exist
  const socialProjects = (
    await db.run(
      sql.raw(
        `select name, status, start_date, end_date from projects where client_id = (select id from clients where slug = 'convergix') and name like 'Social Content%' order by name`
      )
    )
  ).rows as any[];
  console.log(`\n6. Social Content L1s (expected 4 monthly):`);
  for (const p of socialProjects) {
    console.log(`   - ${p.name}: [${p.status}] start=${p.start_date ?? "∅"} end=${p.end_date ?? "∅"}`);
  }

  // 7. Confirm Assembly Project exists with 7/31 anchor
  const assemblyProject = (
    await db.run(
      sql.raw(
        `select id, name, status, start_date, end_date, contract_start, contract_end from projects where name = 'Industrial/Battery Assembly Campaign'`
      )
    )
  ).rows as any[];
  console.log(`\n7. Industrial/Battery Assembly Campaign:`);
  for (const p of assemblyProject) {
    console.log(`   - [${p.status}] start=${p.start_date ?? "∅"} end=${p.end_date ?? "∅"} contract=${p.contract_start}..${p.contract_end}`);
    const assemblyTasks = (
      await db.run(
        sql.raw(`select title, status, start_date, end_date from week_items where project_id = '${p.id}' order by start_date`)
      )
    ).rows as any[];
    for (const t of assemblyTasks) {
      console.log(`     * [${t.status}] ${t.title} (${t.start_date}..${t.end_date ?? "∅"})`);
    }
  }

  // 8. Confirm Industry Vertical Campaigns renamed to CDS Vertical Campaign
  const cdsProject = (
    await db.run(
      sql.raw(
        `select name, start_date, end_date from projects where id = '0e4214c60728476db177f4de1'`
      )
    )
  ).rows[0] as any;
  console.log(`\n8. Renamed IVC project:                      ${cdsProject.name}`);
  console.log(`   dates: start=${cdsProject.start_date} end=${cdsProject.end_date}  (expected 2026-04-23..2026-05-14)`);

  // 9. Confirm Brand Guide v2 renamed and dates correct
  const brandGuide = (
    await db.run(
      sql.raw(
        `select name, start_date, end_date from projects where id = '51f39e5cdfbe446992aa155d6'`
      )
    )
  ).rows[0] as any;
  console.log(`\n9. Brand Guide project:                      ${brandGuide.name}`);
  console.log(`   dates: start=${brandGuide.start_date} end=${brandGuide.end_date}  (expected 2026-04-23..2026-04-23)`);

  // 10. Confirm Corporate Collateral L1 date range
  const corpProject = (
    await db.run(
      sql.raw(
        `select name, start_date, end_date from projects where id = '65b2cac113a048f592867a71c'`
      )
    )
  ).rows[0] as any;
  console.log(`\n10. Corporate Collateral L1 dates:`);
  console.log(`   start=${corpProject.start_date} end=${corpProject.end_date}  (5/15-5/15 = OK but note: kickoff L2s also shifted to 5/15; consider reverting to retain "work ongoing since 4/30" signal)`);

  // 11. Retainer Period Close Task deleted
  const deletedTask = (
    await db.run(
      sql.raw(
        `select count(*) as c from week_items where id = '456194e50c474995ba12289c47099646'`
      )
    )
  ).rows[0] as any;
  console.log(`\n11. Industry Verticals — Retainer Period Close deleted:  ${deletedTask.c === 0 ? "YES ✓" : "STILL EXISTS ✗"}`);

  // 12. Social Announcement Companion deleted
  const deletedTask2 = (
    await db.run(
      sql.raw(
        `select count(*) as c from week_items where id = '6a3833a8bad44a6289798b093'`
      )
    )
  ).rows[0] as any;
  console.log(`12. Big Win Template — Social Announcement Companion deleted:  ${deletedTask2.c === 0 ? "YES ✓" : "STILL EXISTS ✗"}`);

  // 13. Jamie Nelson Connect moved to Assembly Project
  const jamieTask = (
    await db.run(
      sql.raw(
        `select project_id from week_items where id = 'e9f423ef54394ae39b1620d39'`
      )
    )
  ).rows[0] as any;
  const assemblyId = (assemblyProject[0] as any)?.id;
  console.log(
    `13. Jamie Nelson Connect moved:              ${jamieTask.project_id === assemblyId ? "YES ✓" : `WRONG — at ${jamieTask.project_id}`}`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
