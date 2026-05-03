/**
 * Convergix Kathy Cleanup Batch — 2026-04-22
 *
 * DRY_RUN by default. Set APPLY=1 to execute.
 * Set UPDATED_BY_SUFFIX=runN to bump updated_by on retries (avoids idempotency poisoning).
 *
 * Plan: see docs/tmp/data-integrity-audit/convergix-batch-plan.md
 * Kathy replies: see docs/tmp/data-integrity-audit/convergix-kathy-replies.md
 * Pre-batch snapshot: see docs/tmp/data-integrity-audit/convergix-full-state.txt
 *
 * Architecture:
 * - Direct drizzle writes wrapped in a single db.transaction for atomicity.
 * - Every write inserts an audit row into `updates` with batch_id + updated_by.
 * - After every L2 date-affecting change (create, start/end change, delete, project_id move),
 *   recomputeProjectDatesWith() is called on affected project(s) inside same tx.
 * - L1 startDate/endDate are NEVER written directly (NOT in PROJECT_FIELDS whitelist;
 *   sanctioned path is recomputeProjectDates per operations-utils.ts:325 comment).
 *
 * Pre-validators:
 * - Field whitelist: PROJECT_FIELDS / WEEK_ITEM_FIELDS
 * - Status enums
 * - Category enums
 * - Row existence check against fresh read of prod
 */

import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql, eq, and } from "drizzle-orm";
import {
  clients,
  projects,
  weekItems,
  updates,
} from "../../../src/lib/db/runway-schema";
import {
  setBatchId,
  generateId,
  PROJECT_FIELDS,
  WEEK_ITEM_FIELDS,
  PROJECT_FIELD_TO_COLUMN,
  WEEK_ITEM_FIELD_TO_COLUMN,
} from "../../../src/lib/runway/operations-utils";
import { recomputeProjectDatesWith } from "../../../src/lib/runway/operations-writes-week";

const BATCH_ID = "convergix-kathy-cleanup-2026-04-22";
const UPDATED_BY = `convergix-kathy-cleanup-2026-04-22-${process.env.UPDATED_BY_SUFFIX ?? "run1"}`;
const APPLY = process.env.APPLY === "1";

// ───────────────────── Known IDs (from convergix-full-state.txt) ─────────────────────

const PROJ = {
  automate_booth: "272e7eef7f554c03947d9b103d5dee80",
  big_win: "0157c4232d5c4db58333bb744",
  brand_guide: "51f39e5cdfbe446992aa155d6",
  certs_page: "68a4ee3791b24d72abb5afc62",
  corp_collateral: "65b2cac113a048f592867a71c",
  events_page: "135c5a61d5c343b1b5b39fe08",
  fanuc: "3d5215f4a3964f38a1b2afda0",
  ivc: "0e4214c60728476db177f4de1", // renames to "CDS Vertical Campaign"
  new_capacity: "0c208308ff48427092776c0da",
  rockwell_co: "1923fc1a36524a9c810a73763",
  rockwell_partner: "394f9e5e5b864c2eb2260f468",
  social_april: "f391dff5ceaf45279a807ace9", // renames to "Social Content — April 2026"
  ti: "c0935359406e40709a0790372",
};

const TASK = {
  big_win_ppt: "9d2f190311c1462797b4761df",
  big_win_social_announcement: "6a3833a8bad44a6289798b093",
  brand_guide_l2: "ac4ca38a1de746cfbae01c759",
  certs_daniel_followup: "4bdaf887d26f4c9fa0d8a85af",
  corp_brochure_updates: "43701263775d49c7a0f17ae60",
  corp_ppt_updates: "c13178e12ca3476fb88db9d92",
  corp_v2026_live: "59726e491993406aae4320049fba2f1a",
  fanuc_pre_event: "13bba3b1b3a043bc8ab63e322",
  fanuc_post_event: "c1d8bd92710d4ecabde903bf6",
  ivc_retainer_close: "456194e50c474995ba12289c47099646",
  ivc_jamie_nelson: "e9f423ef54394ae39b1620d39",
  ivc_cds_wrapper: "be6c1dbf748445a89d6666eea",
  ivc_cds_messaging: "19f89ecf8b0241e5a4cae45f6",
  ivc_cds_landing: "813b04a5917a44caa71e4e3bd",
  ivc_cds_brochure: "46bce31494d146378ef0719db",
  ivc_cds_social_posts: "eaf0ac303eb240a8b2b946443",
  may_content_calendar: "66414d4db2d14fa1aa223bc7e",
  new_capacity_brochure: "767ace3ee00a4a1fb7cd8a757",
  new_capacity_one_pager: "87a1c36509814c1586c60a2a2",
  ti_page_build: "35b86e337b0d4f2b95370bbf9",
};

// New IDs generated at runtime (deterministic per run via pre-generated, not during tx)
const NEW = {
  assembly_project: generateId(),
  social_may: generateId(),
  social_june: generateId(),
  social_july: generateId(),
  events_staging_task: generateId(),
  new_capacity_ppt_complete_task: generateId(),
  rockwell_nicole_task: generateId(),
  cds_case_study_task: generateId(),
  assembly_completion_task: generateId(),
};

// ───────────────────── Enum universes (authoritative per schema) ─────────────────────

const PROJECT_STATUS_ENUM = new Set([
  "in-production", "awaiting-client", "not-started", "blocked", "on-hold", "completed",
]);
const PROJECT_CATEGORY_ENUM = new Set([
  "active", "awaiting-client", "pipeline", "on-hold", "completed",
]);
const PROJECT_ENGAGEMENT_ENUM = new Set(["project", "retainer", "break-fix"]);
const WEEK_ITEM_STATUS_ENUM = new Set([
  "completed", "in-progress", "blocked", "at-risk", "scheduled", "canceled",
]);
const WEEK_ITEM_CATEGORY_ENUM = new Set([
  "delivery", "review", "kickoff", "deadline", "approval", "launch",
]);

// ───────────────────── Write declarations ─────────────────────

type Write =
  | { kind: "project_create"; id: string; data: typeof projects.$inferInsert; summary: string }
  | { kind: "project_field"; projectId: string; field: string; newValue: string | null; summary: string }
  | { kind: "project_status"; projectId: string; newValue: string; summary: string }
  | { kind: "week_item_create"; id: string; data: typeof weekItems.$inferInsert; summary: string }
  | { kind: "week_item_field"; weekItemId: string; field: string; newValue: string | null; summary: string }
  | { kind: "week_item_delete"; weekItemId: string; summary: string }
  | { kind: "week_item_move"; weekItemId: string; fromProjectId: string; toProjectId: string; newWeekOf: string; newDayOfWeek: string; summary: string };

/**
 * Helper to build a fully-populated projects insert row.
 * L1 startDate/endDate intentionally null; they get populated by
 * recomputeProjectDatesWith after L2 children land.
 */
