/**
 * Timestamp Correction — 2026-04-22
 *
 * Fixes ms-encoded `updates.created_at` values left behind by two legacy raw-drizzle
 * scripts that bypassed Drizzle's typed timestamp encoder. Schema is
 * `integer("created_at", { mode: "timestamp" })` which expects SECONDS; these
 * rows stored MILLISECONDS, so they decode to ~year 58275.
 *
 * Known affected batches (per known-issues.md):
 *   - hotsheet-cleanup-2026-04-22 (34 rows)
 *   - target-to-notes-raw-2026-04-21 (4 rows)
 *
 * Belt-and-suspenders targeting:
 *   1. SCAN: report ALL rows with created_at > 1e11 grouped by batch_id so we
 *      notice anything outside the two known batches.
 *   2. TARGET: only rows where BOTH (batch_id in known list) AND (created_at > 1e11).
 *      Any row with created_at > 1e11 but unknown batch_id is flagged, not touched,
 *      until we understand it.
 *
 * Correction: created_at = floor(created_at / 1000). SQLite integer division via
 * CAST to guard against floating-point drift.
 *
 * DRY_RUN by default. Set APPLY=1 to execute.
 *
 * This batch mutates audit rows in place. That is intentional: the column's
 * purpose is "when did this audit event happen" and the current values lie.
 * In-place correction restores that truth. The correction itself is traceable
 * via this script's source + the post-verify output in this directory.
 */

import { createRunwayDb } from "../../../scripts/lib/run-script";
import { updates } from "../../../src/lib/db/runway-schema";
import { sql, inArray, and, gt, eq } from "drizzle-orm";

const BATCH_ID = "timestamp-correction-2026-04-22";
const UPDATED_BY = `timestamp-correction-2026-04-22-${process.env.UPDATED_BY_SUFFIX ?? "run1"}`;
const APPLY = process.env.APPLY === "1";

const KNOWN_AFFECTED_BATCHES = [
  "hotsheet-cleanup-2026-04-22",
  "target-to-notes-raw-2026-04-21",
];

const MS_THRESHOLD = 100_000_000_000; // 1e11 — any year-2026 seconds value is ~1.77e9; any ms value is ~1.77e12

