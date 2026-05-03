/**
 * Post-verify: Hopdoddy Cards 1+2 (2026-04-30)
 *
 * Read-only verification that the APPLY of hopdoddy-cards-1-2-2026-04-30.ts
 * landed correctly. Asserts:
 *
 *   1. L2 25a9af68 ("Hopdoddy Brand Refresh Website launch"): weekOf=2026-05-18,
 *      dayOfWeek=tuesday, date=2026-05-19, startDate=2026-05-19, endDate=2026-05-19,
 *      status=scheduled, resources="Dev: Leslie".
 *   2. BR L1 c323e450 ("Brand Refresh Website"): notes match Op 8 payload,
 *      dueDate=2026-05-19 (deadline anchor; Op 9),
 *      startDate=2026-03-01, endDate=2026-05-19 (auto-derived from L2 → recompute → 5/19).
 *   3. Digital Retainer L1 (id bc55c0b734df418cb308e79d3): notes match Op 13 payload,
 *      resources="AM: Jill, CD: Lane, Dev: Leslie", startDate=2026-01-01, endDate=2026-12-31.
 *   4. New L1 "Brand Refresh Revisions" exists with: parentProjectId=bc55c0b734df418cb308e79d3,
 *      engagementType=project, status=not-started, category=pipeline, owner=Jill,
 *      resources="AM: Jill, CD: Lane, Dev: Leslie", notes match Op 14 payload.
 *   5. Audit-row count: exactly 15 rows under batch_id="hopdoddy-cards-1-2-2026-04-30".
 *
 * Exit non-zero on any failure.
 *
 * Usage:
 *   pnpm tsx scripts/runway-migrations/hopdoddy-cards-1-2-2026-04-30-verify.ts
 */

import { eq, and, like } from "drizzle-orm";
import { createRunwayDb, runIfDirect } from "../lib/run-script";
import { projects, weekItems, updates } from "@/lib/db/runway-schema";

const BATCH_ID = "hopdoddy-cards-1-2-2026-04-30";
const EXPECTED_AUDIT_COUNT = 15;

// L2 expectations
const L2_TITLE = "Hopdoddy Brand Refresh Website launch";
const L2_ID_PREFIX = "25a9af68";
const L2_EXPECTED = {
  weekOf: "2026-05-18",
  dayOfWeek: "tuesday",
  date: "2026-05-19",
  startDate: "2026-05-19",
  endDate: "2026-05-19",
  status: "scheduled",
  resources: "Dev: Leslie",
} as const;

// BR L1 expectations
const BR_PROJECT_NAME = "Brand Refresh Website";
const BR_ID_PREFIX = "c323e450";
const BR_NOTES_EXPECTED =
  "Launch 5/19 (single-day). Jennifer feedback received 4/28 — see https://docs.google.com/document/d/11_C_r3SzLihgnU_b_68XRIVtR_brntXGB8f50LWJI4U/edit. Team walk-through pending. Original ~80 hrs scope nearly exhausted; revisions LOE in scoping — book to Digital Retainer once confirmed. Kickoff 3/1 approximate (no formal SOW).";
const BR_START_DATE_EXPECTED = "2026-03-01";
const BR_END_DATE_EXPECTED = "2026-05-19";
const BR_DUE_DATE_EXPECTED = "2026-05-19";

// Digital Retainer L1 expectations
const DR_PROJECT_ID = "bc55c0b734df418cb308e79d3";
const DR_PROJECT_NAME = "Digital Retainer (195 hrs)";
const DR_NOTES_EXPECTED =
  "195 hrs Jan–Dec 2026. $38K core + $14,800 BR incremental. Standing team: AM: Jill, CD: Lane, Dev: Leslie.";
const DR_RESOURCES_EXPECTED = "AM: Jill, CD: Lane, Dev: Leslie";
const DR_START_DATE_EXPECTED = "2026-01-01";
const DR_END_DATE_EXPECTED = "2026-12-31";

// New L1 expectations
const NEW_CHILD_NAME = "Brand Refresh Revisions";
const NEW_CHILD_PARENT_ID = "bc55c0b734df418cb308e79d3";
const NEW_CHILD_NOTES_EXPECTED =
  "LOE in scoping per 4/28 Jennifer feedback doc. Original BR ~80 hrs nearly exhausted; revisions book here once LOE confirmed.";

