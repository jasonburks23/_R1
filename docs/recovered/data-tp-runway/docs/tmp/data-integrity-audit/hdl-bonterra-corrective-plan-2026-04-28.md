# HDL + Bonterra Corrective — 2026-04-28

**Status:** Plan locked. Subagent to draft triplet from this exact spec — NO inference, NO "verify at re-pull" placeholders. Calendar verified via `date -j -f '%Y-%m-%d' DATE '+%A'`.

**Batch ID:** `hdl-bonterra-corrective-2026-04-28`

**Scope:** 3 Bonterra Tasks + 28 HDL Tasks (1 DELETE, 1 net-new CREATE, 26 UPDATES) + 1 HDL Project notes refresh.

**Drivers:**
1. **UI red-flag bug** — Bonterra Dev IR Revisions card displays at startDate (4/23) instead of endDate (4/29) → `date` should be the deadline anchor, not the work-start anchor.
2. **Convention shift codified:** `date = endDate` for ALL tasks. Milestones: `startDate = endDate = date`. Ranges: `date = endDate`, `startDate < endDate`. No nulls on endDate.
3. **HDL operator-review items** from yesterday's batch — values that were drafter inferences need correction.
4. **Slackbot-created tasks need backfill** (Bonterra Final Review + Deliver to Client missing dayOfWeek + endDate + notes).

## Calendar reference (verified 2026-04-28)

| Date | Day | Date | Day | Date | Day |
|---|---|---|---|---|---|
| 4/17 | Fri | 5/15 | Fri | 6/4 | Thu |
| 4/28 | Tue | 5/18 | Mon | 6/5 | Fri |
| 4/29 | Wed | 5/19 | Tue | 6/10 | Wed |
| 4/30 | Thu | 5/20 | Wed | 6/15 | Mon |
| 5/1 | Fri | 5/22 | Fri | 6/19 | Fri |
| 5/4 | Mon | 5/25 | Mon | 6/22 | Mon |
| 5/7 | Thu | 5/27 | Wed | 6/29 | Mon |
| 5/11 | Mon | 5/29 | Fri | 7/2 | Thu |
| 5/15 | Fri | 6/1 | Mon | 7/6 | Mon |
|  |  | 6/2 | Tue | 7/7 | Tue |

## Bonterra changes (3 Tasks, 8 audit rows)

### B1. Impact Report — Dev IR Revisions (id prefix `0dc160b4`)

Range 4/23–4/29. UI red-flag fix: move display anchor from start to end.

| Field | From | To |
|---|---|---|
| date | 2026-04-23 | **2026-04-29** |
| dayOfWeek | thursday | **wednesday** |

**Unchanged:** startDate=4/23, endDate=4/29, weekOf=2026-04-20, title, status=in-progress, category=delivery, notes, owner, resources.

**Audit rows: 2.**

### B2. Impact Report - Final Review (id prefix `e0292ec9`)

Slackbot-created milestone 4/29. Backfill missing fields.

| Field | From | To |
|---|---|---|
| dayOfWeek | null | **wednesday** |
| endDate | null | **2026-04-29** |
| notes | null | **"Final Review with Bonterra to walk Impact Report; final fixes captured before Deliver to Client (4/30)."** |

**Unchanged:** weekOf=2026-04-27, date=4/29, startDate=4/29, title, status=scheduled, category=review, owner=Jill, resources.

**Audit rows: 3.**

### B3. Impact Report - Deliver to Client (id prefix `f2c5f718`)

Slackbot-created milestone 4/30. Backfill missing fields.

| Field | From | To |
|---|---|---|
| dayOfWeek | null | **thursday** |
| endDate | null | **2026-04-30** |
| notes | null | **"Lane delivers final Impact Report to Bonterra. Bonterra-side WordPress launch follows by 5/11."** |

**Unchanged:** weekOf=2026-04-27, date=4/30, startDate=4/30, title, status=scheduled, category=delivery, owner=Jill, resources.

**Audit rows: 3.**

---

## HDL changes (28 Tasks + 1 Project notes)

### HDL Project: Website Build notes refresh — 1 audit row

