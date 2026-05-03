# Data Writes Inventory — CC #1 + CC #2 + Post-Merge (for data-integrity TP re-review)

**Purpose:** Cross-walk the prod-data write surface against fresh prod state before any of Part B's pending changes execute.

**Context:** Two CC sessions are planned. CC #1 = read-path (flags, detectors, Week-view filter, 4A/4B/4C scope additions per operator directive 2026-04-23). CC #2 = write-path CODE (retainer recompute guard, MCP surface expansion, PR 88 hygiene).

Per operator directive 2026-04-23 (hardened after prior migration pain — see `feedback_no_migrations_by_cc`): **all prod data writes flow through the data-integrity TP session using the MCP tools CC #2 builds + drizzle-typed inserts under batch-hygiene rails in `docs/tmp/data-integrity-audit/`. Operator approves per-operation; data-integrity TP executes.** CCs do not author or run migrations.

**Fresh prod snapshot:** 2026-04-23T15:19 UTC (see `docs/tmp/data-integrity-audit/wrapper-state-audit.md`).

---

## Part A — What CC #1 and CC #2 actually write to prod DB

**Zero.** Both CC sessions produce only:
- Code changes (TypeScript edits to detectors, MCP tool definitions, writes-layer helpers, By Account render path, retainer-team helper)
- File operations (cherry-picks of historical scripts, deletions of dead files and scratch files)
- Tests using `test-db.ts` local SQLite helper (isolated from prod; creates a fresh SQLite file per test, cleans up after)

**Verified pattern:** `operations-reads-health.test.ts` uses `vi.mock("@/lib/db/runway", () => ({ getRunwayDb: () => testDb }))` where `testDb` is built via `createTestDb()` and torn down via `cleanupTestDb(dbPath)` per test. No prod contact.

**Schema-drift gate (`pnpm runway:generate`)** is read-only comparison, not a push.

No MCP write calls during either CC session. No migration applies. No `runway:push`. No `runway:publish-updates`.

---

## Part B — Pending data changes OUTSIDE the CCs

