/**
 * Migration: Cluster 3 — Convergix 2H Retainer Renewal Task (2026-04-26)
 *
 * Creates a single week_item on the "1H Convergix Retainer" wrapper
 * (id=4171aa4d88934d22b020d75fe) at weekOf=2026-05-25 to put the renewal
 * conversation on Kathy's plate. This is the third and final cluster of
 * the Convergix retainer cleanup arc:
 *
 *   - Cluster 1: Kathy cleanup            (APPLIED 2026-04-22)
 *   - Cluster 2: Wrapper create + nest    (APPLIED 2026-04-24)
 *   - Cluster 3: 2H Retainer Renewal Task (THIS SCRIPT, 2026-04-26)
 *
 * Why this is non-trivial:
 *   The wrapper is a retainer L1 with 16 child L1s pointing at it. PR 90
 *   added a recompute guard: when a child WI is added to a wrapper-style
 *   retainer (engagementType="retainer" + EXISTS children), the wrapper's
 *   start_date / end_date stay PINNED to the operator-set contract dates
 *   (2026-02-01 .. 2026-07-31) instead of being recomputed from L2 widths.
 *   Without the guard, this single weekOf=2026-05-25 WI would collapse the
 *   wrapper to start=2026-05-25, end=2026-05-25 — a regression that would
 *   break the retainer reporting surface.
 *
 *   The APPLY here doubles as a live recompute-guard E2E test: after the
 *   WI insert, this script re-reads the wrapper and asserts the dates
 *   are UNCHANGED. If the guard fires correctly, the script completes
 *   green. If the wrapper dates moved, the script throws and the operator
 *   runs the REVERT.
 *
 * Locked decisions (operator-signed):
 *   - title: "2H Convergix Retainer Renewal" (operator 2026-04-24)
 *   - weekOf: 2026-05-25, dayOfWeek: monday (operator 2026-04-24)
 *   - owner: "Kathy" (account-led; Kathy in accounts_led for convergix)
 *   - resources: "AM: Kathy" (account manager driving renewal conversation)
 *   - category: "kickoff" (operator confirmation at DRY_RUN review;
 *     reasoning: it's a planning trigger, not a deliverable)
 *   - status: "scheduled" (rides the Cluster 2 WI status fill pattern)
 *
 * Reverse: convergix-retainer-renewal-task-REVERT-2026-04-26.ts
 * Verify:  convergix-retainer-renewal-task-verify-2026-04-26.ts
 */

import { eq, and } from "drizzle-orm";
import type { MigrationContext } from "../runway-migrate";
import { projects, weekItems, updates } from "@/lib/db/runway-schema";
import { createWeekItem, recomputeProjectDatesWith } from "@/lib/runway/operations-writes-week";
import { findProjectByFuzzyName } from "@/lib/runway/operations-utils";

// ── Constants ────────────────────────────────────────────

const BATCH_ID = "convergix-retainer-renewal-task-2026-04-26";
const UPDATED_BY = BATCH_ID;

const WRAPPER_ID = "4171aa4d88934d22b020d75fe";
const WRAPPER_NAME = "1H Convergix Retainer";
const CLIENT_SLUG = "convergix";
const CLIENT_ID = "181fea93bc4d435db0a1a8283";

// Operator-pinned contract dates — must remain unchanged after the WI insert
const EXPECTED_WRAPPER_START = "2026-02-01";
const EXPECTED_WRAPPER_END = "2026-07-31";

const TARGET_WI = {
  title: "2H Convergix Retainer Renewal",
  weekOf: "2026-05-25",
  dayOfWeek: "monday",
  category: "kickoff",
  status: "scheduled",
  owner: "Kathy",
  resources: "AM: Kathy",
} as const;

// ── Exports ──────────────────────────────────────────────

export const description =
  "Cluster 3 (2026-04-26): create '2H Convergix Retainer Renewal' Task on wrapper id 4171aa4d at weekOf=2026-05-25. APPLY also live-validates the recompute guard — wrapper dates must stay pinned at 2026-02-01 .. 2026-07-31.";