Currently lists Civ R1 Refinements + Lane post-shoot 6/15-6/22 as one block. After split, update notes to reflect (a) Civ R1 Refinements (Leslie, dev work off HDL feedback) 6/15-6/22, (b) Lane Post-Shoot Editing (Lane) 6/2-6/19, (c) Open Page Decisions removed (pending Jill confirmation), (d) Schema/SEO/AIO Ken Clark stripped pending Jill SOW verification.

| Field | From → To |
|---|---|
| notes | (current 28-Task summary, ~600 chars) → updated text reflecting Civ R1 Refinements split, Lane Post-Shoot as separate Task, Schema/SEO/AIO Leslie pending Ken Clark verification, Open Page Decisions pending verification |

**Drafter: write final notes text in the triplet primary script with the changes above woven in. Operator review at DRY_RUN time.**

**Audit rows: 1.**

### Section A — Existing-Task UPDATES — 26 Tasks

Format: `Field — From → To`. Each row = 1 audit row. Current values pulled from prod 2026-04-28 (post-APPLY of `hdl-website-build-cleanup-2026-04-27`).

#### A1. Batch 1 Design (id prefix `8ac945d6`) — range 4/17-4/28 — convention shift

Currently date=4/17 (Fri). Move to endDate (4/28 Tue).

- date 2026-04-17 → 2026-04-28
- dayOfWeek friday → tuesday

**Audit rows: 2.**

#### A2. HDL R1 Review (B1) (id prefix `2c0f97a7`) — milestone 4/29 — convention shift

Currently endDate=null. Set to date.

- endDate null → 2026-04-29

**Audit rows: 1.**

#### A3. HDL Feedback (B1) (id prefix `072bfb49`) — milestone 5/1 — convention shift

- endDate null → 2026-05-01

**Audit rows: 1.**

#### A4. Batch 1 Dev (id prefix `6e9ad9f6`) — range 5/4-5/15 — convention shift

- date 2026-05-04 → 2026-05-15
- dayOfWeek monday → friday

**Audit rows: 2.**

#### A5. Schema/SEO/AIO (id prefix `bc34aac7`) — milestone 5/4 — value fix + convention shift

Strip Ken Clark (drafter inferred, unverified — Jill confirms scope per SOW). Set Leslie back. Notes flag the SOW reference + open question.

- resources "Vendor: Ken Clark" → **"Dev: Leslie"**
- notes (current Ken Clark text) → **"Schema / SEO / AIO build referenced in original SOW (Feb 2026). Pending Jill confirmation: is this work already complete, or is more remaining? Resource set to Leslie pending verification."**
- endDate null → 2026-05-04

**Audit rows: 3.**

#### A6. Open Page Decisions (id prefix `7ebfba02`) — DELETE

Drafter invented. Not in prior prod, not on schedule sheet, not in Jill's tracked notes. Delete pending Jill confirmation it's real work.

- DELETE via `deleteWeekItem`

**Audit rows: 1.**

#### A7. HDL R2 + Copy Lock (B1) (id prefix `de87383e`) — milestone 5/7 — convention shift

- endDate null → 2026-05-07

**Audit rows: 1.**

#### A8. Batch 2 Design (id prefix `643f6221`) — range 5/7-5/15 — convention shift

- date 2026-05-07 → 2026-05-15
- dayOfWeek thursday → friday

**Audit rows: 2.**

#### A9. Ad Words (id prefix `b3eb2aea`) — milestone 5/11 — convention shift

- endDate null → 2026-05-11

**Audit rows: 1.**

#### A10. Smokeball Integration (id prefix `b630f22e`) — milestone 5/18 — convention shift + notes refresh

Notes flag the Tab 2 Row 43 contradiction for Jill.

- endDate null → 2026-05-18
- notes (current Smokeball text) → **"Smokeball integration — currently understood as lead capture + form fields on contact page. Schedule sheet Tab 2 Row 43 contradicts: 'redirect to 6.0 (contact page)'. Pending Jill clarification on actual scope."**

**Audit rows: 2.**

#### A11. Content Capture Options (id prefix `8efef949`) — milestone 5/18 — convention shift

- endDate null → 2026-05-18

**Audit rows: 1.**

#### A12. Calculators (5.3 + 5.4) (id prefix `8a41acc3`) — value fix + range conversion