function buildProjectInsert(params: {
  id: string;
  clientId: string;
  name: string;
  status: string;
  category: string;
  engagementType: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  owner: string | null;
  resources: string | null;
  waitingOn: string | null;
  notes: string | null;
  sortOrder: number;
}): typeof projects.$inferInsert {
  return {
    id: params.id,
    clientId: params.clientId,
    name: params.name,
    status: params.status,
    category: params.category,
    owner: params.owner,
    resources: params.resources,
    dueDate: null,
    startDate: null, // recompute-populated
    endDate: null, // recompute-populated
    contractStart: params.contractStart,
    contractEnd: params.contractEnd,
    engagementType: params.engagementType,
    parentProjectId: null, // wrapper migration deferred
    waitingOn: params.waitingOn,
    notes: params.notes,
    staleDays: null,
    sortOrder: params.sortOrder,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildWeekItemInsert(params: {
  id: string;
  projectId: string;
  clientId: string;
  dayOfWeek: string;
  weekOf: string;
  startDate: string;
  endDate: string | null;
  title: string;
  status: string | null;
  category: string;
  owner: string | null;
  resources: string | null;
  notes: string | null;
  sortOrder?: number;
}): typeof weekItems.$inferInsert {
  return {
    id: params.id,
    projectId: params.projectId,
    clientId: params.clientId,
    dayOfWeek: params.dayOfWeek,
    weekOf: params.weekOf,
    date: params.startDate, // legacy mirror
    startDate: params.startDate,
    endDate: params.endDate,
    blockedBy: null,
    title: params.title,
    status: params.status,
    category: params.category,
    owner: params.owner,
    resources: params.resources,
    notes: params.notes,
    sortOrder: params.sortOrder ?? 999,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ───────────────────── Main ─────────────────────

async function main() {
  const { db } = createRunwayDb();

  // Resolve Convergix client id
  const clientRow = (
    await db.select().from(clients).where(eq(clients.slug, "convergix"))
  )[0];
  if (!clientRow) throw new Error("Convergix client not found");
  const CONVERGIX_ID = clientRow.id;

  console.log(`\n=== Convergix Kathy Cleanup Batch ===`);
  console.log(`Batch ID:   ${BATCH_ID}`);
  console.log(`Updated By: ${UPDATED_BY}`);
  console.log(`Mode:       ${APPLY ? "APPLY (WILL WRITE TO PROD)" : "DRY_RUN (read + plan only)"}`);
  console.log(`Convergix client id: ${CONVERGIX_ID}\n`);

  // ────────────── Assemble writes ──────────────

  const writes: Write[] = [];

  // 1. Big Win Template — Kathy explicit status + date updates + delete Companion
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.big_win_ppt,
    field: "status",
    newValue: "in-progress",
    summary: "Kathy Q5b: flip to in-progress (actively worked)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.big_win_ppt,
    field: "startDate",
    newValue: "2026-04-22",
    summary: "Kathy Q5b: going to client today 4/22",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.big_win_ppt,
    field: "date",
    newValue: "2026-04-22",
    summary: "Mirror legacy date column to new startDate",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.big_win_ppt,
    field: "dayOfWeek",
    newValue: "wednesday",
    summary: "2026-04-22 is Wednesday (startDate change from Fri 4/24)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.big_win_ppt,
    field: "endDate",
    newValue: "2026-04-23",
    summary: "Kathy Q5b: target EOD 4/23",
  });
  writes.push({
    kind: "week_item_delete",
    weekItemId: TASK.big_win_social_announcement,
    summary: "Kathy Q5b: Social Announcement Companion dropped (out of scope)",
  });

  // 2. Events Page — add staging L2 Task
  writes.push({
    kind: "week_item_create",
    id: NEW.events_staging_task,
    data: buildWeekItemInsert({
      id: NEW.events_staging_task,
      projectId: PROJ.events_page,
      clientId: CONVERGIX_ID,
      dayOfWeek: "thursday", // 2026-04-30 is Thursday
      weekOf: "2026-04-27",
      startDate: "2026-04-30",
      endDate: "2026-04-30",
      title: "Events Page — Staging",
      status: "scheduled",
      category: "deadline",
      owner: "Kathy",
      resources: "Dev: Leslie",
      notes: "Staging ready target per Kathy Q1b (2026-04-30). Live-by is AISTech 5/4.",
    }),
    summary: "Kathy Q1b: staging ready by 4/30 (before AISTech 5/4)",
  });

  // 3. Social Content — monthly L1 split (rename existing + create 3 new + move May Calendar Task)
  writes.push({
    kind: "project_field",
    projectId: PROJ.social_april,
    field: "name",
    newValue: "Social Content — April 2026",
    summary: "Split to monthly L1s: rename existing to April 2026",
  });
  writes.push({
    kind: "project_field",
    projectId: PROJ.social_april,
    field: "notes",
    newValue:
      "April 2026 content execution under Convergix retainer. 4 posts Week of 4/20 completed 4/27. Monthly cadence: each month gets its own L1 Project through retainer end (2026-07-31).",
    summary: "Split to monthly L1s: update April notes",
  });
  writes.push({
    kind: "project_create",
    id: NEW.social_may,
    data: buildProjectInsert({
      id: NEW.social_may,
      clientId: CONVERGIX_ID,
      name: "Social Content — May 2026",
      status: "in-production",
      category: "active",
      engagementType: "retainer",
      contractStart: "2026-02-01",
      contractEnd: "2026-07-31",
      owner: "Kathy",
      resources: "CW: Kathy, CD: Lane",
      waitingOn: null,
      notes:
        "May 2026 content execution under Convergix retainer. May calendar draft due 2026-04-27. Weekly posts through May.",
      sortOrder: 101,
    }),
    summary: "Monthly L1 split: create Social Content — May 2026",
  });
  writes.push({
    kind: "project_create",
    id: NEW.social_june,
    data: buildProjectInsert({
      id: NEW.social_june,
      clientId: CONVERGIX_ID,
      name: "Social Content — June 2026",
      status: "not-started",
      category: "active",
      engagementType: "retainer",
      contractStart: "2026-02-01",
      contractEnd: "2026-07-31",
      owner: "Kathy",
      resources: "CW: Kathy, CD: Lane",
      waitingOn: null,
      notes:
        "June 2026 content execution under Convergix retainer. Tasks added as planning develops.",
      sortOrder: 102,
    }),
    summary: "Monthly L1 split: create Social Content — June 2026",
  });
  writes.push({
    kind: "project_create",
    id: NEW.social_july,
    data: buildProjectInsert({
      id: NEW.social_july,
      clientId: CONVERGIX_ID,
      name: "Social Content — July 2026",
      status: "not-started",
      category: "active",
      engagementType: "retainer",
      contractStart: "2026-02-01",
      contractEnd: "2026-07-31",
      owner: "Kathy",
      resources: "CW: Kathy, CD: Lane",
      waitingOn: null,
      notes:
        "July 2026 content execution under Convergix retainer. Final retainer month (ends 2026-07-31).",
      sortOrder: 103,
    }),
    summary: "Monthly L1 split: create Social Content — July 2026",
  });
  // Renumber April's sort_order to cluster with new monthly L1s.
  writes.push({
    kind: "project_field",
    projectId: PROJ.social_april,
    field: "sortOrder",
    newValue: "100",
    summary: "Monthly L1 split: cluster April with May/June/July (sort_order 100)",
  });
  // Move May Content Calendar Task from April L1 → May L1 + flip NULL status → in-progress
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.may_content_calendar,
    field: "status",
    newValue: "in-progress",
    summary: "NULL → in-progress: Kathy actively planning May calendar this week",
  });
  writes.push({
    kind: "week_item_move",
    weekItemId: TASK.may_content_calendar,
    fromProjectId: PROJ.social_april,
    toProjectId: NEW.social_may,
    newWeekOf: "2026-04-27",
    newDayOfWeek: "monday",
    summary: "Move May Content Calendar Task: April L1 → May L1",
  });

  // 4. Brand Guide v2 — rename + date correction + status flip
  writes.push({
    kind: "project_field",
    projectId: PROJ.brand_guide,
    field: "name",
    newValue: "Brand Guide v2",
    summary: "Kathy Q5a: dropping secondary palette from scope; rename",
  });
  writes.push({
    kind: "project_field",
    projectId: PROJ.brand_guide,
    field: "notes",
    newValue:
      "Secondary color palette + Microsoft Icons swap underway. Kathy Q5a 2026-04-22: dropping secondary palette from scope; Microsoft icons swap remains. Final files to Nicole 2026-04-23.",
    summary: "Kathy Q5a: notes update re: scope change",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.brand_guide_l2,
    field: "title",
    newValue: "Brand Guide v2 — Final Files to Nicole",
    summary: "Kathy Q5a: retitle to reflect what's actually being shipped",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.brand_guide_l2,
    field: "status",
    newValue: "in-progress",
    summary: "Kathy Q5a: work resumed, final files tomorrow",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.brand_guide_l2,
    field: "startDate",
    newValue: "2026-04-23",
    summary: "Kathy Q5a: final files to Nicole 4/23 (hot sheet was right)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.brand_guide_l2,
    field: "date",
    newValue: "2026-04-23",
    summary: "Mirror legacy date column to new startDate",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.brand_guide_l2,
    field: "endDate",
    newValue: "2026-04-23",
    summary: "Kathy Q5a: one-day deliverable",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.brand_guide_l2,
    field: "weekOf",
    newValue: "2026-04-20",
    summary: "Monday of week of 4/23 (pre-batch weekOf was 2026-04-27 for old 4/30 startDate)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.brand_guide_l2,
    field: "dayOfWeek",
    newValue: "thursday",
    summary: "2026-04-23 is Thursday",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.brand_guide_l2,
    field: "notes",
    newValue:
      "Final files to Nicole 2026-04-23. Secondary palette dropped from scope per Kathy Q5a 2026-04-22. Microsoft icons swap remains.",
    summary: "Kathy Q5a: notes update re: scope change",
  });

  // 5. Certifications Page — clear past L1 notes mention (end_date NOT directly written; recompute handles)
  writes.push({
    kind: "project_field",
    projectId: PROJ.certs_page,
    field: "notes",
    newValue:
      "Logo soup — add new partner/certification logos. Daniel to share logos + info. Pending 2+ weeks. Also upstream blocker for Corporate Collateral Updates. Siemens logo live on partners page 2026-04-21 (Leslie). Remaining: Daniel's cert logos + info. Kathy Q2b 2026-04-22: wraps within 1 week of Daniel's cert delivery; end date will be set on delivery.",
    summary: "Kathy Q2b: wraps within 1 week of Daniel delivery",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.certs_daniel_followup,
    field: "notes",
    newValue:
      "Follow up with Daniel on cert logos + info. Pending 2+ weeks. Will unblock Corporate Collateral Updates. Per Kathy Q2b 2026-04-22: wraps within 1 week of Daniel delivering certs.",
    summary: "Kathy Q2b: notes update",
  });
  // Note: end_date on cert page L1 (currently 2026-04-23, past) will be cleared
  // via recompute — L2 task has endDate=NULL, so recompute will produce endDate=null on L1.

  // 6. Corporate Collateral Updates — Kathy correction + Live Task date shift + status
  writes.push({
    kind: "project_field",
    projectId: PROJ.corp_collateral,
    field: "notes",
    newValue:
      "Brochure + PPT already built — waiting on Daniel's certs + Fanuc award details to finalize updates. Kathy Q2b 2026-04-22: wraps within 1 week of info receipt. 5/15 placeholder end date on Live Task per operator (Daniel-dragging-2+weeks best-guess); update when Daniel delivers.",
    summary: "Kathy Q2b: correction — brochure + PPT done, awaiting Daniel info",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_v2026_live,
    field: "status",
    newValue: "blocked",
    summary: "NULL → blocked: Daniel-blocked per Kathy Q2b",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_v2026_live,
    field: "startDate",
    newValue: "2026-05-15",
    summary: "Operator call: 5/15 placeholder (was mystery 6/30 Kathy flagged)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_v2026_live,
    field: "date",
    newValue: "2026-05-15",
    summary: "Mirror legacy date column to new startDate",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_v2026_live,
    field: "endDate",
    newValue: "2026-05-15",
    summary: "Operator call: 5/15 placeholder",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_v2026_live,
    field: "weekOf",
    newValue: "2026-05-11",
    summary: "Monday of week of 5/15",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_v2026_live,
    field: "dayOfWeek",
    newValue: "friday",
    summary: "2026-05-15 is Friday",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_v2026_live,
    field: "notes",
    newValue:
      "Placeholder end date 2026-05-15 per operator (Daniel-dragging-2+weeks best-guess). Actual = Daniel delivery + 7 days per Kathy Q2b 2026-04-22. Flip date when Daniel delivers. Status: blocked on Daniel certs + Fanuc award details.",
    summary: "Kathy Q2b + operator call: notes update re: placeholder + real date",
  });
  // Kathy Q2b correction: brochure + PPT are "already done" — shift kickoff L2 dates to align with Live (5/15)
  // and update notes so Kathy's correction is reflected on the child rows (not just L1 notes).
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_brochure_updates,
    field: "startDate",
    newValue: "2026-05-15",
    summary: "Kathy Q2b: already done, awaiting Daniel info; align with Live target",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_brochure_updates,
    field: "date",
    newValue: "2026-05-15",
    summary: "Mirror legacy date column to new startDate",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_brochure_updates,
    field: "weekOf",
    newValue: "2026-05-11",
    summary: "Monday of week of 5/15",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_brochure_updates,
    field: "dayOfWeek",
    newValue: "friday",
    summary: "2026-05-15 is Friday",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_brochure_updates,
    field: "notes",
    newValue:
      "Scope: Passion Icon replacement, Awards + Certifications section, Siemens logo to partners bottom row. Kathy Q2b 2026-04-22: brochure already built — just need certs + Fanuc info to finalize. Turnaround 1 week from Daniel delivery. 2026-05-15 is placeholder Live target (update when Daniel delivers).",
    summary: "Kathy Q2b: notes update re: already-done framing",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_ppt_updates,
    field: "startDate",
    newValue: "2026-05-15",
    summary: "Kathy Q2b: already done, awaiting Daniel info; align with Live target",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_ppt_updates,
    field: "date",
    newValue: "2026-05-15",
    summary: "Mirror legacy date column to new startDate",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_ppt_updates,
    field: "weekOf",
    newValue: "2026-05-11",
    summary: "Monday of week of 5/15",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_ppt_updates,
    field: "dayOfWeek",
    newValue: "friday",
    summary: "2026-05-15 is Friday",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.corp_ppt_updates,
    field: "notes",
    newValue:
      "Scope: new slide for recent awards + certifications. Kathy Q2b 2026-04-22: PPT already built — just need certs + Fanuc info to finalize. Turnaround 1 week from Daniel delivery. 2026-05-15 is placeholder Live target (update when Daniel delivers).",
    summary: "Kathy Q2b: notes update re: already-done framing",
  });

  // 7. Fanuc Award — 1-week-post-event date updates
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.fanuc_pre_event,
    field: "status",
    newValue: "completed",
    summary: "Kathy Q1b: no pre-event ask, Civ has no action until post-event info received (ask closed)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.fanuc_pre_event,
    field: "notes",
    newValue:
      "Ask Nicole/Daniel if any early award info can be shared before 4/28 for pre-write. Kathy Q1b 2026-04-22: no pre-event ask; Civ has no action until post-event info received. Task closed.",
    summary: "Kathy Q1b: notes update",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.fanuc_post_event,
    field: "startDate",
    newValue: "2026-04-29",
    summary: "Kathy Q2b: day after 4/28 event",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.fanuc_post_event,
    field: "date",
    newValue: "2026-04-29",
    summary: "Mirror legacy date column to new startDate",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.fanuc_post_event,
    field: "endDate",
    newValue: "2026-05-05",
    summary: "Kathy Q2b: 1 week post-event",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.fanuc_post_event,
    field: "weekOf",
    newValue: "2026-04-27",
    summary: "Monday of week of 4/29",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.fanuc_post_event,
    field: "dayOfWeek",
    newValue: "wednesday",
    summary: "2026-04-29 is Wednesday",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.fanuc_post_event,
    field: "notes",
    newValue:
      "Event 4/28. Begin article + social post once Nicole's photos + award details in hand. Per Kathy Q2b 2026-04-22: 1 week turnaround post-4/28 event (end 2026-05-05).",
    summary: "Kathy Q2b: notes update re: 1-week turnaround",
  });

  // 8. New Capacity — add PPT complete Task, flag Daniel
  writes.push({
    kind: "project_field",
    projectId: PROJ.new_capacity,
    field: "notes",
    newValue:
      "R4 PPT delivered to JJ 4/16, awaiting feedback. Timeline slide post-approval. Kathy Q5a 2026-04-22: PPT complete by 5/8 (end of first week May). Brochure + One-Pager parallel tracks post-PPT-lock. R1 copy written for both, resurfaced on 4/23 call. Potential Daniel blocker on brochure + one-pager.",
    summary: "Kathy Q5a: notes update re: PPT target + parallel + Daniel",
  });
  writes.push({
    kind: "week_item_create",
    id: NEW.new_capacity_ppt_complete_task,
    data: buildWeekItemInsert({
      id: NEW.new_capacity_ppt_complete_task,
      projectId: PROJ.new_capacity,
      clientId: CONVERGIX_ID,
      dayOfWeek: "friday", // 2026-05-08 is Friday
      weekOf: "2026-05-04",
      startDate: "2026-05-04",
      endDate: "2026-05-08",
      title: "New Capacity PPT — Complete",
      status: "blocked",
      category: "delivery",
      owner: "Kathy",
      resources: "CD: Lane",
      notes:
        "PPT completion milestone. Kathy Q5a 2026-04-22: complete by end of first week May (5/8). Dependent on JJ feedback landing + final timeline slide.",
    }),
    summary: "Kathy Q5a: add PPT completion Task (5/4–5/8)",
  });
  // Kathy Q5a: Brochure + One-Pager parallel tracks post-PPT-lock. Push start dates past PPT Complete (5/8).
  // Current 4/30 start predates the PPT-lock gate — misleading.
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.new_capacity_brochure,
    field: "startDate",
    newValue: "2026-05-11",
    summary: "Kathy Q5a: Brochure parallel track, starts after PPT Complete (5/8)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.new_capacity_brochure,
    field: "date",
    newValue: "2026-05-11",
    summary: "Mirror legacy date column to new startDate",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.new_capacity_brochure,
    field: "weekOf",
    newValue: "2026-05-11",
    summary: "Monday of week of 5/11 (same day)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.new_capacity_brochure,
    field: "dayOfWeek",
    newValue: "monday",
    summary: "2026-05-11 is Monday",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.new_capacity_brochure,
    field: "title",
    newValue: "New Capacity Brochure — Parallel Track",
    summary: "Kathy Q5a: parallel with One-Pager post-PPT-lock",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.new_capacity_brochure,
    field: "notes",
    newValue:
      "R1 copy already written, no feedback yet. Parallel with One-Pager per Kathy Q5a 2026-04-22. Kicks off post-PPT-lock (target 5/8). Potential Daniel blocker per Kathy Q5a.",
    summary: "Kathy Q5a: notes update re: R1 copy + parallel + Daniel",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.new_capacity_one_pager,
    field: "startDate",
    newValue: "2026-05-11",
    summary: "Kathy Q5a: One-Pager parallel track, starts after PPT Complete (5/8)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.new_capacity_one_pager,
    field: "date",
    newValue: "2026-05-11",
    summary: "Mirror legacy date column to new startDate",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.new_capacity_one_pager,
    field: "weekOf",
    newValue: "2026-05-11",
    summary: "Monday of week of 5/11 (same day)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.new_capacity_one_pager,
    field: "dayOfWeek",
    newValue: "monday",
    summary: "2026-05-11 is Monday",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.new_capacity_one_pager,
    field: "title",
    newValue: "New Capacity One-Pager — Parallel Track",
    summary: "Kathy Q5a: parallel with Brochure post-PPT-lock",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.new_capacity_one_pager,
    field: "notes",
    newValue:
      "R1 copy already written, no feedback yet. Parallel with Brochure per Kathy Q5a 2026-04-22. Kicks off post-PPT-lock (target 5/8). Potential Daniel blocker per Kathy Q5a.",
    summary: "Kathy Q5a: notes update re: R1 copy + parallel + Daniel",
  });

  // 9. AUTOMATE 2026 Booth Design — notes only
  writes.push({
    kind: "project_field",
    projectId: PROJ.automate_booth,
    field: "notes",
    newValue:
      "8-wall booth for AUTOMATE June 22-25 (Detroit). 4 walls industry focuses, 1 map, 1 Convergix overview, plus storage + meeting room inside booth. Nicole sending panel designs. Room dimensions needed. Kathy Q1c 2026-04-22: formal schedule pending printer dates from show vendor (not yet received). No client-side blocker currently.",
    summary: "Kathy Q1c: notes update re: printer date dependency",
  });

  // 10. Rockwell Co-Marketing — add Nicole Task
  writes.push({
    kind: "project_field",
    projectId: PROJ.rockwell_co,
    field: "notes",
    newValue:
      "Multi-deliverable co-marketing work, pending scope clarity from Daniel/Rockwell. Hot-sheet scope: case study (Rockwell-led, feature ConvergeX), OEM social page, Automation Fair November participation, Convergix page updates on Rockwell portal. Kathy Q3a 2026-04-22: Nicole to connect with Rockwell + Convergix teams week of 4/28 re: case study lead, timeline, and scope split. Leave active-awaiting-client until that conversation yields more clarity.",
    summary: "Kathy Q3a: notes update re: Nicole team conversation",
  });
  writes.push({
    kind: "week_item_create",
    id: NEW.rockwell_nicole_task,
    data: buildWeekItemInsert({
      id: NEW.rockwell_nicole_task,
      projectId: PROJ.rockwell_co,
      clientId: CONVERGIX_ID,
      dayOfWeek: "tuesday", // start 2026-04-28 is Tuesday
      weekOf: "2026-04-27",
      startDate: "2026-04-28",
      endDate: "2026-04-29",
      title: "Rockwell Co-Marketing — Nicole Team Conversation",
      status: "scheduled",
      category: "kickoff",
      owner: "Kathy",
      resources: "CW: Kathy",
      notes:
        "Kathy awaiting: Nicole to connect with Rockwell + Convergix teams Tue or Wed (4/28 or 4/29). Clarifies case study lead, timeline, and scope split per Kathy Q3a 2026-04-22.",
    }),
    summary: "Kathy Q3a: add Nicole team conversation Task (4/28–4/29)",
  });

  // 11. Texas Instruments — Page Build status + end_date
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ti_page_build,
    field: "status",
    newValue: "in-progress",
    summary: "Kathy Q3b: page being built, in-progress (no blocker mentioned)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ti_page_build,
    field: "endDate",
    newValue: "2026-04-30",
    summary: "Kathy Q3b: goal was next status 4/30",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ti_page_build,
    field: "notes",
    newValue:
      "Same template as Rockwell. Copy + logo provided. Kathy Q3b 2026-04-22: goal is next status 4/30.",
    summary: "Kathy Q3b: notes update",
  });

  // 12. Industry Vertical Campaigns split → CDS Vertical Campaign (rename + restructure)
  writes.push({
    kind: "project_field",
    projectId: PROJ.ivc,
    field: "name",
    newValue: "CDS Vertical Campaign",
    summary: "Kathy Q4a: split IVC into 2 Projects; rename existing to CDS",
  });
  writes.push({
    kind: "project_field",
    projectId: PROJ.ivc,
    field: "notes",
    newValue:
      "CDS vertical campaign post-split from original Industry Vertical Campaigns. Other vertical (Industrial/Battery Assembly) is now its own Project. Kathy Q4a 2026-04-22: different stakeholders, different timelines. Stakeholders: Bob Bove (CDS stakeholder per Kathy Q2b), Jared. Kathy Q4b: CDS wraps within 3 weeks from 2026-04-23 (~5/14). Brochure up to 4 pages + 2-page case study in scope. Creative wrapper R1 presentation 2026-04-29.",
    summary: "Kathy Q4a+Q4b: notes update post-split",
  });
  writes.push({
    kind: "project_field",
    projectId: PROJ.ivc,
    field: "waitingOn",
    newValue: "Bob Bove",
    summary: "Primary blocker Bob Bove (per Kathy Q2b); Jared mentioned in notes",
  });

  // Create new Industrial/Battery Assembly Campaign L1 BEFORE the Jamie Nelson Connect move
  writes.push({
    kind: "project_create",
    id: NEW.assembly_project,
    data: buildProjectInsert({
      id: NEW.assembly_project,
      clientId: CONVERGIX_ID,
      name: "Industrial/Battery Assembly Campaign",
      status: "not-started",
      category: "active",
      engagementType: "retainer",
      contractStart: "2026-02-01",
      contractEnd: "2026-07-31",
      owner: "Kathy",
      resources: "CW: Kathy",
      waitingOn: null,
      notes:
        "Second vertical campaign post-split from Industry Vertical Campaigns. Kickoff gated on Jamie Nelson scoping connect. Kathy Q4b 2026-04-22: open-ended, CDS needs to be further along first. Expected June-July kickoff, completion by 2026-07-31. Stakeholders: Bob Bove, Jared.",
      sortOrder: 15, // between IVC (14) and Life Sciences (16)
    }),
    summary: "Kathy Q4a: create Industrial/Battery Assembly Campaign",
  });

  // Delete Retainer Period Close Task (artificial anchor, no longer needed post-split)
  writes.push({
    kind: "week_item_delete",
    weekItemId: TASK.ivc_retainer_close,
    summary: "Post-split: delete Retainer Period Close (artificial date anchor)",
  });

  // Move Jamie Nelson Connect Task → new Assembly Project + update status + date
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ivc_jamie_nelson,
    field: "status",
    newValue: "scheduled",
    summary: "NULL → scheduled: Kathy Q4b June-July window (future deadline)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ivc_jamie_nelson,
    field: "startDate",
    newValue: "2026-06-01",
    summary: "Kathy Q4b: June-July window (2026-06-01 is Monday)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ivc_jamie_nelson,
    field: "notes",
    newValue:
      "Pending: Connect with Jamie Nelson to scope industrial/battery assembly vertical campaign. Stakeholders: Bob, Jared. Per Kathy Q4b 2026-04-22: open-ended, CDS needs to be further along first. Expected June-July kickoff.",
    summary: "Kathy Q4b: notes update re: CDS-precedence + June-July window",
  });
  writes.push({
    kind: "week_item_move",
    weekItemId: TASK.ivc_jamie_nelson,
    fromProjectId: PROJ.ivc,
    toProjectId: NEW.assembly_project,
    newWeekOf: "2026-06-01",
    newDayOfWeek: "monday",
    summary: "Post-split: Jamie Nelson Connect → Industrial/Battery Assembly Campaign",
  });
  // Assembly Campaign completion anchor Task so L1 end_date reflects Kathy's explicit 2026-07-31 commitment.
  // This is NOT the same pattern as IVC's deleted Retainer Period Close — CDS actually wraps in May
  // (so 7/31 on IVC was artificial), whereas Assembly genuinely runs through retainer end per Kathy Q4b.
  writes.push({
    kind: "week_item_create",
    id: NEW.assembly_completion_task,
    data: buildWeekItemInsert({
      id: NEW.assembly_completion_task,
      projectId: NEW.assembly_project,
      clientId: CONVERGIX_ID,
      dayOfWeek: "friday", // 2026-07-31 is Friday
      weekOf: "2026-07-27",
      startDate: "2026-07-31",
      endDate: "2026-07-31",
      title: "Assembly Campaign — Completion Target",
      status: "scheduled",
      category: "deadline",
      owner: "Kathy",
      resources: "CW: Kathy",
      notes:
        "Kathy Q4b 2026-04-22: Industrial/Battery Assembly campaign committed to complete by 2026-07-31 (Convergix retainer end). Anchor Task so L1 end_date reflects this commitment until the campaign's real execution Tasks land post-Jamie-Nelson-scoping-connect.",
    }),
    summary: "Kathy Q4b: anchor Assembly L1 end at 2026-07-31 (retainer-end commitment)",
  });

  // CDS Creative Wrapper — update end_date + notes
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ivc_cds_wrapper,
    field: "endDate",
    newValue: "2026-05-14",
    summary: "Kathy Q4b: CDS wraps within 3 weeks from 4/23 (~5/14)",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ivc_cds_wrapper,
    field: "notes",
    newValue:
      "Visual design framework (fonts, colors, layout). Separate track from messaging. Kathy Q4b 2026-04-22: Lane working today, R1 presentation Wed 2026-04-29. Wraps ~5/14 within CDS 3-week window.",
    summary: "Kathy Q4b: notes update re: Lane + R1 4/29",
  });

  // CDS Messaging, Landing Pages, Social Posts — set end_date to 2026-05-14
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ivc_cds_messaging,
    field: "endDate",
    newValue: "2026-05-14",
    summary: "Kathy Q4b: CDS wraps ~5/14",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ivc_cds_landing,
    field: "endDate",
    newValue: "2026-05-14",
    summary: "Kathy Q4b: CDS wraps ~5/14",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ivc_cds_brochure,
    field: "title",
    newValue: "CDS Brochure (up to 4 pages)",
    summary: "Kathy Q4b: brochure is up to 4 pages",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ivc_cds_brochure,
    field: "endDate",
    newValue: "2026-05-14",
    summary: "Kathy Q4b: CDS wraps ~5/14",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ivc_cds_brochure,
    field: "notes",
    newValue:
      "Up to 4 pages per Kathy Q4b 2026-04-22. Pending R1 feedback 4/23 for scope confirmation. NOT in R1 delivery — held for scope decision post-feedback. Held pending messaging approval.",
    summary: "Kathy Q4b: notes update re: 4-page scope",
  });
  writes.push({
    kind: "week_item_field",
    weekItemId: TASK.ivc_cds_social_posts,
    field: "endDate",
    newValue: "2026-05-14",
    summary: "Kathy Q4b: CDS wraps ~5/14",
  });

  // Add new CDS Case Study (2 pages) Task
  writes.push({
    kind: "week_item_create",
    id: NEW.cds_case_study_task,
    data: buildWeekItemInsert({
      id: NEW.cds_case_study_task,
      projectId: PROJ.ivc, // still the same id (renamed to CDS Vertical Campaign)
      clientId: CONVERGIX_ID,
      dayOfWeek: "thursday", // 2026-04-30 is Thursday
      weekOf: "2026-04-27",
      startDate: "2026-04-30",
      endDate: "2026-05-14",
      title: "CDS Case Study (2 pages)",
      status: "blocked",
      category: "delivery",
      owner: "Kathy",
      resources: "CW: Kathy, CD: Lane",
      notes:
        "2-page case study per Kathy Q4b 2026-04-22. Part of CDS vertical scope alongside brochure. Pending R1 feedback 4/23 + creative wrapper finalization.",
    }),
    summary: "Kathy Q4b: add CDS Case Study (2 pages) Task",
  });

  // ────────────── Pre-write validation ──────────────

  console.log(`=== Pre-write validation ===`);

  // 1. Field whitelist check — every project_field must be in PROJECT_FIELDS
  // Note: "sortOrder" and "status" are exceptions: sortOrder isn't in PROJECT_FIELDS
  // (meant to be repositioned via a separate API) and status uses updateProjectStatus.
  // For this migration we write them directly; we accept those as out-of-whitelist writes
  // and log them explicitly so QA can flag.
  const projectFieldsWhitelist = new Set<string>(PROJECT_FIELDS as readonly string[]);
  const weekItemFieldsWhitelist = new Set<string>(WEEK_ITEM_FIELDS as readonly string[]);
  const outOfWhitelist: string[] = [];
  for (const w of writes) {
    if (w.kind === "project_field") {
      if (!projectFieldsWhitelist.has(w.field) && w.field !== "sortOrder") {
        outOfWhitelist.push(`project.${w.field}`);
      }
    } else if (w.kind === "week_item_field") {
      if (!weekItemFieldsWhitelist.has(w.field)) {
        outOfWhitelist.push(`week_item.${w.field}`);
      }
    }
  }
  if (outOfWhitelist.length > 0) {
    console.log(`  ⚠ Fields outside whitelist (out of scope; verify):`);
    for (const f of outOfWhitelist) console.log(`    - ${f}`);
  } else {
    console.log(`  ✓ All field names in whitelist (or explicit opt-out: sortOrder)`);
  }

  // 2. Enum checks
  const enumErrors: string[] = [];
  for (const w of writes) {
    if (w.kind === "project_create") {
      if (!PROJECT_STATUS_ENUM.has(w.data.status as string))
        enumErrors.push(`project_create status: ${w.data.status}`);
      if (!PROJECT_CATEGORY_ENUM.has(w.data.category as string))
        enumErrors.push(`project_create category: ${w.data.category}`);
      if (w.data.engagementType !== null && !PROJECT_ENGAGEMENT_ENUM.has(w.data.engagementType as string))
        enumErrors.push(`project_create engagement: ${w.data.engagementType}`);
    } else if (w.kind === "week_item_create") {
      if (w.data.status !== null && !WEEK_ITEM_STATUS_ENUM.has(w.data.status as string))
        enumErrors.push(`week_item_create status: ${w.data.status}`);
      if (!WEEK_ITEM_CATEGORY_ENUM.has(w.data.category as string))
        enumErrors.push(`week_item_create category: ${w.data.category}`);
    } else if (w.kind === "project_status") {
      if (!PROJECT_STATUS_ENUM.has(w.newValue))
        enumErrors.push(`project_status: ${w.newValue}`);
    } else if (w.kind === "week_item_field") {
      if (w.field === "status" && w.newValue !== null && !WEEK_ITEM_STATUS_ENUM.has(w.newValue))
        enumErrors.push(`week_item status: ${w.newValue}`);
      if (w.field === "category" && w.newValue !== null && !WEEK_ITEM_CATEGORY_ENUM.has(w.newValue))
        enumErrors.push(`week_item category: ${w.newValue}`);
    }
  }
  if (enumErrors.length > 0) {
    console.log(`  ✗ Enum violations:`);
    for (const e of enumErrors) console.log(`    - ${e}`);
    throw new Error("Enum validation failed");
  } else {
    console.log(`  ✓ All enum values valid`);
  }

  // 3. Row existence: fetch all ids we'll touch and confirm they exist
  const allProjectIds = new Set<string>();
  const allTaskIds = new Set<string>();
  for (const w of writes) {
    if (w.kind === "project_field" || w.kind === "project_status") allProjectIds.add(w.projectId);
    else if (w.kind === "week_item_field" || w.kind === "week_item_delete")
      allTaskIds.add(w.weekItemId);
    else if (w.kind === "week_item_move") {
      allTaskIds.add(w.weekItemId);
      allProjectIds.add(w.fromProjectId);
      // toProjectId may be a new-project id (not in prod yet) — validate after create in tx
    }
  }

  const livingProjects = (
    await db.select({ id: projects.id }).from(projects)
  ).map((r) => r.id);
  const livingProjectSet = new Set(livingProjects);
  const missingProjects: string[] = [];
  for (const pid of allProjectIds) {
    if (!livingProjectSet.has(pid)) missingProjects.push(pid);
  }
  if (missingProjects.length > 0) {
    console.log(`  ✗ Missing projects: ${missingProjects.join(", ")}`);
    throw new Error("Row existence check failed");
  }

  const livingTasks = (
    await db.select({ id: weekItems.id }).from(weekItems)
  ).map((r) => r.id);
  const livingTaskSet = new Set(livingTasks);
  const missingTasks: string[] = [];
  for (const tid of allTaskIds) {
    if (!livingTaskSet.has(tid)) missingTasks.push(tid);
  }
  if (missingTasks.length > 0) {
    console.log(`  ✗ Missing tasks: ${missingTasks.join(", ")}`);
    throw new Error("Row existence check failed");
  }

  console.log(`  ✓ All ${allProjectIds.size} projects + ${allTaskIds.size} tasks exist in prod\n`);

  // ────────────── Batch summary ──────────────

  const counts = {
    project_create: 0,
    project_field: 0,
    project_status: 0,
    week_item_create: 0,
    week_item_field: 0,
    week_item_delete: 0,
    week_item_move: 0,
  };
  for (const w of writes) counts[w.kind]++;

  console.log(`=== Planned writes summary ===`);
  console.log(`  Projects created:        ${counts.project_create}`);
  console.log(`  Projects field-updated:  ${counts.project_field}`);
  console.log(`  Projects status-updated: ${counts.project_status}`);
  console.log(`  Tasks created:           ${counts.week_item_create}`);
  console.log(`  Tasks field-updated:     ${counts.week_item_field}`);
  console.log(`  Tasks deleted:           ${counts.week_item_delete}`);
  console.log(`  Tasks moved:             ${counts.week_item_move}`);
  console.log(`  Total write ops:         ${writes.length}\n`);

  // ────────────── Print each write ──────────────

  console.log(`=== Write plan (in execution order) ===`);
  for (let i = 0; i < writes.length; i++) {
    const w = writes[i];
    const idx = (i + 1).toString().padStart(3, " ");
    if (w.kind === "project_create")
      console.log(`${idx}. CREATE Project [${w.data.name}] id=${w.id.substring(0, 8)} — ${w.summary}`);
    else if (w.kind === "project_field")
      console.log(
        `${idx}. UPDATE Project[${w.projectId.substring(0, 8)}].${w.field} = ${JSON.stringify(w.newValue).substring(0, 80)}${w.newValue && String(w.newValue).length > 80 ? "..." : ""} — ${w.summary}`
      );
    else if (w.kind === "project_status")
      console.log(`${idx}. STATUS Project[${w.projectId.substring(0, 8)}] → ${w.newValue} — ${w.summary}`);
    else if (w.kind === "week_item_create")
      console.log(
        `${idx}. CREATE Task [${w.data.title}] id=${w.id.substring(0, 8)} under project=${String(w.data.projectId).substring(0, 8)} — ${w.summary}`
      );
    else if (w.kind === "week_item_field")
      console.log(
        `${idx}. UPDATE Task[${w.weekItemId.substring(0, 8)}].${w.field} = ${JSON.stringify(w.newValue).substring(0, 80)}${w.newValue && String(w.newValue).length > 80 ? "..." : ""} — ${w.summary}`
      );
    else if (w.kind === "week_item_delete")
      console.log(`${idx}. DELETE Task[${w.weekItemId.substring(0, 8)}] — ${w.summary}`);
    else if (w.kind === "week_item_move")
      console.log(
        `${idx}. MOVE Task[${w.weekItemId.substring(0, 8)}]: project=${w.fromProjectId.substring(0, 8)} → ${w.toProjectId.substring(0, 8)}, weekOf=${w.newWeekOf} — ${w.summary}`
      );
  }

  // ────────────── Affected projects for recompute ──────────────

  const affectedProjectIds = new Set<string>();
  for (const w of writes) {
    if (w.kind === "week_item_create") affectedProjectIds.add(w.data.projectId as string);
    else if (w.kind === "week_item_field") {
      // Need to know project_id for this week item — we'll resolve pre-apply
      affectedProjectIds.add(TASK_TO_PROJECT[w.weekItemId] ?? "");
    } else if (w.kind === "week_item_delete") {
      affectedProjectIds.add(TASK_TO_PROJECT[w.weekItemId] ?? "");
    } else if (w.kind === "week_item_move") {
      affectedProjectIds.add(w.fromProjectId);
      affectedProjectIds.add(w.toProjectId);
    }
  }
  affectedProjectIds.delete("");
  console.log(`\n=== Projects needing date recompute post-writes (${affectedProjectIds.size}) ===`);
  for (const pid of affectedProjectIds) console.log(`  - ${pid.substring(0, 8)}`);

  // ────────────── DRY_RUN exit ──────────────

  if (!APPLY) {
    console.log(`\n=== DRY RUN — no writes executed ===`);
    console.log(`Set APPLY=1 to execute. Bump UPDATED_BY_SUFFIX=run2+ on retry after revert.`);
    process.exit(0);
  }

  // ────────────── APPLY ──────────────

  console.log(`\n=== APPLYING WRITES ===`);
  setBatchId(BATCH_ID);

  await db.transaction(async (tx) => {
    for (const w of writes) {
      await executeWrite(tx, w, CONVERGIX_ID);
    }

    // Recompute all affected project dates
    for (const pid of affectedProjectIds) {
      const derived = await recomputeProjectDatesWith(tx, pid);
      console.log(`  ✓ Recomputed project[${pid.substring(0, 8)}] → start=${derived.startDate}, end=${derived.endDate}`);
    }
  });

  setBatchId(null);

  console.log(`\n=== APPLY COMPLETE ===`);
  console.log(`Batch ID: ${BATCH_ID}`);
  console.log(`Run verify script next: convergix-full-state.ts + diff vs pre-batch snapshot.`);
}

