/**
 * Convergix Kathy Cleanup FOLLOW-UP — 2026-04-22
 *
 * Corrective follow-up to `convergix-kathy-cleanup-2026-04-22`. Two issues:
 * 1. AISTech 2026 status still NULL (planned scheduled, missed the write)
 * 2. Corp Collateral Brochure + PPT startDates shifted to 5/15 (same as Live)
 *    compressed L1 to single-day 5/15..5/15. Revert kickoff L2 startDates
 *    to 4/30 (work-ongoing signal); Live stays 5/15 (launch target).
 *
 * Also flips NULL-treated-as-scheduled AISTech to explicit scheduled.
 *
 * DRY_RUN by default. Set APPLY=1 to execute.
 */

import { createRunwayDb } from "../../../scripts/lib/run-script";
import { eq } from "drizzle-orm";
import {
  clients,
  projects,
  weekItems,
  updates,
} from "../../../src/lib/db/runway-schema";
import {
  setBatchId,
  generateId,
} from "../../../src/lib/runway/operations-utils";
import { recomputeProjectDatesWith } from "../../../src/lib/runway/operations-writes-week";

const BATCH_ID = "convergix-kathy-cleanup-followup-2026-04-22";
const UPDATED_BY = `convergix-kathy-cleanup-followup-2026-04-22-${process.env.UPDATED_BY_SUFFIX ?? "run1"}`;
const APPLY = process.env.APPLY === "1";

const TASK = {
  aistech_2026: "9e432ae4ccac4b24ab1628eaf",
  corp_brochure_updates: "43701263775d49c7a0f17ae60",
  corp_ppt_updates: "c13178e12ca3476fb88db9d92",
};

const PROJ = {
  events_page: "135c5a61d5c343b1b5b39fe08",
  corp_collateral: "65b2cac113a048f592867a71c",
};

async function main() {
  const { db } = createRunwayDb();

  const clientRow = (
    await db.select().from(clients).where(eq(clients.slug, "convergix"))
  )[0];
  if (!clientRow) throw new Error("Convergix client not found");
  const CONVERGIX_ID = clientRow.id;

  console.log(`\n=== Convergix Kathy Cleanup FOLLOW-UP ===`);
  console.log(`Batch ID:   ${BATCH_ID}`);
  console.log(`Updated By: ${UPDATED_BY}`);
  console.log(`Mode:       ${APPLY ? "APPLY" : "DRY_RUN"}\n`);

  // Define writes inline for this mini-batch
  type Write =
    | { id: string; field: string; column: keyof typeof weekItems.$inferSelect; newValue: string; summary: string };

  const writes: Write[] = [
    // Fix 1: AISTech status → scheduled
    {
      id: TASK.aistech_2026,
      field: "status",
      column: "status",
      newValue: "scheduled",
      summary: "NULL → scheduled: AISTech future deadline; missed in first batch",
    },
    // Fix 2a: Revert Brochure Updates startDate, date, weekOf, dayOfWeek
    {
      id: TASK.corp_brochure_updates,
      field: "startDate",
      column: "startDate",
      newValue: "2026-04-30",
      summary: "Revert kickoff startDate: retain 'work ongoing since 4/30' signal; Live stays 5/15",
    },
    {
      id: TASK.corp_brochure_updates,
      field: "date",
      column: "date",
      newValue: "2026-04-30",
      summary: "Mirror legacy date column to restored startDate",
    },
    {
      id: TASK.corp_brochure_updates,
      field: "weekOf",
      column: "weekOf",
      newValue: "2026-04-27",
      summary: "Monday of week of 4/30",
    },
    {
      id: TASK.corp_brochure_updates,
      field: "dayOfWeek",
      column: "dayOfWeek",
      newValue: "thursday",
      summary: "2026-04-30 is Thursday",
    },
    // Fix 2b: Revert PPT Updates startDate, date, weekOf, dayOfWeek
    {
      id: TASK.corp_ppt_updates,
      field: "startDate",
      column: "startDate",
      newValue: "2026-04-30",
      summary: "Revert kickoff startDate: retain 'work ongoing since 4/30' signal",
    },
    {
      id: TASK.corp_ppt_updates,
      field: "date",
      column: "date",
      newValue: "2026-04-30",
      summary: "Mirror legacy date column to restored startDate",
    },
    {
      id: TASK.corp_ppt_updates,
      field: "weekOf",
      column: "weekOf",
      newValue: "2026-04-27",
      summary: "Monday of week of 4/30",
    },
    {
      id: TASK.corp_ppt_updates,
      field: "dayOfWeek",
      column: "dayOfWeek",
      newValue: "thursday",
      summary: "2026-04-30 is Thursday",
    },
  ];

  console.log(`=== Planned writes: ${writes.length} ===`);
  for (let i = 0; i < writes.length; i++) {
    console.log(`${i + 1}. UPDATE Task[${writes[i].id.substring(0, 8)}].${writes[i].field} = ${writes[i].newValue} — ${writes[i].summary}`);
  }

  const affectedProjects = new Set<string>([PROJ.events_page, PROJ.corp_collateral]);
  console.log(`\n=== Projects needing recompute (${affectedProjects.size}) ===`);
  for (const p of affectedProjects) console.log(`  - ${p.substring(0, 8)}`);

  if (!APPLY) {
    console.log(`\n=== DRY RUN — no writes ===`);
    process.exit(0);
  }

  setBatchId(BATCH_ID);

  await db.transaction(async (tx) => {
    const now = new Date();
    for (const w of writes) {
      const prev = (await tx.select().from(weekItems).where(eq(weekItems.id, w.id)))[0];
      const prevValue = prev ? (prev as any)[w.column] : null;
      await tx
        .update(weekItems)
        .set({ [w.column]: w.newValue, updatedAt: now })
        .where(eq(weekItems.id, w.id));
      await tx.insert(updates).values({
        id: generateId(),
        idempotencyKey: `${UPDATED_BY}:week_item_field:${w.id}:${w.field}`,
        projectId: prev ? String((prev as any).projectId) : null,
        clientId: CONVERGIX_ID,
        updatedBy: UPDATED_BY,
        updateType: "week-field-change",
        previousValue: prevValue == null ? null : String(prevValue),
        newValue: w.newValue,
        summary: w.summary,
        metadata: null,
        batchId: BATCH_ID,
        triggeredByUpdateId: null,
        slackMessageTs: null,
        createdAt: now,
      });
    }

    for (const pid of affectedProjects) {
      const derived = await recomputeProjectDatesWith(tx, pid);
      console.log(`  ✓ Recomputed project[${pid.substring(0, 8)}] → start=${derived.startDate}, end=${derived.endDate}`);
    }
  });

  setBatchId(null);

  console.log(`\n=== FOLLOW-UP APPLY COMPLETE ===`);
}

main().catch((e) => { console.error(e); process.exit(1); });