Convert from milestone 5/18 to range 5/7-5/19 (Chris writes during Batch 2 Design, wraps before HDL R1 Review B2 on 5/20). Strip "(client)" — Chris is Civ contractor.

- resources "CW: Chris (client)" → **"CW: Chris"**
- weekOf 2026-05-18 → **2026-05-18** (unchanged — date 5/19 is in week of Mon 5/18)
- startDate 2026-05-18 → **2026-05-07**
- date 2026-05-18 → **2026-05-19**
- endDate null → **2026-05-19**
- dayOfWeek monday → **tuesday**

**Audit rows: 5.**

#### A13. HDL R1 Review (B2) (id prefix `f4eaecb1`) — milestone 5/20 — convention shift

- endDate null → 2026-05-20

**Audit rows: 1.**

#### A14. HDL Vendor Pick (id prefix `312dbcbf`) — milestone 5/20 — convention shift

- endDate null → 2026-05-20

**Audit rows: 1.**

#### A15. HDL Feedback (B2) (id prefix `d7c0d105`) — milestone 5/22 — convention shift

- endDate null → 2026-05-22

**Audit rows: 1.**

#### A16. Batch 2 Dev (id prefix `2b42dc24`) — range 5/25-6/4 — value fix + convention shift

Was milestone 5/25; operator pinned endDate=6/4 (Site Staging day).

- endDate null → **2026-06-04**
- date 2026-05-25 → **2026-06-04**
- dayOfWeek monday → **thursday**
- notes (current "End date TBD pending schedule confirmation — OPERATOR REVIEW") → **"Batch 2 dev 5/25–6/4 per operator confirmation 2026-04-28 (wraps day Site Staging, day before Client R1 Site Review 6/5)."**

**Audit rows: 4.**

#### A17. Legal Articles (5.5–5.7) (id prefix `e51cd07c`) — value fix + milestone shift

Operator: client deliverable due to us by 5/29 (B2 Copy Lock). Strip "(client)" — Chris is Civ contractor (regardless of who delivers, the resource label drops the parenthetical).

- resources "CW: Chris (client)" → **"CW: Chris"**
- weekOf 2026-05-25 → **2026-05-25** (unchanged — 5/29 is in week of Mon 5/25)
- startDate 2026-05-25 → **2026-05-29**
- date 2026-05-25 → **2026-05-29**
- endDate null → **2026-05-29**
- dayOfWeek monday → **friday**
- notes "HDL pages 5.5–5.7 article copy." → **"HDL pages 5.5–5.7 article copy. Pending Jill confirmation: client delivers to us by 5/29 (Copy Lock B2) OR Chris (Civ) delivers during Batch 2 Design window (5/7–5/19). Date set to 5/29 deliver-to-us deadline pending clarification."**

**Audit rows: 6.**

#### A18. Photo Shoot Prep (id prefix `b6019f8d`) — milestone 5/27 — convention shift

- endDate null → 2026-05-27

**Audit rows: 1.**

#### A19. HDL R2 + Copy Lock (B2) (id prefix `fc824f8a`) — milestone 5/29 — convention shift

- endDate null → 2026-05-29

**Audit rows: 1.**

#### A20. Production Shoot (id prefix `5f1e1687`) — milestone 6/1 — convention shift

- endDate null → 2026-06-01

**Audit rows: 1.**

#### A21. Site Staging (id prefix `56e46f3a`) — milestone 6/4 — convention shift

- endDate null → 2026-06-04

**Audit rows: 1.**

#### A22. HDL R1 Site Review (id prefix `5fcc124a`) — milestone 6/5 — convention shift

- endDate null → 2026-06-05

**Audit rows: 1.**

#### A23. HDL R1 Feedback Due (id prefix `cd5fa105`) — milestone 6/10 — convention shift

- endDate null → 2026-06-10

**Audit rows: 1.**

#### A24. Civ R1 Refinements (id prefix `6134b42f`) — value fix + convention shift

Currently scoped as "Civ R1 refinements + Lane post-shoot edits + selection 6/15–6/22" with `CD: Lane`. Operator: split. Civ R1 Refinements = Leslie (Dev) doing dev work off HDL feedback. Lane post-shoot becomes separate Task (A28 below, NEW).

