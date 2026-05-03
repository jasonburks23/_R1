# Wrapper-state audit — fact check against locked metadata

**Date:** 2026-04-23 ~15:19 UTC
**Fresh prod snapshot:** `/Users/jasonburks/Documents/_AI_/_R1/.worktrees/pr88-v4-hardening/data/runway-snapshot.json` (pulled 2026-04-23T15:19:06.503Z)
**Baseline for comparison:** 2026-04-22 ~22:45 UTC (post-Convergix-Kathy-cleanup + post-timestamp-correction)

## Terminology note

The wrapper sits **above L1** in the operator's hierarchy, not at L1 level. It's a retainer-period container with L1 Projects nested under it. In the DB schema there's only the `projects` table, so the wrapper is a row there — but conceptually:

- **Wrapper** (retainer-period container) → `projects` row with `engagementType='retainer'`, its own `parent_project_id=NULL`, with L1 children pointing at it via their `parent_project_id`.
- **L1 Project** (deliverable) → `projects` row with `parent_project_id=<wrapper.id>`.
- **L2 Task** (work item) → `week_items` row with `project_id=<L1.id>`.

Earlier passes of this doc said "wrapper" — that was wrong. Wrapper is its own layer above L1.

## Facts (no inference)

### Wrapper hierarchy state

**Zero rows in the entire `projects` table have `parent_project_id` set.** Column exists (PR 88 shipped the schema), but no data uses it yet. No wrapper row has been created. No nesting has happened.

**No project in prod is named "Convergix Retainer" or similar wrapper pattern.** The only rows whose name/content contains "wrapper" or "retainer" at the character level:
- `CDS Vertical Campaign` (mentions "Retainer Period Close" in old notes — stale reference to the now-deleted anchor Task).
- Week items `CDS Creative Wrapper` and `CDS Case Study (2 pages)` — CDS-specific, unrelated to the retainer wrapper concept.

### Retainer-metadata state