async function main(): Promise<void> {
  console.log("=== Hopdoddy Cards 1+2 Post-Verify (2026-04-30) ===");
  console.log(`batch_id: ${BATCH_ID}`);
  console.log("");

  const { db } = createRunwayDb();
  const failures: string[] = [];

  // ── Assertion 1: L2 25a9af68 ──
  const l2Rows = await db
    .select()
    .from(weekItems)
    .where(like(weekItems.id, `${L2_ID_PREFIX}%`));
  if (l2Rows.length !== 1) {
    failures.push(
      `Assertion 1 FAILED: expected 1 L2 with id prefix "${L2_ID_PREFIX}", found ${l2Rows.length}.`,
    );
  } else {
    const l2 = l2Rows[0];
    if (l2.title !== L2_TITLE) {
      failures.push(
        `Assertion 1 FAILED: L2.title="${l2.title}", expected "${L2_TITLE}".`,
      );
    }
    const checks: Array<[string, unknown, unknown]> = [
      ["weekOf", l2.weekOf, L2_EXPECTED.weekOf],
      ["dayOfWeek", l2.dayOfWeek, L2_EXPECTED.dayOfWeek],
      ["date", l2.date, L2_EXPECTED.date],
      ["startDate", l2.startDate, L2_EXPECTED.startDate],
      ["endDate", l2.endDate, L2_EXPECTED.endDate],
      ["status", l2.status, L2_EXPECTED.status],
      ["resources", l2.resources, L2_EXPECTED.resources],
    ];
    for (const [field, actual, expected] of checks) {
      if (actual !== expected) {
        failures.push(
          `Assertion 1 FAILED: L2.${field}=${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}.`,
        );
      }
    }
  }
  console.log(
    `Assertion 1 (L2 25a9af68 fields): ${failures.filter((f) => f.startsWith("Assertion 1")).length === 0 ? "PASS" : "FAIL"}`,
  );

  // ── Assertion 2: BR L1 c323e450 ──
  const brRows = await db
    .select()
    .from(projects)
    .where(like(projects.id, `${BR_ID_PREFIX}%`));
  if (brRows.length !== 1) {
    failures.push(
      `Assertion 2 FAILED: expected 1 BR L1 with id prefix "${BR_ID_PREFIX}", found ${brRows.length}.`,
    );
  } else {
    const br = brRows[0];
    if (br.name !== BR_PROJECT_NAME) {
      failures.push(
        `Assertion 2 FAILED: BR.name="${br.name}", expected "${BR_PROJECT_NAME}".`,
      );
    }
    if (br.notes !== BR_NOTES_EXPECTED) {
      failures.push(
        `Assertion 2 FAILED: BR.notes mismatch. Got: ${JSON.stringify(br.notes)}. Expected: ${JSON.stringify(BR_NOTES_EXPECTED)}.`,
      );
    }
    if (br.startDate !== BR_START_DATE_EXPECTED) {
      failures.push(
        `Assertion 2 FAILED: BR.startDate="${br.startDate}", expected "${BR_START_DATE_EXPECTED}".`,
      );
    }
    if (br.endDate !== BR_END_DATE_EXPECTED) {
      failures.push(
        `Assertion 2 FAILED: BR.endDate="${br.endDate}", expected "${BR_END_DATE_EXPECTED}" (auto-derived from L2 endDate via recompute).`,
      );
    }
    if (br.dueDate !== BR_DUE_DATE_EXPECTED) {
      failures.push(
        `Assertion 2 FAILED: BR.dueDate="${br.dueDate}", expected "${BR_DUE_DATE_EXPECTED}" (deadline anchor written by Op 9).`,
      );
    }
  }
  console.log(
    `Assertion 2 (BR L1 c323e450 notes + dates + dueDate): ${failures.filter((f) => f.startsWith("Assertion 2")).length === 0 ? "PASS" : "FAIL"}`,
  );

  // ── Assertion 3: Digital Retainer L1 ──
  const drRows = await db
    .select()
    .from(projects)
    .where(eq(projects.id, DR_PROJECT_ID));
  if (drRows.length !== 1) {
    failures.push(
      `Assertion 3 FAILED: expected 1 Digital Retainer L1 with id="${DR_PROJECT_ID}", found ${drRows.length}.`,
    );
  } else {
    const dr = drRows[0];
    if (dr.name !== DR_PROJECT_NAME) {
      failures.push(
        `Assertion 3 FAILED: DR.name="${dr.name}", expected "${DR_PROJECT_NAME}".`,
      );
    }
    if (dr.notes !== DR_NOTES_EXPECTED) {
      failures.push(
        `Assertion 3 FAILED: DR.notes mismatch. Got: ${JSON.stringify(dr.notes)}. Expected: ${JSON.stringify(DR_NOTES_EXPECTED)}.`,
      );
    }
    if (dr.resources !== DR_RESOURCES_EXPECTED) {
      failures.push(
        `Assertion 3 FAILED: DR.resources="${dr.resources}", expected "${DR_RESOURCES_EXPECTED}".`,
      );
    }
    if (dr.startDate !== DR_START_DATE_EXPECTED) {
      failures.push(
        `Assertion 3 FAILED: DR.startDate="${dr.startDate}", expected "${DR_START_DATE_EXPECTED}".`,
      );
    }
    if (dr.endDate !== DR_END_DATE_EXPECTED) {
      failures.push(
        `Assertion 3 FAILED: DR.endDate="${dr.endDate}", expected "${DR_END_DATE_EXPECTED}".`,
      );
    }
  }
  console.log(
    `Assertion 3 (Digital Retainer L1 fields): ${failures.filter((f) => f.startsWith("Assertion 3")).length === 0 ? "PASS" : "FAIL"}`,
  );

  // ── Assertion 4: new L1 "Brand Refresh Revisions" ──
  const newChildRows = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.parentProjectId, NEW_CHILD_PARENT_ID),
        eq(projects.name, NEW_CHILD_NAME),
      ),
    );
  if (newChildRows.length !== 1) {
    failures.push(
      `Assertion 4 FAILED: expected 1 child L1 "${NEW_CHILD_NAME}" under parent ${NEW_CHILD_PARENT_ID}, found ${newChildRows.length}.`,
    );
  } else {
    const c = newChildRows[0];
    const checks: Array<[string, unknown, unknown]> = [
      ["name", c.name, NEW_CHILD_NAME],
      ["parentProjectId", c.parentProjectId, NEW_CHILD_PARENT_ID],
      ["engagementType", c.engagementType, "project"],
      ["status", c.status, "not-started"],
      ["category", c.category, "pipeline"],
      ["owner", c.owner, "Jill"],
      ["resources", c.resources, "AM: Jill, CD: Lane, Dev: Leslie"],
      ["notes", c.notes, NEW_CHILD_NOTES_EXPECTED],
    ];
    for (const [field, actual, expected] of checks) {
      if (actual !== expected) {
        failures.push(
          `Assertion 4 FAILED: newChild.${field}=${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}.`,
        );
      }
    }
  }
  console.log(
    `Assertion 4 (new L1 "Brand Refresh Revisions"): ${failures.filter((f) => f.startsWith("Assertion 4")).length === 0 ? "PASS" : "FAIL"}`,
  );

  // ── Assertion 5: audit-row count exactly 15 ──
  const auditRows = await db
    .select({ id: updates.id })
    .from(updates)
    .where(eq(updates.batchId, BATCH_ID));
  if (auditRows.length !== EXPECTED_AUDIT_COUNT) {
    failures.push(
      `Assertion 5 FAILED: expected ${EXPECTED_AUDIT_COUNT} audit rows under batch_id="${BATCH_ID}", found ${auditRows.length}.`,
    );
  }
  console.log(
    `Assertion 5 (audit count): ${auditRows.length === EXPECTED_AUDIT_COUNT ? "PASS" : "FAIL"} (actual=${auditRows.length}, expected=${EXPECTED_AUDIT_COUNT})`,
  );

  console.log("");
  if (failures.length === 0) {
    console.log(`✓ All 5 assertions PASSED. Hopdoddy Cards 1+2 verified clean.`);
  } else {
    console.error(`✗ ${failures.length} assertion(s) FAILED:`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
}

runIfDirect("hopdoddy-cards-1-2-2026-04-30-verify", main);