// ───────────────────── Execute one write ─────────────────────

const TASK_TO_PROJECT: Record<string, string> = {
  [TASK.big_win_ppt]: PROJ.big_win,
  [TASK.big_win_social_announcement]: PROJ.big_win,
  [TASK.brand_guide_l2]: PROJ.brand_guide,
  [TASK.certs_daniel_followup]: PROJ.certs_page,
  [TASK.corp_brochure_updates]: PROJ.corp_collateral,
  [TASK.corp_ppt_updates]: PROJ.corp_collateral,
  [TASK.corp_v2026_live]: PROJ.corp_collateral,
  [TASK.fanuc_pre_event]: PROJ.fanuc,
  [TASK.fanuc_post_event]: PROJ.fanuc,
  [TASK.ivc_retainer_close]: PROJ.ivc,
  [TASK.ivc_jamie_nelson]: PROJ.ivc,
  [TASK.ivc_cds_wrapper]: PROJ.ivc,
  [TASK.ivc_cds_messaging]: PROJ.ivc,
  [TASK.ivc_cds_landing]: PROJ.ivc,
  [TASK.ivc_cds_brochure]: PROJ.ivc,
  [TASK.ivc_cds_social_posts]: PROJ.ivc,
  [TASK.may_content_calendar]: PROJ.social_april,
  [TASK.new_capacity_brochure]: PROJ.new_capacity,
  [TASK.new_capacity_one_pager]: PROJ.new_capacity,
  [TASK.ti_page_build]: PROJ.ti,
};