- resources "CD: Lane" → **"Dev: Leslie"**
- date 2026-06-15 → **2026-06-22**
- dayOfWeek monday → **monday** (no change — 6/15 and 6/22 both Monday; included for explicitness in plan, **not written** since no-op)
- notes (current text) → **"Civ R1 dev refinements off HDL R1 Feedback (6/10). Leslie addresses dev fixes 6/15–6/22 (1 week refinement window before CIV add final content 6/23). Single feedback cycle accepted (Dave out 6/11–6/18 — no Civ R2)."**

dayOfWeek not written (already monday). **Audit rows: 3** (resources, date, notes).

#### A25. CIV add final content (id prefix `6c0d011c`) — range 6/23-6/29 — convention shift

- date 2026-06-23 → 2026-06-29
- dayOfWeek tuesday → monday

**Audit rows: 2.**

#### A26. CIV QA + Webflow transfer (id prefix `70d39a98`) — range 6/30-7/2 — convention shift

- date 2026-06-30 → 2026-07-02
- dayOfWeek tuesday → thursday

**Audit rows: 2.**

#### A27. HDL Confirm to Launch (id prefix `c396b045`) — value fix (drafter fabricated 7/2; schedule sheet says 7/6) + convention shift to single-day milestone

- date 2026-07-02 → **2026-07-06**
- startDate 2026-07-02 → **2026-07-06**
- endDate null → **2026-07-06**
- dayOfWeek thursday → **monday**
- notes (current text with "OPERATOR REVIEW") → **"HDL gives go for 7/7 launch (per schedule sheet Row 22). Single-day milestone."**

**Audit rows: 5.**

#### A28. LAUNCH (id prefix `51872fd1`) — milestone 7/7 — convention shift

- endDate null → 2026-07-07

**Audit rows: 1.**

### Section B — Net-new CREATE (1 Task)

#### B1. Lane Post-Shoot Editing (NEW)

Range 6/2–6/19. Lane edits photos + selects from 6/1 shoot, presents to Dave on his return 6/19 (Dave out 6/11–6/18).

- title: "Lane Post-Shoot Editing"
- weekOf: 2026-06-01 (Monday of week containing 6/2)
- date: **2026-06-19** (per `date=endDate` convention)
- startDate: 2026-06-02
- endDate: 2026-06-19
- dayOfWeek: friday
- status: scheduled
- category: delivery
- owner: Jill
- resources: CD: Lane
- notes: "Lane edits + selects photos from Production Shoot (w/o 6/1). Presents selections to Dave on his return 6/19 (Dave out 6/11–6/18). Scope split from Civ R1 Refinements per operator 2026-04-28."

**Audit rows: 1** (per `createWeekItem` helper convention — 1 row per call, regardless of field count).

---

## Audit row total

| Cluster | Tasks | Rows |
|---|---|---|
| Bonterra (B1+B2+B3) | 3 | 8 |
| HDL Project notes | 1 | 1 |
| HDL UPDATES (A1-A28 minus A6 DELETE) | 27 | 51 |
| HDL DELETE (A6) | 1 | 1 |
| HDL CREATE (Lane Post-Shoot) | 1 | 1 |
| **Total** | **33** | **62** |

`EXPECTED_AUDIT_COUNT = 62`

---

## Critical rails

### Recompute interactions