async function main() {
  const { db, url } = createRunwayDb();

  console.log(`\n=== Timestamp Correction ===`);
  console.log(`Batch ID:   ${BATCH_ID}`);
  console.log(`Updated By: ${UPDATED_BY}`);
  console.log(`Mode:       ${APPLY ? "APPLY" : "DRY_RUN"}`);
  console.log(`DB URL:     ${url.replace(/:[^@/]*@/, ":***@")}\n`);

  // ── SCAN ────────────────────────────────────────────────────────────────
  console.log(`--- SCAN: rows with created_at > ${MS_THRESHOLD} ---`);
  const scanRows = await db
    .select({
      id: updates.id,
      batchId: updates.batchId,
      updatedBy: updates.updatedBy,
      createdAt: sql<number>`${updates.createdAt}`.as("createdAt"),
      summary: updates.summary,
      updateType: updates.updateType,
    })
    .from(updates)
    .where(sql`${updates.createdAt} > ${MS_THRESHOLD}`);

  console.log(`Total ms-encoded rows: ${scanRows.length}\n`);

  const byBatch = new Map<string, number>();
  for (const r of scanRows) {
    const key = r.batchId ?? "(null)";
    byBatch.set(key, (byBatch.get(key) ?? 0) + 1);
  }
  console.log(`By batch_id:`);
  for (const [batch, count] of [...byBatch.entries()].sort((a, b) => b[1] - a[1])) {
    const known = KNOWN_AFFECTED_BATCHES.includes(batch) ? " ✓ known" : " ⚠️ UNEXPECTED";
    console.log(`  ${batch.padEnd(50)} ${String(count).padStart(4)}${known}`);
  }
  console.log();

  const unexpectedBatches = [...byBatch.keys()].filter(
    (b) => !KNOWN_AFFECTED_BATCHES.includes(b),
  );
  if (unexpectedBatches.length > 0) {
    console.log(`⚠️  UNEXPECTED BATCHES DETECTED:`);
    console.log(`    ${unexpectedBatches.join(", ")}`);
    console.log(`    These rows are ms-encoded but not in the known-affected list.`);
    console.log(`    They will NOT be touched until reviewed. Aborting write.\n`);

    const unexpectedSample = scanRows
      .filter((r) => !KNOWN_AFFECTED_BATCHES.includes(r.batchId ?? "(null)"))
      .slice(0, 10);
    console.log(`    Sample unexpected rows:`);
    for (const r of unexpectedSample) {
      console.log(
        `      id=${r.id} batch=${r.batchId} type=${r.updateType} summary=${(r.summary ?? "").slice(0, 60)}`,
      );
    }
    console.log();

    if (APPLY) {
      console.log(`APPLY mode BLOCKED by unexpected-batch guard. Exiting non-zero.`);
      process.exit(2);
    }
    console.log(`DRY_RUN: continuing to show what the known-batch correction WOULD do.\n`);
  }

  // ── TARGET ──────────────────────────────────────────────────────────────
  console.log(`--- TARGET: known affected batches AND created_at > ${MS_THRESHOLD} ---`);
  const targetRows = await db
    .select({
      id: updates.id,
      batchId: updates.batchId,
      updatedBy: updates.updatedBy,
      createdAtRaw: sql<number>`${updates.createdAt}`.as("createdAtRaw"),
      summary: updates.summary,
    })
    .from(updates)
    .where(
      and(
        inArray(updates.batchId, KNOWN_AFFECTED_BATCHES),
        sql`${updates.createdAt} > ${MS_THRESHOLD}`,
      ),
    );

  console.log(`Target row count: ${targetRows.length}\n`);

  console.log(`Per-row transform preview:`);
  console.log(
    `  ${"id".padEnd(26)} ${"batch".padEnd(34)} ${"before (ms)".padStart(15)} → ${"after (s)".padStart(12)} → decoded`,
  );
  for (const r of targetRows) {
    const beforeMs = r.createdAtRaw;
    const afterS = Math.floor(beforeMs / 1000);
    const decoded = new Date(afterS * 1000).toISOString();
    console.log(
      `  ${r.id.padEnd(26)} ${(r.batchId ?? "").padEnd(34)} ${String(beforeMs).padStart(15)} → ${String(afterS).padStart(12)} → ${decoded}`,
    );
  }
  console.log();

  // Sanity checks before write
  const expectedCount =
    (byBatch.get("hotsheet-cleanup-2026-04-22") ?? 0) +
    (byBatch.get("target-to-notes-raw-2026-04-21") ?? 0);
  if (targetRows.length !== expectedCount) {
    console.log(
      `⚠️  Target count mismatch: targetRows=${targetRows.length} expected=${expectedCount}`,
    );
  }

  // Sanity: all target rows should divide cleanly to a sensible 2026 timestamp
  for (const r of targetRows) {
    const afterS = Math.floor(r.createdAtRaw / 1000);
    const d = new Date(afterS * 1000);
    const year = d.getUTCFullYear();
    if (year < 2026 || year > 2026) {
      console.log(
        `⚠️  Row ${r.id} decodes to year ${year} after ÷1000 — not in 2026. Investigate before APPLY.`,
      );
    }
  }

  if (!APPLY) {
    console.log(`DRY_RUN complete. No writes performed.`);
    console.log(`To apply: APPLY=1 UPDATED_BY_SUFFIX=runN pnpm dlx tsx ${process.argv[1]}`);
    return;
  }

  // ── APPLY ───────────────────────────────────────────────────────────────
  console.log(`--- APPLY: correcting ${targetRows.length} rows in transaction ---`);

  let corrected = 0;
  await db.transaction(async (tx) => {
    for (const r of targetRows) {
      const afterS = Math.floor(r.createdAtRaw / 1000);
      // Direct integer write via sql raw — Drizzle's mode:timestamp expects Date
      // on write and would re-multiply. We want the raw seconds value in the
      // column, so we use sql for this specific corrective write only.
      await tx
        .update(updates)
        .set({ createdAt: sql`${afterS}` as unknown as Date })
        .where(eq(updates.id, r.id));
      corrected++;
    }
  });

  console.log(`Corrected ${corrected} rows.\n`);

  // ── POST-VERIFY (in-script) ─────────────────────────────────────────────
  console.log(`--- POST-VERIFY ---`);
  const remaining = await db
    .select({ id: updates.id })
    .from(updates)
    .where(sql`${updates.createdAt} > ${MS_THRESHOLD}`);
  console.log(`Rows still ms-encoded (created_at > ${MS_THRESHOLD}): ${remaining.length}`);
  if (remaining.length > 0) {
    console.log(`⚠️  Unexpected — IDs: ${remaining.map((r) => r.id).join(", ")}`);
  }

  // Re-read target rows to confirm new values
  const verifyRows = await db
    .select({
      id: updates.id,
      createdAtRaw: sql<number>`${updates.createdAt}`.as("createdAtRaw"),
    })
    .from(updates)
    .where(inArray(updates.batchId, KNOWN_AFFECTED_BATCHES));
  console.log(`Known-batch row count post-correction: ${verifyRows.length} (expected ${targetRows.length})`);
  const stillBad = verifyRows.filter((r) => r.createdAtRaw > MS_THRESHOLD);
  console.log(`Known-batch rows still ms-encoded: ${stillBad.length}`);
  const sampleVerify = verifyRows.slice(0, 3);
  for (const r of sampleVerify) {
    const d = new Date(r.createdAtRaw * 1000);
    console.log(`  ${r.id} → ${r.createdAtRaw}s → ${d.toISOString()}`);
  }

  console.log(`\nAPPLY complete. Batch ID: ${BATCH_ID}`);
}

main().catch((err) => {
  console.error("timestamp-correction failed:", err);
  process.exit(1);
});
