/**
 * Read-only integrity audit of the Runway production DB.
 * Run from worktree root: npx tsx docs/tmp/data-integrity-audit/audit.ts
 *
 * Pure SELECT queries. Zero writes. Zero mutations.
 * Output piped to docs/tmp/data-integrity-audit/report.md by caller.
 */

import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql } from "drizzle-orm";

type Row = Record<string, unknown>;

async function all(db: ReturnType<typeof createRunwayDb>["db"], q: string): Promise<Row[]> {
  const res = await db.run(sql.raw(q));
  return res.rows as unknown as Row[];
}

async function main() {
  const { db, url } = createRunwayDb();
  console.log(`# Integrity audit — ${url}`);
  console.log(`Generated: ${new Date().toISOString()}\n`);

  const clients = await all(db, "select id, slug, name, team, contract_status from clients order by slug");
  console.log(`## clients (${clients.length})`);
  for (const c of clients) {
    console.log(`  - ${c.slug}  [${c.name}]  team=${c.team ?? "∅"}  contract=${c.contract_status ?? "∅"}`);
  }

  const projects = await all(db, "select * from projects order by client_id, sort_order");
  console.log(`\n## projects (${projects.length})`);

  const byEngagement = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const wrappers: Row[] = [];
  const children: Row[] = [];
  const dateFields: Record<string, number> = {
    start_date: 0, end_date: 0, contract_start: 0, contract_end: 0, due_date: 0,
  };

  for (const p of projects) {
    const e = (p.engagement_type as string) ?? "NULL";
    const s = (p.status as string) ?? "NULL";
    const c = (p.category as string) ?? "NULL";
    byEngagement.set(e, (byEngagement.get(e) ?? 0) + 1);
    byStatus.set(s, (byStatus.get(s) ?? 0) + 1);
    byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
    if (p.parent_project_id) children.push(p);
    for (const f of Object.keys(dateFields)) {
      if (p[f]) dateFields[f]++;
    }
  }

  const parentIds = new Set(children.map((c) => c.parent_project_id));
  for (const p of projects) if (parentIds.has(p.id)) wrappers.push(p);

  console.log(`\n### engagement_type distribution`);
  for (const [k, v] of byEngagement) console.log(`  ${k}: ${v}`);
  console.log(`\n### status distribution`);
  for (const [k, v] of byStatus) console.log(`  ${k}: ${v}`);
  console.log(`\n### category distribution`);
  for (const [k, v] of byCategory) console.log(`  ${k}: ${v}`);
  console.log(`\n### date-field presence (non-null counts)`);
  for (const [k, v] of Object.entries(dateFields)) console.log(`  ${k}: ${v}/${projects.length}`);

  console.log(`\n### wrappers (projects referenced as parent_project_id) — ${wrappers.length}`);
  for (const w of wrappers) {
    const kids = children.filter((c) => c.parent_project_id === w.id);
    console.log(`  wrapper=${w.id} name="${w.name}" client=${w.client_id} engagement=${w.engagement_type} status=${w.status} kids=${kids.length}`);
    for (const k of kids) {
      console.log(`    └─ child=${k.id} name="${k.name}" engagement=${k.engagement_type} status=${k.status} start=${k.start_date} end=${k.end_date}`);
    }
  }

  const projIds = new Set(projects.map((p) => p.id));
  const orphans = children.filter((c) => !projIds.has(c.parent_project_id));
  console.log(`\n### orphan children (parent_project_id points nowhere): ${orphans.length}`);
  for (const o of orphans) console.log(`  ${o.id} "${o.name}" → parent=${o.parent_project_id}`);

  const retainers = projects.filter((p) => p.engagement_type === "retainer");
  const retNoContract = retainers.filter((p) => !p.contract_start || !p.contract_end);
  console.log(`\n### retainers without full contract dates: ${retNoContract.length}/${retainers.length}`);
  for (const r of retNoContract) {
    console.log(`  ${r.id} "${r.name}" client=${r.client_id} start=${r.contract_start ?? "∅"} end=${r.contract_end ?? "∅"} parent=${r.parent_project_id ?? "∅"}`);
  }

  const clientIds = new Set(clients.map((c) => c.id));
  const badClient = projects.filter((p) => !p.client_id || !clientIds.has(p.client_id));
  console.log(`\n### projects with missing/unknown client_id: ${badClient.length}`);
  for (const p of badClient) console.log(`  ${p.id} "${p.name}" client=${p.client_id}`);

  const weekItems = await all(db, "select * from week_items order by week_of, sort_order");
  console.log(`\n## week_items (${weekItems.length})`);
  const wiStatus = new Map<string, number>();
  const wiCategory = new Map<string, number>();
  let wiNoStart = 0, wiNoProject = 0, wiBadProject = 0, wiBadClient = 0;
  const blockedByBad: Row[] = [];
  const wiIdSet = new Set(weekItems.map((w) => w.id));

  for (const w of weekItems) {
    const s = (w.status as string) ?? "NULL";
    const c = (w.category as string) ?? "NULL";
    wiStatus.set(s, (wiStatus.get(s) ?? 0) + 1);
    wiCategory.set(c, (wiCategory.get(c) ?? 0) + 1);
    if (!w.start_date) wiNoStart++;
    if (!w.project_id) wiNoProject++;
    else if (!projIds.has(w.project_id)) wiBadProject++;
    if (w.client_id && !clientIds.has(w.client_id)) wiBadClient++;
    if (w.blocked_by) {
      try {
        const arr = JSON.parse(w.blocked_by as string) as string[];
        for (const bid of arr) if (!wiIdSet.has(bid)) { blockedByBad.push(w); break; }
      } catch {
        blockedByBad.push(w);
      }
    }
  }
  console.log(`\n### week_item status distribution`);
  for (const [k, v] of wiStatus) console.log(`  ${k}: ${v}`);
  console.log(`\n### week_item category distribution`);
  for (const [k, v] of wiCategory) console.log(`  ${k}: ${v}`);
  console.log(`\n### week_item integrity`);
  console.log(`  missing start_date: ${wiNoStart}`);
  console.log(`  missing project_id: ${wiNoProject}`);
  console.log(`  project_id points nowhere: ${wiBadProject}`);
  console.log(`  client_id points nowhere: ${wiBadClient}`);
  console.log(`  blocked_by malformed/unknown: ${blockedByBad.length}`);
  for (const b of blockedByBad) console.log(`    ${b.id} "${b.title}" blocked_by=${b.blocked_by}`);

  const nullStatus = weekItems.filter((w) => !w.status);
  console.log(`\n### week_items with NULL status: ${nullStatus.length}`);
  for (const w of nullStatus.slice(0, 30)) {
    console.log(`  ${w.id} "${w.title}" project=${w.project_id} category=${w.category} start=${w.start_date}`);
  }
  if (nullStatus.length > 30) console.log(`  …${nullStatus.length - 30} more`);

  const vp = await all(db, "select * from view_preferences");
  console.log(`\n## view_preferences (${vp.length})`);
  for (const r of vp) console.log(`  scope=${r.scope} prefs=${r.preferences}`);

  const upd = await all(db, "select count(*) as n from updates");
  const recent = await all(db, "select update_type, count(*) as n from updates group by update_type order by n desc");
  console.log(`\n## updates (${upd[0]?.n})`);
  for (const r of recent) console.log(`  ${r.update_type}: ${r.n}`);

  const batches = await all(db, "select batch_id, count(*) as n, min(created_at) as first, max(created_at) as last from updates where batch_id is not null group by batch_id order by last desc limit 20");
  console.log(`\n### recent update batches (top 20 by last)`);
  for (const r of batches) {
    const first = new Date((r.first as number) * 1000).toISOString();
    const last = new Date((r.last as number) * 1000).toISOString();
    console.log(`  batch=${r.batch_id} n=${r.n} span=${first} → ${last}`);
  }

  console.log("\n# done");
}

main().catch((e) => { console.error(e); process.exit(1); });
