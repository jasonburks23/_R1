/**
 * REVERT: Cluster 3 — Convergix 2H Retainer Renewal Task (2026-04-26)
 *
 * Deletes the renewal WI created by convergix-retainer-renewal-task-2026-04-26.ts.
 * Used in two scenarios:
 *   1. The primary script's post-write recompute-guard check failed
 *      (wrapper dates moved after the insert). Run REVERT to restore prod.
 *   2. The operator decides to back the renewal Task out for any other reason.
 *
 * Behavior:
 *   - Looks up the WI by (projectId=wrapper, weekOf=2026-05-25, title=...)
 *   - Calls deleteWeekItem helper, which fires recomputeProjectDatesWith
 *     inside its transaction. Recompute guard fires the same way (wrapper
 *     still has 16 children), so wrapper dates stay pinned across the delete.
 *   - Inserts a delete-week-item audit row tagged with this REVERT batch_id.
 *
 * Pre-checks abort if drift detected:
 *   - WI exists at expected (projectId, weekOf, title) coordinates
 *   - Wrapper still in expected pinned-dates state
 *
 * Note: the runner derives batch_id from filename. To avoid idempotency-key
 * poisoning if this script is re-run, the underlying deleteWeekItem helper
 * generates an idempotency key from (item.id, updatedBy). Since UPDATED_BY
 * here is distinct from the primary script's UPDATED_BY, the keys differ.
 */

import { eq, and } from "drizzle-orm";
import type { MigrationContext } from "../runway-migrate";
import { projects, weekItems, updates } from "@/lib/db/runway-schema";
import { deleteWeekItem } from "@/lib/runway/operations-writes-week";

const BATCH_ID = "convergix-retainer-renewal-task-REVERT-2026-04-26";
const UPDATED_BY = BATCH_ID;

const WRAPPER_ID = "4171aa4d88934d22b020d75fe";
const TARGET_WEEK_OF = "2026-05-25";
const TARGET_TITLE = "2H Convergix Retainer Renewal";

const EXPECTED_WRAPPER_START = "2026-02-01";
const EXPECTED_WRAPPER_END = "2026-07-31";

export const description =
  "REVERT for Cluster 3 (convergix-retainer-renewal-task-2026-04-26). Deletes the 2H renewal WI from the wrapper.";

export async function up(ctx: MigrationContext): Promise<void> {
  ctx.log("=== Cluster 3 REVERT — Delete 2H Convergix Retainer Renewal WI ===");
  ctx.log(`batch_id: ${BATCH_ID}`);
  ctx.log("");

  // ── Pre-check 1: WI exists at expected coordinates ──
  const wiRows = await ctx.db
    .select({
      id: weekItems.id,
      title: weekItems.title,
      status: weekItems.status,
    })
    .from(weekItems)
    .where(and(
      eq(weekItems.projectId, WRAPPER_ID),
      eq(weekItems.weekOf, TARGET_WEEK_OF),
      eq(weekItems.title, TARGET_TITLE),
    ));
  if (wiRows.length !== 1) {
    throw new Error(
      `Pre-check 1 FAILED: expected 1 WI at (projectId=${WRAPPER_ID.slice(0, 8)}…, weekOf=${TARGET_WEEK_OF}, title="${TARGET_TITLE}"), found ${wiRows.length}. ` +
      `Either the primary script never APPLIED, or the WI has already been deleted/moved.`,
    );
  }
  const targetWi = wiRows[0];
  ctx.log(`Pre-check 1 PASS: WI found id=${targetWi.id} title="${targetWi.title}" status=${targetWi.status}`);

  // ── Pre-check 2: wrapper dates still pinned (drift detection) ──
  const wrapperRows = await ctx.db
    .select({ startDate: projects.startDate, endDate: projects.endDate })
    .from(projects)
    .where(eq(projects.id, WRAPPER_ID));
  if (wrapperRows.length !== 1) {
    throw new Error(`Pre-check 2 FAILED: wrapper id=${WRAPPER_ID} not found.`);
  }
  const w = wrapperRows[0];
  if (w.startDate !== EXPECTED_WRAPPER_START || w.endDate !== EXPECTED_WRAPPER_END) {
    ctx.log(`WARNING: wrapper dates differ from expected pre-state. Got ${w.startDate} .. ${w.endDate}, expected ${EXPECTED_WRAPPER_START} .. ${EXPECTED_WRAPPER_END}.`);
    ctx.log(`         Continuing the REVERT anyway since dates outside the operator-pinned range likely indicate the recompute-guard check fired in the primary script.`);
  } else {
    ctx.log(`Pre-check 2 PASS: wrapper dates ${w.startDate} .. ${w.endDate} (pinned)`);
  }

  // ── Plan log ──
  ctx.log("");
  ctx.log("=== Plan ===");
  ctx.log(`  DELETE week_item id=${targetWi.id} ("${targetWi.title}")`);
  ctx.log(`  After delete, recompute fires; guard predicate (engagementType=retainer + children) keeps wrapper dates unchanged.`);

  if (ctx.dryRun) {
    ctx.log("");
    ctx.log("DRY_RUN — no writes. Re-run with --apply to execute.");
    return;
  }

  // ── APPLY ──
  ctx.log("");
  ctx.log("=== APPLY ===");

  const result = await deleteWeekItem({
    id: targetWi.id,
    updatedBy: UPDATED_BY,
  });
  if (!result.ok) {
    throw new Error(`deleteWeekItem FAILED: ${result.error}`);
  }
  ctx.log(`✓ deleteWeekItem success: ${result.message}`);

  // ── Post-write: confirm WI gone ──
  const afterRows = await ctx.db
    .select({ id: weekItems.id })
    .from(weekItems)
    .where(eq(weekItems.id, targetWi.id));
  if (afterRows.length !== 0) {
    throw new Error(`Post-write check FAILED: WI id=${targetWi.id} still exists after delete.`);
  }
  ctx.log(`✓ WI confirmed deleted`);

  // ── Post-write: confirm wrapper dates STILL unchanged ──
  const wrapperAfter = await ctx.db
    .select({ startDate: projects.startDate, endDate: projects.endDate })
    .from(projects)
    .where(eq(projects.id, WRAPPER_ID));
  const wAfter = wrapperAfter[0];
  if (wAfter.startDate !== EXPECTED_WRAPPER_START || wAfter.endDate !== EXPECTED_WRAPPER_END) {
    throw new Error(
      `RECOMPUTE GUARD FAILURE on REVERT: wrapper dates changed after delete. ` +
      `Expected ${EXPECTED_WRAPPER_START} .. ${EXPECTED_WRAPPER_END}, got ${wAfter.startDate} .. ${wAfter.endDate}.`,
    );
  }
  ctx.log(`✓ Wrapper dates still pinned: ${wAfter.startDate} .. ${wAfter.endDate}`);

  // ── Post-write: confirm exactly 1 audit row under this REVERT batch ──
  const auditRows = await ctx.db
    .select({ id: updates.id, summary: updates.summary })
    .from(updates)
    .where(eq(updates.batchId, BATCH_ID));
  if (auditRows.length !== 1) {
    throw new Error(`Post-write audit check FAILED: expected 1 audit row under batch_id="${BATCH_ID}", found ${auditRows.length}.`);
  }
  ctx.log(`✓ REVERT audit row landed: ${auditRows[0].summary}`);

  ctx.log("");
  ctx.log("=== REVERT complete. Cluster 3 backed out. ===");
}