Every weekItem date/startDate/endDate write fires `recomputeProjectDatesWith` on parent project. Engagement type for HDL Website Build = `project` (not retainer); recompute will derive parent's `startDate` (MIN of children's startDate ?? date) and `endDate` (MAX of children's endDate). 

**After this batch:**
- HDL Website Build startDate: MIN of all children's startDate. Earliest = 4/17 (Batch 1 Design). **No change** (still 4/17).
- HDL Website Build endDate: MAX of all children's endDate. After all milestones get endDate set + LAUNCH endDate=7/7 → **stays 7/7**.

For Bonterra Impact Report: same logic. After Final Review + Deliver to Client get endDate set, MAX child endDate = 5/11 (Go Live). **Stays 5/11.**

### Reverse cascade (category=deadline + field=date)

Audit which tasks in this plan have `category=deadline`:
- HDL: Site Staging starts at category=kickoff (post-APPLY); Production Shoot=delivery; LAUNCH=launch. **No deadline-category Tasks in HDL after yesterday's batch.** Reverse cascade does not fire.
- Bonterra: Dev IR Revisions=delivery (post-APPLY yesterday); Final Review=review; Deliver to Client=delivery; Go Live=launch. **No deadline-category Tasks in Bonterra.**

**No reverse-cascade ordering required.**

### Multi-field lookup-key drift (weekOf+title)

Tasks where `weekOf` changes:
- A12 Calculators: weekOf stays 5/18 (5/19 is Tue of Mon-5/18 week). **No drift.**
- A17 Legal Articles: weekOf stays 5/25 (5/29 is Fri of Mon-5/25 week). **No drift.**

Tasks where `title` changes:
- None (no renames in this batch).

**No running-tracker required.**

### Per-row optimistic concurrency

Capture `updated_at` for every target row at pre-check. Include in raw UPDATE WHERE for any non-helper writes. **No raw UPDATE expected** — all field changes in WEEK_ITEM_FIELDS / PROJECT_FIELDS whitelists.

### Field whitelist confirmation

All fields written: `date`, `startDate`, `endDate`, `dayOfWeek`, `weekOf`, `title`, `status`, `category`, `notes`, `resources`, `owner`. All in WEEK_ITEM_FIELDS / PROJECT_FIELDS per `operations-utils.ts`.

### REVERT idempotency

REVERT script UPDATED_BY = `REVERT-hdl-bonterra-corrective-2026-04-28`. Distinct from primary's `hdl-bonterra-corrective-2026-04-28`. SHA-derived idempotency keys differ. REVERT field-counts match APPLY 1:1 (62 writes ↔ 62 reverts, ±2 wiggle for helper-level no-op collapsing).

---

## Pre-checks (drafter must implement)

For each of the 31 target rows: assert id prefix + (title, weekOf) coords + every "From" value listed above. Capture `updated_at`. Fail loudly on drift.

**Idempotency pre-checks:**
- Lane Post-Shoot Editing: assert no existing (title="Lane Post-Shoot Editing", weekOf=2026-06-01, projectId=Website Build) row before create.
- Open Page Decisions: assert exact (title, weekOf, projectId) match before delete.

---

## Helpers used

- `updateWeekItemField` for all field changes on existing tasks (52 rows estimated)
- `updateProjectField` for HDL Website Build notes refresh (1 row)
- `createWeekItem` for Lane Post-Shoot Editing (1 row)
- `deleteWeekItem` for Open Page Decisions (1 row)

**No raw UPDATE / no manual audit insert.** All routes through helpers.

---

## Post-write assertions

Each Bonterra task: verify final state of every field changed.
Each HDL task: verify final state of every field changed.
Aggregate: exactly 62 audit rows under `batch_id=hdl-bonterra-corrective-2026-04-28`.
HDL Website Build: assert recomputed startDate=2026-04-17, endDate=2026-07-07.
Bonterra Impact Report: assert recomputed startDate=2026-04-15 (current), endDate=2026-05-11.
Lane Post-Shoot Editing: verify created with all 11 fields correct.
Open Page Decisions: verify deleted (no row found).

---

## Subagent task

Drafter: read this plan + `scripts/runway-migrations/hdl-website-build-cleanup-2026-04-27.ts` (pattern to mirror) + `scripts/runway-migrations/ag1-soundly-bonterra-cleanup-2026-04-27.ts` (multi-client pattern). Draft triplet:

- `scripts/runway-migrations/hdl-bonterra-corrective-2026-04-28.ts` (primary)
- `scripts/runway-migrations/hdl-bonterra-corrective-2026-04-28-verify.ts` (read-only post-verify)
- `scripts/runway-migrations/hdl-bonterra-corrective-2026-04-28-REVERT.ts`

Run DRY_RUN. Report green or red.

**Drafter constraint:** ZERO inferences. ZERO "verify at re-pull" placeholders. Every value above is locked. Use these values verbatim. Calendar is verified — do not "double-check" by re-deriving dayOfWeek; trust the calendar table at top of this plan.
