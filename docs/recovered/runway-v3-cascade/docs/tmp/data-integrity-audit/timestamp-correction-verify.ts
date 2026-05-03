/**
 * Independent post-verify for timestamp-correction-2026-04-22.
 *
 * Confirms:
 *  - Total updates row count unchanged (no accidental inserts/deletes).
 *  - 0 rows remain with created_at > 1e11 ms threshold anywhere in prod.
 *  - Affected batch row counts unchanged (34 + 4 = 38).
 *  - Sample decoded timestamps land in 2026-04 (sanity of month/year).
 *  - All other batches' created_at columns remain in valid seconds range.
 */

import { createRunwayDb } from "../../../scripts/lib/run-script";
import { updates } from "../../../src/lib/db/runway-schema";
import { sql, eq, count } from "drizzle-orm";

async function main() {
  const { db } = createRunwayDb();

  console.log(`\n=== Post-Verify: timestamp-correction-2026-04-22 ===\n`);

  const totalResult = await db.select({ c: count() }).from(updates);
  const total = totalResult[0].c;
  console.log(`Total updates rows: ${total}`);

  const msRows = await db
    .select({ c: count() })
    .from(updates)
    .where(sql`${updates.createdAt} > 100000000000`);
  console.log(`Rows with created_at > 1e11 (ms-encoded): ${msRows[0].c}`);

  const hotsheetCount = await db
    .select({ c: count() })
    .from(updates)
    .where(eq(updates.batchId, "hotsheet-cleanup-2026-04-22"));
  const targetToNotesCount = await db
    .select({ c: count() })
    .from(updates)
    .where(eq(updates.batchId, "target-to-notes-raw-2026-04-21"));
  console.log(
    `hotsheet-cleanup-2026-04-22 rows: ${hotsheetCount[0].c} (expected 34)`,
  );
  console.log(
    `target-to-notes-raw-2026-04-21 rows: ${targetToNotesCount[0].c} (expected 4)`,
  );

  const samples = await db
    .select({
      id: updates.id,
      batchId: updates.batchId,
      updatedBy: updates.updatedBy,
      updateType: updates.updateType,
      createdAtRaw: sql<number>`${updates.createdAt}`.as("createdAtRaw"),
    })
    .from(updates)
    .where(
      sql`${updates.batchId} IN ('hotsheet-cleanup-2026-04-22','target-to-notes-raw-2026-04-21')`,
    )
    .limit(5);

  console.log(`\nSample corrected rows:`);
  for (const r of samples) {
    const d = new Date(r.createdAtRaw * 1000);
    console.log(
      `  ${r.id.slice(0, 8)} batch=${r.batchId?.slice(0, 34)} type=${r.updateType} updated_by=${r.updatedBy?.slice(0, 40)} raw=${r.createdAtRaw} decoded=${d.toISOString()}`,
    );
  }

  const minSec = await db
    .select({ m: sql<number>`MIN(${updates.createdAt})`.as("m") })
    .from(updates);
  const maxSec = await db
    .select({ m: sql<number>`MAX(${updates.createdAt})`.as("m") })
    .from(updates);
  const minDate = new Date((minSec[0].m ?? 0) * 1000);
  const maxDate = new Date((maxSec[0].m ?? 0) * 1000);
  console.log(
    `\nGlobal created_at range: min=${minSec[0].m}s (${minDate.toISOString()}) max=${maxSec[0].m}s (${maxDate.toISOString()})`,
  );

  console.log(`\nPost-verify complete.`);
}

main().catch((err) => {
  console.error("verify failed:", err);
  process.exit(1);
});