- **22 projects have `engagementType='retainer'`** (not 18 as data-shape.md's post-baseline count suggested — baseline was slightly off).
- **22 of 22 retainers have both `contractStart` AND `contractEnd` populated.** The retainer-v4-cleanup-2026-04-21 batch set these.
- **0 of 22 retainers have `parent_project_id` set.**

Breakdown:
| Client | Count | Notes |
|---|---|---|
| Convergix | 20 | 17 active + 3 historical completions |
| Hopdoddy | 1 | Digital Retainer (195 hrs), 2026-01-01 → 2026-12-31, wrapper-shaped but no children |
| Dave Asprey | 1 | Social Retainer — Wind Down, 2025-11-14 → 2026-04-30 (≤8 days from today) |

### Convergix L1 roster (canonical, verified against prod)

Client: `convergix` (slug) / `Convergix` (name) / clientId `181fea93bc4d435db0a1a8283`.

All 20 have `engagementType='retainer'`, `contractStart=2026-02-01`, `contractEnd=2026-07-31`, `parentProjectId=null`.

**Active (17) — to nest under the wrapper:**
1. `0c208308ff...` New Capacity (PPT, brochure, one-pager) — awaiting-client
2. `3d5215f4a3...` Fanuc Award Article + LI Post — not-started
3. `135c5a61d5...` Events Page Updates (5 tradeshows) — in-production
4. `394f9e5e5b...` Rockwell PartnerNetwork Article — in-production
5. `c093535940...` Texas Instruments Article — in-production
6. `f391dff5ce...` Social Content — April 2026 — in-production
7. `51f39e5cdf...` Brand Guide v2 — in-production
8. `68a4ee3791...` Certifications Page — awaiting-client
9. `0e4214c607...` CDS Vertical Campaign — in-production
10. `65b2cac113...` Corporate Collateral Updates — in-production
11. `0157c4232d...` Big Win Template — in-production
12. `1923fc1a36...` Rockwell Automation Co-Marketing Efforts — awaiting-client
13. `272e7eef7f...` AUTOMATE 2026 Booth Design — in-production
14. `b452f64704...` Social Content — May 2026 — in-production
15. `ede98a2931...` Social Content — June 2026 — not-started
16. `9396b7a0c2...` Social Content — July 2026 — not-started
17. `95ba6a2f17...` Industrial/Battery Assembly Campaign — not-started

**Historical completions (3) — EXCLUDE from nesting (operator directive "we are not doing legacy projects from the past"):**
- `4b5bf2f080...` Life Sciences Brochure — completed
- `c568d7a62c...` Social Media Templates — completed
- `7c8478dcc5...` Organic Social Playbook — completed

### Drift since 2026-04-22 22:45 UTC baseline

- **Zero projects modified** (updatedAt > 2026-04-22T22:45).
- **Zero week_items created** since that time.
- **Zero week_items modified** since that time.
- **Zero new audit rows** in `updates` since `convergix-kathy-cleanup-followup-2026-04-22` last wrote at `2026-04-22T22:08:19Z`.
- **Total updates table: 758 rows.** Matches post-timestamp-correction baseline exactly.
- **Row count reconciliation:** current week_items = 75, baseline said 74 — baseline was slightly off, this is NOT drift. Verified by the zero-creates + zero-modifies queries above.

**Conclusion on drift:** prod has not changed since my last baseline. Operator's "some wrapper-related updates may have happened" was likely referring to the retainer-v4-cleanup-2026-04-21 batch that set contractStart/contractEnd on 22 retainers — that was already captured in my baseline. No new wrapper writes since.

### NULL-status week_items (Phase 3 scope)

**Current total: 17** distributed:
- LPPC 10
- Bonterra 3
- Dave Asprey 2
- Soundly 1
- Hopdoddy 1

**Convergix: 0** ✓ (all 7 resolved during Kathy cleanup).

---

## Cross-walk against locked wrapper metadata

Locked metadata (from `project_convergix_cleanup_applied.md` + `pending-decisions.md`):

| Field | Locked value | Current prod state | Write needed? |
|---|---|---|---|
| Wrapper exists? | Yes, 1 row | No wrapper | **YES — create** |
| `name` | "Convergix Retainer" | n/a | YES (on create) |
| `clientId` | convergix (`181fea93bc4d435db0a1a8283`) | n/a | YES (on create) |
| `engagementType` | "retainer" | n/a | YES (on create) |
| `status` | "in-production" | n/a | YES (on create) |
| `category` | "active" | n/a | YES (on create) |
| `owner` | "Kathy" | n/a | YES (on create) |
| `resources` | NULL | n/a | YES (on create, NULL explicit) |
| `contractStart` | 2026-02-01 | n/a | YES (on create) |
| `contractEnd` | 2026-07-31 | n/a | YES (on create) |
| `startDate` / `endDate` | LOCKED 2026-04-23: explicit "2026-02-01" / "2026-07-31" at creation; recompute guard preserves | n/a | YES (on create) |
| `sort_order` | LOCKED 2026-04-23: 0 (renders atop Convergix section) | n/a | YES (on create) |
| `parentProjectId` on 17 active L1s | wrapper.id | all NULL | **YES — 17 writes** |
| `parentProjectId` on 3 historical L1s | NULL (leave as-is) | NULL | No-op ✓ |
| Retainer-renewal Task on wrapper | Yes (2026-05-25, Kathy, "2H retainer conversation with Daniel") | Does not exist | **YES — 1 week_item create** |

### LOCKED 2026-04-23: wrapper `startDate` / `endDate` + `sort_order`

Operator-confirmed during 2026-04-23 CC plan-review session:
- `startDate = "2026-02-01"`, `endDate = "2026-07-31"` set explicitly at creation. Recompute guard (CC #2) preserves them once children nest.
- `sort_order = 0` so wrapper renders atop the Convergix section on By Account view.

**Why explicit dates (not "let recompute populate"):** CC #2's Task 2 recompute guard freezes wrapper dates whenever the wrapper has ≥1 child with `parent_project_id` set. Auto-populate path is closed by the guard. Without explicit values at creation, dates would stay NULL forever. With explicit values, wrapper renders with visible timeline (Kathy can see "we're in month X of 6" at a glance).

Memory updated in `project_convergix_cleanup_applied.md` (auto-memory).

---

## Categorization — which writes can happen when

Three gates matter:
- **Gate A:** CC #1's `filterWrapperDayItems` live in prod → wrapper doesn't ghost on Week view.
- **Gate B:** CC #1's By Account render changes live → wrapper renders as umbrella (UX, not data integrity).
- **Gate C:** CC #2's recompute guard live → wrapper dates protected from overwrite by L2 writes.

Each pending write categorizes as:

### Cluster 1 — Safe NOW through me, before any CC merges

**None.** Every wrapper-related write produces a visual anomaly in Week view (ghost wrapper) until Gate A (CC #1 filter) lands. Plus, by project-memory `feedback_worktree_file_paths.md` and operator's stated preference, we prefer not to ship data changes that introduce UI regressions even temporarily. Hold.

### Cluster 2 — Safe AFTER CC #1 merges (Gates A + B live)

**Do all of:**

1. **Create wrapper** with all locked metadata AND explicit `startDate=2026-02-01`, `endDate=2026-07-31`.
   - **Why:** gives Kathy/team the umbrella-card UX and retainer-window timeline on By Account view.
   - **No recompute risk:** wrapper has 0 children and 0 L2s at this moment. No recompute call fires on project creation. Safe without Gate C.

2. **Set `parent_project_id` on the 17 active Convergix L1s** pointing at the new wrapper.
   - **Why:** nests active deliverables under the wrapper so By Account renders the umbrella with its 17 contents. Week view filter (Gate A) keeps the wrapper out of the week-by-week timeline; hierarchy is preserved for bot queries.
   - **No recompute risk on wrapper:** setting `parent_project_id` on a child L1 triggers `recomputeProjectDatesWith(child.id)`, NOT `recomputeProjectDatesWith(wrapper.id)`. Wrapper dates never touched. Safe without Gate C.
   - **Recompute on each child fires:** child's own recompute runs (from its own L2s). Those dates are already in prod and stable — recompute is idempotent for a child that hasn't changed. Safe.

3. **Verify post-write:** wrapper exists, 17 children, 0 orphan parent_project_ids (`pnpm runway:check-orphans` after CC #2 lands that validator — defer verify to Cluster 3 if not available yet).

**Cluster 2 audit batch:** `convergix-wrapper-create-2026-XX-XX` with unique `updated_by="convergix-wrapper-2026-XX-XX"`. ~18 audit rows (1 new-project + 17 parent-id writes).

### Cluster 3 — Safe AFTER CC #2 merges (Gate C also live)

**Then do:**

4. **Add retainer-renewal Task (week_item) on wrapper.**
   - Title: "2H retainer conversation with Daniel" (or similar; wordsmith with operator).
   - `projectId = wrapper.id`
   - `clientId = convergix`
   - `startDate = 2026-05-25`, `endDate = 2026-05-25`
   - `weekOf = 2026-05-25` (Monday of that week, same date)
   - `dayOfWeek = "monday"`
   - `status = "scheduled"`
   - `owner = "Kathy"`
   - `resources = "Kathy"`
   - `category = "kickoff"` (or `deadline` — operator call)
   - `notes = "Initiate 2H 2026 retainer conversation with Daniel. Locked metadata directive."`
   - **Why:** anchors the retainer-renewal flag detection. Drives Kathy's Monday prompt. Sits on the wrapper so it's retainer-level (contract relationship), not deliverable-level.
   - **Why now depends on Gate C:** adding this L2 triggers `recomputeProjectDatesWith(wrapper.id)`. Without the guard, recompute would set wrapper dates = MIN/MAX of `[2026-05-25, 2026-05-25]` — collapsing the contract window to a single day. With the guard: wrapper has ≥1 child (nested from Cluster 2) → recompute returns frozen existing dates → wrapper keeps `2026-02-01 → 2026-07-31`.
   - **This is not urgent.** 2026-05-25 is 32 days out. Can wait for CC #2 without business impact.

**Cluster 3 audit batch:** `convergix-wrapper-renewal-task-2026-XX-XX` with unique `updated_by`. ~1 audit row.

### Cluster 4 — Phase 3 writes (separate, operator-blocked)

Unrelated to wrapper but relevant to the broader data-integrity docket:
- **17 non-Convergix NULL-status L2s** (LPPC 10, Bonterra 3, Dave Asprey 2, Soundly 1, Hopdoddy 1) awaiting Kathy/team replies. Per-row reasoning, not blanket backfill. I own per-row. Runs whenever replies land.

---

## Ordering recommendation

1. **CC #1 ships** → Gates A + B live.
2. **Cluster 2 writes through me** (wrapper + 17 nestings) → Convergix retainer umbrella visible in prod.
3. **CC #2 ships** → Gate C live.
4. **Cluster 3 write through me** (retainer-renewal Task on wrapper).
5. Phase 3 per-row NULL-status backfill when Kathy replies land (Cluster 4).

Alternative: hold both Cluster 2 and 3 until BOTH CC #1 and CC #2 merge, apply as one batch. Slightly fewer moving parts, slightly longer time before the UX lands.

**My preference:** Cluster 2 after CC #1, Cluster 3 after CC #2. Ship incremental value sooner; Cluster 2 is safe without Gate C per the recompute analysis above.

---

## Why behind each pending update (for TP cross-walk against their doc)

When TP's "data updates we think are needed" doc lands, cross-walk each item against this table:

| Write | Business reason | Gate required |
|---|---|---|
| Create wrapper | Visible retainer umbrella on By Account view; contract-window timeline | A + B |
| Nest 17 active L1s | Umbrella has contents; excludes historicals per operator | A |
| Wrapper startDate/endDate = contract window | Timeline rendering; avoids null-date degradation; renewal math anchor | none (freeze happens on create) |
| Retainer-renewal Task on wrapper | Drives auto renewal-due flag at 30 days; Kathy's Monday 2026-05-25 prompt | C |
| Contract dates on 22 retainer L1s | **ALREADY DONE** 2026-04-21 (retainer-v4-cleanup batch) — strike from TP's list if present | n/a |
| 3 historical Convergix L1s nested | **NO — operator excludes them.** Strike from TP's list if present | n/a |
| Per-row NULL-status flips on 17 non-Convergix L2s | Phase 3 Kathy-team replies needed first; per-row reasoning mine | none (Phase 3) |

---

## What I'm ready for

1. **TP's multi-file data-updates doc** — I'll cross-walk every item against:
   - The "already applied" list in `worktree-diff-vs-upstream.md` + this audit.
   - The locked wrapper metadata (per Cluster 2 + Cluster 3 above).
   - The "why" column above to evaluate if TP's justification matches the business reason.
   - Anything TP wants to happen "as part of CC #1 or CC #2" that is a data write → redirect to me.

2. **Any follow-up questions from operator** on:
   - Wrapper startDate/endDate decision (I've revised; operator should sign off).
   - Cluster 2 running between CC #1 merge and CC #2 merge (vs waiting until both merge).
   - Task title/notes wording for the retainer-renewal L2.

3. **Authoring the Convergix wrapper migration script** in `docs/tmp/data-integrity-audit/` when operator green-lights.

Nothing here requires writing to prod until the gates are hit. I'm in evaluation mode until TP's doc lands.
