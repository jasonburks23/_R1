/**
 * Detailed per-row inspection of prod Runway DB. Read-only.
 *   - Full project list with all v4 fields
 *   - Raw created_at samples from recent updates (timestamp mode check)
 *   - NULL-engagement_type project detail
 *   - week_items NULL status breakdown by client
 */

import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql } from "drizzle-orm";

type Row = Record<string, unknown>;
async function all(db: ReturnType<typeof createRunwayDb>["db"], q: string): Promise<Row[]> {
  const res = await db.run(sql.raw(q));
  return res.rows as unknown as Row[];
}

async function main() {
  const { db } = createRunwayDb();

  // Full project list, grouped by client slug
  const projects = await all(db, `
    select p.id, p.name, c.slug as client, p.engagement_type, p.status, p.category,
           p.owner, p.resources, p.waiting_on, p.start_date, p.end_date,
           p.contract_start, p.contract_end, p.parent_project_id, p.stale_days, p.notes
    from projects p
    left join clients c on p.client_id = c.id
    order by c.slug, p.sort_order
  `);
  console.log(`# PROJECTS (${projects.length}) — full v4 view\n`);
  let lastClient: string | null = null;
  for (const p of projects) {
    if (p.client !== lastClient) {
      console.log(`\n## ${p.client}`);
      lastClient = p.client as string;
    }
    const dates = `start=${p.start_date ?? "∅"} end=${p.end_date ?? "∅"} contract=${p.contract_start ?? "∅"}..${p.contract_end ?? "∅"}`;
    const parent = p.parent_project_id ? `  parent=${p.parent_project_id}` : "";
    const stale = p.stale_days != null ? ` stale=${p.stale_days}` : "";
    const notesSnippet = p.notes ? (String(p.notes).slice(0, 60).replace(/\s+/g, " ") + (String(p.notes).length > 60 ? "…" : "")) : "";
    console.log(`  [${p.engagement_type ?? "NULL-engagement"} / ${p.status ?? "NULL-status"} / ${p.category ?? "NULL-cat"}] "${p.name}"`);
    console.log(`    id=${p.id}${parent}${stale}`);
    console.log(`    owner=${p.owner ?? "∅"}  resources=${p.resources ?? "∅"}  waiting=${p.waiting_on ?? "∅"}`);
    console.log(`    ${dates}`);
    if (notesSnippet) console.log(`    notes: ${notesSnippet}`);
  }

  // Raw timestamp samples
  console.log(`\n\n# UPDATES: raw created_at by batch (timestamp-mode check)\n`);
  const sample = await all(db, `
    select batch_id, created_at, count(*) as n
    from updates
    where batch_id in ('hotsheet-cleanup-2026-04-22','target-to-notes-raw-2026-04-21','retainer-v4-cleanup-2026-04-21-retry','bonterra-cleanup-2026-04-19','convergix-v4-realign-2026-04-21')
    group by batch_id, created_at
    order by batch_id, created_at
    limit 30
  `);
  for (const r of sample) {
    const raw = r.created_at as number;
    const asSec = new Date(raw * 1000).toISOString();
    const asMs = new Date(raw).toISOString();
    console.log(`  batch=${r.batch_id}  n=${r.n}  raw=${raw}  if-seconds=${asSec}  if-ms=${asMs}`);
  }

  // NULL engagement_type projects
  console.log(`\n\n# PROJECTS with NULL engagement_type\n`);
  const nullEng = await all(db, `
    select p.id, p.name, c.slug, p.status, p.category, p.start_date, p.end_date
    from projects p
    left join clients c on p.client_id = c.id
    where p.engagement_type is null
    order by c.slug, p.name
  `);
  for (const p of nullEng) {
    console.log(`  ${p.slug}  [${p.status}/${p.category}]  "${p.name}"  dates=${p.start_date ?? "∅"}..${p.end_date ?? "∅"}  id=${p.id}`);
  }

  // NULL status week_items by client
  console.log(`\n\n# week_items NULL status by client\n`);
  const nullWeek = await all(db, `
    select c.slug, count(*) as n
    from week_items w
    left join clients c on w.client_id = c.id
    where w.status is null
    group by c.slug
    order by n desc
  `);
  for (const r of nullWeek) console.log(`  ${r.slug}: ${r.n}`);

  // Retainer family check: list every retainer with client + children count
  console.log(`\n\n# RETAINERS (engagement_type='retainer')\n`);
  const retainers = await all(db, `
    select p.id, p.name, c.slug as client, p.status, p.start_date, p.end_date,
           p.contract_start, p.contract_end, p.parent_project_id,
           (select count(*) from projects child where child.parent_project_id = p.id) as child_count,
           (select count(*) from week_items w where w.project_id = p.id) as week_item_count
    from projects p
    left join clients c on p.client_id = c.id
    where p.engagement_type = 'retainer'
    order by c.slug, p.name
  `);
  for (const r of retainers) {
    console.log(`  ${r.client}  "${r.name}"  status=${r.status}  contract=${r.contract_start}..${r.contract_end}  computed=${r.start_date}..${r.end_date}  kids=${r.child_count}  L2s=${r.week_item_count}`);
  }

  // All week_item status/category combos
  console.log(`\n\n# week_items: category × status\n`);
  const combos = await all(db, `
    select category, status, count(*) as n
    from week_items
    group by category, status
    order by category, status
  `);
  for (const r of combos) console.log(`  category=${r.category ?? "NULL"}  status=${r.status ?? "NULL"}  n=${r.n}`);

  console.log("\n# done");
}

main().catch((e) => { console.error(e); process.exit(1); });
