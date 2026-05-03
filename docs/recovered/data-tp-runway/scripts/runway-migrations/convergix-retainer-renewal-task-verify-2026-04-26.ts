/**
 * Post-verify: Cluster 3 — Convergix 2H Retainer Renewal Task (2026-04-26)
 *
 * Read-only verification that the Cluster 3 APPLY landed correctly:
 *   1. The renewal WI exists with all expected fields.
 *   2. The wrapper dates remain pinned (recompute guard held).
 *   3. Exactly 1 audit row under batch_id="convergix-retainer-renewal-task-2026-04-26".
 *   4. The audit row has a non-empty idempotency key.
 *   5. Drizzle round-trip on the WI returns plausible 2026 timestamps
 *      (no ms-encoded year-58275 regression).
 *
 * Usage:
 *   pnpm runway:migrate scripts/runway-migrations/convergix-retainer-renewal-task-verify-2026-04-26.ts --apply
 *
 * (--apply is fine here; this script performs zero writes.)
 */

import { eq, and } from "drizzle-orm";
import type { MigrationContext } from "../runway-migrate";
import { projects, weekItems, updates } from "@/lib/db/runway-schema";

const BATCH_ID = "convergix-retainer-renewal-task-2026-04-26";

const WRAPPER_ID = "4171aa4d88934d22b020d75fe";
const CLIENT_ID = "181fea93bc4d435db0a1a8283";

const EXPECTED_WRAPPER_START = "2026-02-01";
const EXPECTED_WRAPPER_END = "2026-07-31";

const EXPECTED_WI = {
  title: "2H Convergix Retainer Renewal",
  weekOf: "2026-05-25",
  dayOfWeek: "monday",
  category: "kickoff",
  status: "scheduled",
  owner: "Kathy",
  resources: "AM: Kathy",
} as const;

export const description =
  "Post-verify for Cluster 3 (convergix-retainer-renewal-task-2026-04-26). Read-only.";

export async function up(ctx: MigrationContext): Promise<void> {
  ctx.log("=== Cluster 3 Post-Verify (2026-04-26) ===");
  ctx.log(`batch_id: ${BATCH_ID}`);
  ctx.log("");

  const failures: string[] = [];

  // ── Assertion 1: WI exists with all expected fields ──
  const wiRows = await ctx.db
    .select()
    .from(weekItems)
    .where(and(
      eq(weekItems.projectId, WRAPPER_ID),
      eq(weekItems.weekOf, EXPECTED_WI.weekOf),
    ));
  if (wiRows.length !== 1) {
    failures.push(`Assertion 1 FAILED: expected 1 WI on wrapper at weekOf=${EXPECTED_WI.weekOf}, found ${wiRows.length}.`);
  } else {
    const wi = wiRows[0];
    const checks: Array<[string, unknown, unknown]> = [
      ["title", wi.title, EXPECTED_WI.title],
      ["dayOfWeek", wi.dayOfWeek, EXPECTED_WI.dayOfWeek],
      ["category", wi.category, EXPECTED_WI.category],
      ["status", wi.status, EXPECTED_WI.status],
      ["owner", wi.owner, EXPECTED_WI.owner],
      ["resources", wi.resources, EXPECTED_WI.resources],
      ["clientId", wi.clientId, CLIENT_ID],
    ];
    for (const [field, actual, expected] of checks) {
      if (actual !== expected) {
        failures.push(`Assertion 1 FAILED: WI.${field} = ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}.`);
      }
    }
  }
  ctx.log(`Assertion 1: WI fields match — ${failures.filter((f) => f.startsWith("Assertion 1")).length === 0 ? "PASS" : "FAIL"}`);

  // ── Assertion 2: wrapper dates unchanged (recompute guard held) ──
  const wrapperRows = await ctx.db
    .select({
      startDate: projects.startDate,
      endDate: projects.endDate,
      engagementType: projects.engagementType,
    })
    .from(projects)
    .where(eq(projects.id, WRAPPER_ID));
  if (wrapperRows.length !== 1) {
    failures.push(`Assertion 2 FAILED: wrapper id=${WRAPPER_ID} not found.`);
  } else {
    const w = wrapperRows[0];
    if (w.startDate !== EXPECTED_WRAPPER_START) {
      failures.push(`Assertion 2 FAILED: wrapper.startDate=${w.startDate}, expected ${EXPECTED_WRAPPER_START}.`);
    }
    if (w.endDate !== EXPECTED_WRAPPER_END) {
      failures.push(`Assertion 2 FAILED: wrapper.endDate=${w.endDate}, expected ${EXPECTED_WRAPPER_END}.`);
    }
    if (w.engagementType !== "retainer") {
      failures.push(`Assertion 2 FAILED: wrapper.engagementType=${w.engagementType}, expected "retainer".`);
    }
  }
  ctx.log(`Assertion 2: wrapper dates pinned + engagementType=retainer — ${failures.filter((f) => f.startsWith("Assertion 2")).length === 0 ? "PASS" : "FAIL"}`);

  // ── Assertion 3: exactly 1 audit row under this batch_id ──
  const auditRows = await ctx.db
    .select()
    .from(updates)
    .where(eq(updates.batchId, BATCH_ID));
  if (auditRows.length !== 1) {
    failures.push(`Assertion 3 FAILED: expected 1 audit row under batch_id="${BATCH_ID}", found ${auditRows.length}.`);
  }
  ctx.log(`Assertion 3: 1 audit row under batch_id — ${auditRows.length === 1 ? "PASS" : "FAIL"} (actual=${auditRows.length})`);

  // ── Assertion 4: audit row has non-empty idempotency key ──
  if (auditRows.length === 1) {
    const idemKey = auditRows[0].idempotencyKey;
    if (!idemKey || idemKey.length < 8) {
      failures.push(`Assertion 4 FAILED: audit row idempotency_key is empty or too short: ${JSON.stringify(idemKey)}.`);
    }
    ctx.log(`Assertion 4: audit idempotency_key = ${idemKey?.slice(0, 16)}… — ${idemKey && idemKey.length >= 8 ? "PASS" : "FAIL"}`);
  } else {
    ctx.log(`Assertion 4: skipped (no audit row to check).`);
  }

  // ── Assertion 5: drizzle round-trip returns plausible 2026 timestamps ──
  if (wiRows.length === 1) {
    const wi = wiRows[0];
    const yrCreated = wi.createdAt instanceof Date ? wi.createdAt.getUTCFullYear() : -1;
    const yrUpdated = wi.updatedAt instanceof Date ? wi.updatedAt.getUTCFullYear() : -1;
    if (yrCreated < 2025 || yrCreated > 2027) {
      failures.push(`Assertion 5 FAILED: WI.createdAt year=${yrCreated}, expected 2025–2027 (regression guard).`);
    }
    if (yrUpdated < 2025 || yrUpdated > 2027) {
      failures.push(`Assertion 5 FAILED: WI.updatedAt year=${yrUpdated}, expected 2025–2027 (regression guard).`);
    }
    ctx.log(`Assertion 5: drizzle round-trip plausible (createdAt year=${yrCreated}, updatedAt year=${yrUpdated}) — ${failures.filter((f) => f.startsWith("Assertion 5")).length === 0 ? "PASS" : "FAIL"}`);
  }

  ctx.log("");
  if (failures.length === 0) {
    ctx.log("✅ All 5 assertions PASSED. Cluster 3 verified clean.");
  } else {
    ctx.log(`❌ ${failures.length} assertion(s) FAILED:`);
    for (const f of failures) ctx.log(`  ${f}`);
    throw new Error(`Post-verify failed: ${failures.length} issue(s).`);
  }
}