Data-integrity TP drives these via MCP tools (built by CC #2) + drizzle-typed inserts under `/data-integrity` skill rails. Operator approves per-operation.

---

### Change 1: Convergix retainer-wrapper structure (Cluster 2 — after CC #1 merges)

#### Why

Convergix has **20 retainer-type Projects** representing work against a single 2026-02-01 → 2026-07-31 retainer contract. **17 are active, 3 are historical completions.** All 20 are currently top-level (`parent_project_id=null`). No single Project represents "the retainer contract as a whole." Problems today:

- Week view shows 17 separate lines per Convergix, hard to scan
- No single source-of-truth for the contract billing unit
- Billing/reporting aggregates 17+ rows manually
- v4 convention expects wrappers for retainers (wrapper sits **above** L1 in operator hierarchy; wrapper = billing unit; children = deliverables)

#### The fix

Create one new Project as the wrapper (sits above L1 in operator's hierarchy; in DB schema it's a `projects` row). Set `parent_project_id` on the **17 active** Convergix retainer L1s to point at the wrapper. The **3 historical completions stay unparented** per operator directive 2026-04-22 ("we are not doing legacy projects from the past, please don't build those").

#### Exact data change

INSERT 1 row into `projects`:

```
id:                <uuid>
name:              "Convergix Retainer"                 (locked — dates live in contractStart/contractEnd, not in name; new contract period = new wrapper row, not a rename)
client_slug:       "convergix"
engagement_type:   "retainer"
status:            "in-production"                      (locked — contract relationship, not aggregate of children; flipped manually post-contract-end)
owner:             "Kathy"
contract_start:    "2026-02-01"                         (locked)
contract_end:      "2026-07-31"                         (locked)
start_date:        "2026-02-01"                         (operator-signed 2026-04-23 — explicit; supersedes "let recompute populate")
end_date:          "2026-07-31"                         (operator-signed 2026-04-23 — explicit)
parent_project_id: null
category:          "active"                             (resolved 2026-04-23)
resources:         NULL                                 (resolved 2026-04-23 — team stays on client; wrapper pulls via get_retainer_team helper shipped by CC #1)
waiting_on:        null
notes:             "Retainer-period container for Feb-Jul 2026 Convergix contract. Children L1s nest via parent_project_id."
stale_days:        0
sort_order:        0                                    (resolved 2026-04-23 — renders atop Convergix section)
created_at:        <now>
updated_at:        <now>
```

UPDATE 17 rows in `projects` (each ACTIVE Convergix retainer L1):
- Set `parent_project_id = <new wrapper id>`
- No other field changes

INSERT 18 rows in `updates` (audit table):
- 1 for wrapper creation (`update_type: "create-project"`)
- 17 for parent_project_id updates (`update_type: "field-change"`, `field: "parentProjectId"`)
- All tagged `batch_id = "convergix-wrapper-create-<YYYY-MM-DD>"`
- All `updated_by = "convergix-wrapper-create-<YYYY-MM-DD>"` (unique marker per idempotency convention)

#### The 17 active children (fresh prod 2026-04-23, canonical)

All 17 have: `engagement_type="retainer"`, `parent_project_id=null`, `contract_start="2026-02-01"`, `contract_end="2026-07-31"`.

| id (truncated) | name | status |
|---|---|---|
| 0c208308 | New Capacity (PPT, brochure, one-pager) | awaiting-client |
| 3d5215f4 | Fanuc Award Article + LI Post | not-started |
| 135c5a61 | Events Page Updates (5 tradeshows) | in-production |
| 394f9e5e | Rockwell PartnerNetwork Article | in-production |
| c0935359 | Texas Instruments Article | in-production |
| f391dff5 | Social Content — April 2026 | in-production |
| 51f39e5c | Brand Guide v2 | in-production |
| 68a4ee37 | Certifications Page | awaiting-client |
| 0e4214c6 | CDS Vertical Campaign | in-production |
| 65b2cac1 | Corporate Collateral Updates | in-production |
| 0157c423 | Big Win Template | in-production |
| 1923fc1a | Rockwell Automation Co-Marketing Efforts | awaiting-client |
| 272e7eef | AUTOMATE 2026 Booth Design | in-production |
| b452f647 | Social Content — May 2026 | in-production |
| ede98a29 | Social Content — June 2026 | not-started |
| 9396b7a0 | Social Content — July 2026 | not-started |
| 95ba6a2f | Industrial/Battery Assembly Campaign | not-started |

Historical completions (3) — **EXCLUDED** from nesting:

| id (truncated) | name | status |
|---|---|---|
| 4b5bf2f0 | Life Sciences Brochure | completed |
| c568d7a6 | Social Media Templates | completed |
| 7c8478dc | Organic Social Playbook | completed |

#### Resolved decisions (operator-locked)

All four original "open decisions for external TP" are resolved. Full record in `docs/tmp/data-integrity-audit/pending-decisions.md`.

- **D1 — Include the 3 completed L1s under the wrapper?** — RESOLVED 2026-04-22: nest only the 17 active. Historical completions stay unparented.
- **D2 — Children retain duplicated `contract_start` / `contract_end`?** — RESOLVED 2026-04-23: keep duplicated (safer if wrapper deleted/reparented later; children render correctly in isolation).
- **D3 — Wrapper status while some children are completed/blocked?** — Confirmed: wrapper status reflects the contract relationship, not children's aggregate. Locked `status="in-production"` until operator manually flips to `completed` after contract_end + wrap-up.
- **D4 — Wrapper `category` / `resources` / `sort_order`?** — RESOLVED 2026-04-23: `category="active"`, `resources=NULL` (team stays on client; wrapper pulls via `get_retainer_team`), `sort_order=0` (renders atop Convergix section).

#### New operator-signed decision (2026-04-23)

**Wrapper `startDate` / `endDate` at creation = explicit `2026-02-01` / `2026-07-31`** (contract window).

Supersedes original locked metadata "let recompute populate from children." CC #2's recompute guard (Task 4 / Commit 10) freezes wrapper dates once `parent_project_id` children exist — so auto-populate can't happen. Setting explicit dates at creation preserves the contract-window timeline in By Account view (wrapper card shows "2026-02-01 → 2026-07-31" as a tracking cue for renewal conversations).

Data-integrity TP will update `project_convergix_cleanup_applied.md` auto-memory post-CC-#2 merge so locked metadata reflects this.

#### Recompute guard interaction (CC #2 ships this)

After CC #2 merges, the retainer-aware recompute guard is live in `operations-writes-week.ts`. Predicate: freeze date recompute on any retainer L1 that has L1 children pointing at it (EXISTS subquery).

- Wrapper (17 children after Cluster 2 apply) → recompute skipped, dates stay at SOW values
- Each child (0 L1 children) → recompute fires normally from L2 widths
- Writing L2 dates on children updates child L1 dates; wrapper untouched

**Ordering — Cluster 2 is safe AFTER CC #1 merges (Gate A + B live), BEFORE CC #2 merges** (per `wrapper-state-audit.md` cluster analysis). Project creation + `parent_project_id` updates on children don't trigger recompute on the wrapper itself. Waiting for CC #2's guard is not required for Cluster 2.

---

### Change 1-b: Retainer-renewal Task on the wrapper (Cluster 3 — after CC #2 merges)

Per locked metadata, wrapper carries a retainer-renewal Task anchoring Kathy's Monday 2026-05-25 prompt and the `detectRetainerRenewals` flag trigger.

INSERT 1 row in `week_items`:

```
project_id:    <wrapper.id>
client_id:     convergix
title:         "2H retainer conversation with Daniel"   (wordsmith with operator)
start_date:    "2026-05-25"
end_date:      "2026-05-25"
week_of:       "2026-05-25"
day_of_week:   "monday"
status:        "scheduled"
owner:         "Kathy"
resources:     "Kathy"
category:      "kickoff"                                (or "deadline" — operator call; default kickoff)
notes:         "Initiate 2H 2026 retainer conversation with Daniel. Locked metadata directive."
```

INSERT 1 row in `updates`:
- `update_type: "create-week-item"`
- `batch_id: "convergix-wrapper-renewal-task-<YYYY-MM-DD>"`
- `updated_by: "convergix-wrapper-renewal-task-<YYYY-MM-DD>"`

**Ordering — Cluster 3 MUST run AFTER CC #2 merges** (Gate C — recompute guard live). Without the guard, creating this L2 on the wrapper would trigger `recomputeProjectDatesWith(wrapper.id)` → set wrapper dates = MIN/MAX of `[2026-05-25, 2026-05-25]` — collapsing the contract window to a single day. With the guard: wrapper has 17 children (from Cluster 2) → recompute returns frozen existing dates → wrapper keeps `2026-02-01 → 2026-07-31`.

Not urgent — 2026-05-25 is 32 days out.

---

### Change 2: Phase 3 NULL-status backfill (data-integrity TP owns, blocked on Kathy replies)

Fresh snapshot: **17 NULL-status L2s** across 5 clients.

| Client | Count |
|---|---|
| LPPC | 10 |
| Bonterra | 3 |
| Dave Asprey | 2 |
| Soundly | 1 |
| Hopdoddy | 1 |
| Convergix | **0** (resolved during Kathy cleanup 2026-04-22) |

**Not a single-batch blanket operation.** Per operator directive 2026-04-22 + Phase 3 planning in `docs/tmp/data-integrity-audit/next-phases.md`: per-row reasoning, not blanket filter.

- Blanket `start_date >= today` loses signal on past-dated NULLs that still matter (delivered but status never flipped).
- Volume (17 rows) doesn't benefit from a single-batch approach.
- Per-row status calls (`scheduled` / `in-progress` / `blocked` / `at-risk` / `completed`) driven by Kathy-team replies + hot-sheet context.

**Workflow:** Phase 3 question doc sent to Kathy 2026-04-22. Data-integrity TP owns execution under `/data-integrity` skill rails when replies land.

**Ordering:** independent of CC #1 and CC #2 merges. Blocked on Kathy.

---

## Part C — MCP tools that will exist post-CC-#1/CC-#2-merge (enable the changes above)

All new or expanded MCP tools land via CC #1 (retainer team read tool) + CC #2 (write-path tools) code. No data writes during CC execution. Data-integrity TP uses these tools post-merge to execute Clusters 2 and 3.

### New tools (from CC #1 — 4C)

**`get_retainer_team({ wrapperId })`** — read-only. Returns deduplicated team across child L1s of a retainer wrapper (wrapper's own owner surfaced separately via `owner` field). Full spec: `docs/tmp/data-integrity-audit/get-retainer-team-spec.md`.

### New tools (from CC #2 — Task 5 Commit 13)

**`override_project_date({ clientSlug, projectName, field: "startDate"|"endDate", newValue: ISO|null, updatedBy, bypassGuard?: boolean })`**
- Raw-drizzles L1 date writes (bypasses derived-field whitelist; matches pattern from commit 78eb5c1)
- Writes audit row with `update_type = "date-override"` AND both `oldValue` and `newValue` (clean reverts)
- Idempotency key from `(projectId, field, oldValue, newValue)` — revert + retry produces distinct key
- Rejects on wrapper L1 (retainer + EXISTS children) unless `bypassGuard=true`

**`set_project_parent({ clientSlug, projectName, parentProjectName: string|null, updatedBy })`**
- Validates: parent exists; parent `engagement_type="retainer"`; parent and child share same `client_id`; no cycle (10-hop walk)
- `parentProjectName=null` clears `parent_project_id`
- Routes through `updateProjectField` (parentProjectId whitelisted by CC #2's Commit 11)

**`batch_apply({ batchId, updatedBy, ops: Array<{tool: string, args: object}>, haltOnError?: boolean })`**
- Wraps `setBatchId(batchId)` + sequential ops + `setBatchId(null)` in finally
- Dispatch table maps tool name → handler
- Per-op results; optional halt on error (default true)
- Silences Slack via set_batch_mode semantics; salts idempotency keys via unique batch_id

### Expanded tools (from CC #2 — Task 5 Commits 11 + 12)

**`update_project_field`:** ADD `engagementType` (Zod enum, prod-verified values), `contractStart` (real ISO parse + roundtrip), `contractEnd` (same + `start < end` invariant), `parentProjectId` (validated ref: exists, retainer parent, same client_id, no cycle). REMOVE `target` (column dropped by PR 88).

**`update_project_status`:** harden `newStatus` from `z.string()` to Zod enum `["in-production", "awaiting-client", "not-started", "blocked", "on-hold", "completed", "canceled"]`.

**`add_project`:** ADD 8 optional params — `resources`, `waitingOn`, `engagementType`, `contractStart`, `contractEnd`, `startDate`, `endDate`, `parentProjectId`.

**`update_week_item`:** ADD `startDate`, `endDate`, `blockedBy` to field enum. Harden `status` to Zod enum `["scheduled", "in-progress", "blocked", "at-risk", "completed", "canceled"]` (nullable). Harden `category` to Zod enum `["delivery", "review", "kickoff", "deadline", "approval", "launch"]`.

**`create_week_item`:** ADD optional `startDate`, `endDate`, `blockedBy`.

---

## Part D — Schema state (for verification against prod)

Post-PR-88:
- `projects.parent_project_id`: EXISTS (added by PR 88 via raw SQL)
- `projects.target`: DROPPED
- `week_items.status` enum values: include `"scheduled"`
- All other columns unchanged

`src/lib/db/runway-schema.ts` in the repo reflects post-PR-88 state. `pnpm runway:generate` on CC #2's branch HEAD must produce EMPTY diff (CC #2's schema-drift gate).

If prod and `runway-schema.ts` differ for any reason discovered by data-integrity TP, that's a separate bug to resolve before either branch ships.

---

## Part E — Verification strategy

### Pre-apply (before Cluster 2 or Cluster 3 runs)

1. Re-pull prod snapshot; confirm 17 active Convergix retainer L1s (match canonical roster above).
2. Confirm wrapper does not already exist:
   ```sql
   SELECT id, name FROM projects
   WHERE client_slug='convergix' AND engagement_type='retainer'
     AND parent_project_id IS NULL AND name = 'Convergix Retainer';
   ```
   Expect empty.
3. Dry-run each op script under `/data-integrity` skill rails; print plan, no writes.
4. 2-pass fresh-context QA agents per `feedback_qa_agent_for_prod_writes`.
5. Apply with unique `updated_by` + `batch_id` markers.

### Post-apply (Cluster 2)

1. Wrapper exists with exact locked metadata (name = `"Convergix Retainer"`, startDate = `2026-02-01`, endDate = `2026-07-31`, sort_order = `0`, etc.).
2. `SELECT COUNT(*) FROM projects WHERE parent_project_id = '<wrapper_id>'` = 17.
3. `pnpm runway:check-orphans` exits 0 (defer if CC #2 hasn't merged yet; validator ships with CC #2).
4. By Account view renders wrapper as umbrella (CC #1 4A live by this point).
5. Week view does NOT show the wrapper (CC #1 Phase D filter live).
6. `get_retainer_team(<wrapper_id>)` (CC #1 4C) returns expected Convergix roster.
7. `detectWrapperCloseOut` (CC #1 4B) does NOT fire (contractEnd = 2026-07-31 is future).

### Post-apply (Cluster 3)

1. Retainer-renewal Task exists on wrapper, dated 2026-05-25.
2. Wrapper `startDate` / `endDate` unchanged — still `2026-02-01` / `2026-07-31` (recompute guard prevented collapse).
3. `detectRetainerRenewals` flag fires starting 2026-07-01 (30 days before `contract_end` 2026-07-31). Verify on 2026-07-01.

---

## Part F — Risks data-integrity TP should consider

1. **Client-slug-scoped queries on hierarchy.** Wrapper and children share `client_slug="convergix"`, so joins/aggregations need explicit 2-tier handling or double-counting risks appear. Known surfaces CC #1 updates: Week view filter (Phase D), By Account render (4A). Other surfaces (pipeline, TV board, resource-conflict) may need follow-up.

2. **Updates table audit granularity.** The `updates` table links audit rows by `project_id`. Parent/child relationship is not captured in audit rows today; future per-child undo would need hierarchy-aware queries.

3. **Batch_apply semantics during idempotency retry.** If a Cluster 2 batch with 18 ops fails mid-way (say 14 of 18 succeed), retry without changing `batch_id` would collide on idempotency for the 14 that already landed. Re-run with unique `batch_id` suffix (e.g. `-retry`) per `feedback_revert_idempotency_poisoning`.

4. **Cluster 3 recompute-guard dependency.** Cluster 3 is gated on CC #2 merge. Running Cluster 3 before the guard exists collapses the wrapper dates. Critical: verify Gate C live in prod before executing Cluster 3.

5. **Phase 3 per-row reasoning.** Kathy-team replies may not arrive for all 17 NULL-status L2s. Per-row judgment calls (data-integrity TP owns) must document reasoning in `docs/tmp/data-integrity-audit/phase-3-decisions.md` before applying.

6. **CC #1 4A/4B/4C surface area.** 4A touches the By Account render path (file identification during plan mode); 4C extends `src/lib/slack/bot-tools.ts` + `src/lib/runway/bot-context-sections.ts`. These are read-path but CC #1 must verify they don't accidentally surface data that Cluster 2 hasn't applied yet (e.g., `get_retainer_team` returning `{ error: "Not a retainer wrapper" }` for a wrapper-id that doesn't exist yet is expected, not a bug).

---

**End of inventory.** Data-integrity TP: please re-evaluate against fresh prod + `wrapper-state-audit.md` + pre-updated auto-memory. Flag any drift.