async function executeWrite(tx: any, w: Write, convergixId: string): Promise<void> {
  const now = new Date();

  async function audit(opts: {
    idemSuffix: string;
    projectId?: string | null;
    updateType: string;
    previousValue?: string | null;
    newValue?: string | null;
    summary: string;
  }) {
    await tx.insert(updates).values({
      id: generateId(),
      idempotencyKey: `${UPDATED_BY}:${opts.idemSuffix}`,
      projectId: opts.projectId ?? null,
      clientId: convergixId,
      updatedBy: UPDATED_BY,
      updateType: opts.updateType,
      previousValue: opts.previousValue ?? null,
      newValue: opts.newValue ?? null,
      summary: opts.summary,
      metadata: null,
      batchId: BATCH_ID,
      triggeredByUpdateId: null,
      slackMessageTs: null,
      createdAt: now,
    });
  }

  if (w.kind === "project_create") {
    await tx.insert(projects).values(w.data);
    await audit({
      idemSuffix: `project_create:${w.id}`,
      projectId: w.id,
      updateType: "new-item",
      newValue: w.data.name,
      summary: `Created project: ${w.data.name}`,
    });
  } else if (w.kind === "project_field") {
    const column = PROJECT_FIELD_TO_COLUMN[w.field as keyof typeof PROJECT_FIELD_TO_COLUMN] ?? w.field;
    const prev = (
      await tx.select().from(projects).where(eq(projects.id, w.projectId))
    )[0];
    const prevValue = prev ? (prev as any)[column] : null;
    await tx
      .update(projects)
      .set({ [column]: w.newValue, updatedAt: now })
      .where(eq(projects.id, w.projectId));
    await audit({
      idemSuffix: `project_field:${w.projectId}:${w.field}`,
      projectId: w.projectId,
      updateType: "field-change",
      previousValue: prevValue == null ? null : String(prevValue),
      newValue: w.newValue,
      summary: w.summary,
    });
  } else if (w.kind === "project_status") {
    const prev = (
      await tx.select().from(projects).where(eq(projects.id, w.projectId))
    )[0];
    const prevValue = prev ? String((prev as any).status) : null;
    await tx
      .update(projects)
      .set({ status: w.newValue, updatedAt: now })
      .where(eq(projects.id, w.projectId));
    await audit({
      idemSuffix: `project_status:${w.projectId}`,
      projectId: w.projectId,
      updateType: "status-change",
      previousValue: prevValue,
      newValue: w.newValue,
      summary: w.summary,
    });
  } else if (w.kind === "week_item_create") {
    await tx.insert(weekItems).values(w.data);
    await audit({
      idemSuffix: `week_item_create:${w.id}`,
      projectId: w.data.projectId ?? null,
      updateType: "new-week-item",
      newValue: w.data.title,
      summary: `Created task: ${w.data.title}`,
    });
  } else if (w.kind === "week_item_field") {
    const column = WEEK_ITEM_FIELD_TO_COLUMN[w.field as keyof typeof WEEK_ITEM_FIELD_TO_COLUMN] ?? w.field;
    const prev = (
      await tx.select().from(weekItems).where(eq(weekItems.id, w.weekItemId))
    )[0];
    const prevValue = prev ? (prev as any)[column] : null;
    await tx
      .update(weekItems)
      .set({ [column]: w.newValue, updatedAt: now })
      .where(eq(weekItems.id, w.weekItemId));
    await audit({
      idemSuffix: `week_item_field:${w.weekItemId}:${w.field}`,
      projectId: prev ? String((prev as any).projectId) : null,
      updateType: "week-field-change",
      previousValue: prevValue == null ? null : String(prevValue),
      newValue: w.newValue,
      summary: w.summary,
    });
  } else if (w.kind === "week_item_delete") {
    const prev = (
      await tx.select().from(weekItems).where(eq(weekItems.id, w.weekItemId))
    )[0];
    await tx.delete(weekItems).where(eq(weekItems.id, w.weekItemId));
    await audit({
      idemSuffix: `week_item_delete:${w.weekItemId}`,
      projectId: prev ? String((prev as any).projectId) : null,
      updateType: "delete-week-item",
      previousValue: prev ? String((prev as any).title) : null,
      newValue: null,
      summary: w.summary,
    });
  } else if (w.kind === "week_item_move") {
    const prev = (
      await tx.select().from(weekItems).where(eq(weekItems.id, w.weekItemId))
    )[0];
    await tx
      .update(weekItems)
      .set({
        projectId: w.toProjectId,
        weekOf: w.newWeekOf,
        dayOfWeek: w.newDayOfWeek,
        date: (prev as any).startDate, // mirror legacy
        updatedAt: now,
      })
      .where(eq(weekItems.id, w.weekItemId));
    await audit({
      idemSuffix: `week_item_move:${w.weekItemId}`,
      projectId: w.toProjectId,
      updateType: "week-project-move",
      previousValue: w.fromProjectId,
      newValue: w.toProjectId,
      summary: w.summary,
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