export async function up(ctx: MigrationContext): Promise<void> {
  ctx.log("=== Cluster 3 — Convergix 2H Retainer Renewal Task (2026-04-26) ===");
  ctx.log(`batch_id: ${BATCH_ID}`);
  ctx.log("");

  const libsql = (ctx.db as unknown as { $client: {
    execute: (q: { sql: string; args: unknown[] }) => Promise<{ rows: Record<string, unknown>[] }>;
  } }).$client;

  // ── Pre-check 1: wrapper exists, name + engagementType + clientId match ──
  const wrapperRows = await ctx.db
    .select()
    .from(projects)
    .where(eq(projects.id, WRAPPER_ID));
  if (wrapperRows.length !== 1) {
    throw new Error(`Pre-check 1 FAILED: wrapper id=${WRAPPER_ID} not found.`);
  }
  const wrapper = wrapperRows[0];
  if (wrapper.name !== WRAPPER_NAME) {
    throw new Error(`Pre-check 1 FAILED: wrapper name="${wrapper.name}", expected "${WRAPPER_NAME}".`);
  }
  if (wrapper.engagementType !== "retainer") {
    throw new Error(`Pre-check 1 FAILED: wrapper engagementType="${wrapper.engagementType ?? "null"}", expected "retainer".`);
  }
  if (wrapper.clientId !== CLIENT_ID) {
    throw new Error(`Pre-check 1 FAILED: wrapper clientId="${wrapper.clientId}", expected "${CLIENT_ID}".`);
  }
  ctx.log(`Pre-check 1 PASS: wrapper "${wrapper.name}" / engagementType=retainer / clientId match`);

  // ── Pre-check 2: wrapper dates pinned to expected operator values ──
  if (wrapper.startDate !== EXPECTED_WRAPPER_START) {
    throw new Error(`Pre-check 2 FAILED: wrapper.startDate="${wrapper.startDate}", expected "${EXPECTED_WRAPPER_START}".`);
  }
  if (wrapper.endDate !== EXPECTED_WRAPPER_END) {
    throw new Error(`Pre-check 2 FAILED: wrapper.endDate="${wrapper.endDate}", expected "${EXPECTED_WRAPPER_END}".`);
  }
  ctx.log(`Pre-check 2 PASS: wrapper dates ${wrapper.startDate} .. ${wrapper.endDate} (captured for post-write guard verify)`);

  // ── Pre-check 3: ≥1 child points at wrapper (recompute guard predicate) ──
  const childCountRows = await libsql.execute({
    sql: "SELECT COUNT(*) AS n FROM projects WHERE parent_project_id = ?",
    args: [WRAPPER_ID],
  });
  const nKids = Number(childCountRows.rows[0].n);
  if (nKids < 1) {
    throw new Error(`Pre-check 3 FAILED: wrapper has ${nKids} children. Recompute guard requires ≥1 child to fire (engagementType="retainer" + EXISTS children).`);
  }
  ctx.log(`Pre-check 3 PASS: wrapper has ${nKids} children (recompute guard predicate satisfied)`);

  // ── Pre-check 4: target cell (wrapper × weekOf) empty ──
  const existingAtCell = await ctx.db
    .select({ id: weekItems.id, title: weekItems.title })
    .from(weekItems)
    .where(and(
      eq(weekItems.projectId, WRAPPER_ID),
      eq(weekItems.weekOf, TARGET_WI.weekOf),
    ));
  if (existingAtCell.length > 0) {
    throw new Error(`Pre-check 4 FAILED: WI(s) already exist on wrapper at weekOf=${TARGET_WI.weekOf}: ${JSON.stringify(existingAtCell)}`);
  }
  ctx.log(`Pre-check 4 PASS: target cell empty (no WI on wrapper at weekOf=${TARGET_WI.weekOf})`);

  // ── Pre-check 5: no WI in convergix client titled "2H Convergix Retainer Renewal" anywhere ──
  const titleHits = await libsql.execute({
    sql: "SELECT id, project_id, week_of FROM week_items WHERE client_id = ? AND title = ?",
    args: [CLIENT_ID, TARGET_WI.title],
  });
  if (titleHits.rows.length > 0) {
    throw new Error(`Pre-check 5 FAILED: WI titled "${TARGET_WI.title}" already exists in convergix: ${JSON.stringify(titleHits.rows)}`);
  }
  ctx.log(`Pre-check 5 PASS: no existing WI titled "${TARGET_WI.title}" in convergix`);

  // ── Pre-check 6: fuzzy-match resolves WRAPPER_NAME to WRAPPER_ID ──
  // Belt-and-suspenders: the createWeekItem helper uses findProjectByFuzzyName
  // to resolve projectName → projectId. If it fails to match (or matches the
  // wrong project), the WI would be inserted without a project link and the
  // recompute guard would never fire. Verify the resolution before APPLY.
  const fuzzy = await findProjectByFuzzyName(CLIENT_ID, WRAPPER_NAME);
  if (!fuzzy || fuzzy.id !== WRAPPER_ID) {
    throw new Error(
      `Pre-check 6 FAILED: findProjectByFuzzyName("${WRAPPER_NAME}") returned ${fuzzy ? `id=${fuzzy.id} name="${fuzzy.name}"` : "null"}, expected id=${WRAPPER_ID}.`
    );
  }
  ctx.log(`Pre-check 6 PASS: fuzzy match "${WRAPPER_NAME}" → ${WRAPPER_ID}`);

  // ── Plan log ──
  ctx.log("");
  ctx.log("=== Plan ===");
  ctx.log(`  CREATE week_item on wrapper:`);
  ctx.log(`    title:       "${TARGET_WI.title}"`);
  ctx.log(`    weekOf:      ${TARGET_WI.weekOf}`);
  ctx.log(`    dayOfWeek:   ${TARGET_WI.dayOfWeek}`);
  ctx.log(`    category:    ${TARGET_WI.category}`);
  ctx.log(`    status:      ${TARGET_WI.status}`);
  ctx.log(`    owner:       ${TARGET_WI.owner}`);
  ctx.log(`    resources:   ${TARGET_WI.resources}`);
  ctx.log(`    projectId:   ${WRAPPER_ID} (resolved via fuzzy match)`);
  ctx.log(`    clientId:    ${CLIENT_ID}`);
  ctx.log("");
  ctx.log("=== Post-write recompute-guard expectation ===");
  ctx.log(`  After insert, recomputeProjectDatesWith(tx, ${WRAPPER_ID.slice(0, 8)}…) fires inside the helper's transaction.`);
  ctx.log(`  Guard predicate: engagementType=retainer + ${nKids} children → returns the wrapper's stored dates.`);
  ctx.log(`  Wrapper dates MUST remain ${EXPECTED_WRAPPER_START} .. ${EXPECTED_WRAPPER_END} after the write.`);
  ctx.log(`  If they moved, this script throws — operator must run -REVERT immediately.`);

  if (ctx.dryRun) {
    ctx.log("");
    ctx.log("DRY_RUN — no writes. Re-run with --apply to execute.");
    return;
  }

  // ── APPLY ──
  ctx.log("");
  ctx.log("=== APPLY ===");

  const result = await createWeekItem({
    clientSlug: CLIENT_SLUG,
    projectName: WRAPPER_NAME,
    title: TARGET_WI.title,
    weekOf: TARGET_WI.weekOf,
    dayOfWeek: TARGET_WI.dayOfWeek,
    status: TARGET_WI.status,
    category: TARGET_WI.category,
    owner: TARGET_WI.owner,
    resources: TARGET_WI.resources,
    updatedBy: UPDATED_BY,
  });

  if (!result.ok) {
    throw new Error(`createWeekItem FAILED: ${result.error}`);
  }
  ctx.log(`✓ createWeekItem success: ${result.message}`);

  // ── Post-write: recompute-guard live verify (CRITICAL) ──
  const wrapperAfter = await ctx.db
    .select({
      startDate: projects.startDate,
      endDate: projects.endDate,
    })
    .from(projects)
    .where(eq(projects.id, WRAPPER_ID));
  const wAfter = wrapperAfter[0];
  if (wAfter.startDate !== EXPECTED_WRAPPER_START || wAfter.endDate !== EXPECTED_WRAPPER_END) {
    throw new Error(
      `RECOMPUTE GUARD FAILURE: wrapper dates changed after WI insert. ` +
      `Before: ${EXPECTED_WRAPPER_START} .. ${EXPECTED_WRAPPER_END}. ` +
      `After: ${wAfter.startDate} .. ${wAfter.endDate}. ` +
      `Run convergix-retainer-renewal-task-REVERT-2026-04-26.ts immediately.`
    );
  }
  ctx.log(`✓ Recompute guard verified: wrapper dates unchanged (${wAfter.startDate} .. ${wAfter.endDate})`);

  // ── Post-write: confirm exactly 1 audit row landed under this batch ──
  const auditRows = await ctx.db
    .select({ id: updates.id, summary: updates.summary })
    .from(updates)
    .where(eq(updates.batchId, BATCH_ID));
  if (auditRows.length !== 1) {
    throw new Error(`Post-write audit check FAILED: expected 1 audit row under batch_id="${BATCH_ID}", found ${auditRows.length}.`);
  }
  ctx.log(`✓ Audit row landed: ${auditRows[0].summary}`);

  ctx.log("");
  ctx.log("=== APPLY complete. Cluster 3 landed. Recompute guard live-validated. ===");
  ctx.log("Next: pnpm runway:migrate scripts/runway-migrations/convergix-retainer-renewal-task-verify-2026-04-26.ts --apply");
}
