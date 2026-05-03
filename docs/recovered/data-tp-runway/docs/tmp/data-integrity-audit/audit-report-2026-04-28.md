# Data Integrity Audit — 2026-04-28 (post-trust-loss)

**Audit method:** 6 fresh-context holdout panels reading prod independently of any spec or migration script. Plus AG1 root-cause deep dive (the only panel allowed to read its spec, for diff purposes).

**Today:** 2026-04-28. **Live prod baseline:** 51 projects, 101 weekItems, 13 clients, 995 audit rows, activeBatchId=null, lastUpdate=2026-04-28T05:13:28Z.

---

## TL;DR

**Overall verdict: FAIL across 5 of 6 panels.** Cascade integrity is the only panel that returned WARN (no corrupted reverse-cascades from yesterday's writes). Every other panel returned FAIL with concrete, sourced findings.

**Headline numbers:**
- **94% of weekItems (95/101) violate the `date=endDate` convention** the operator codified today. 65 have `endDate=null` (set date but never endDate); 29 have date != endDate (set both but anchored date to startDate); 1 milestone-invariant violation.
- **Yesterday's 4 batches were narrowly scoped**, each addressing specific operator-asked items. None did a prod-wide completeness or convention sweep. **Beyond Petrochemicals (9 projects, 5 in-production with null owner/dates) was not in scope of any batch.**
- **AG1 RCA confirms TP planning miss**: every write executed exactly as the spec wrote it. The spec was wrong. AG1 Social Content Trial wrapper deferred contractStart/contractEnd waiting for "formal SOW" while never addressing startDate/endDate at all → result: retainer with all 4 date fields null. The spec's drafter, helper, and QA all cleared.
- **5 HDL weekItems are in prod with literal `OPERATOR: verify before APPLY` text in their notes** (Schema/SEO/AIO, Ad Words, Smokeball, Batch 2 Dev, Confirm to Launch). The drafter self-flagged unverified, then APPLY shipped anyway.
- **Multiple drafter fabrications** confirmed via audit-log evidence: HDL Confirm to Launch 7/2 (operator wants 7/6), `CW: Chris (client)` (Chris is Civ contractor, not client), Civ R1 Refinements `CD: Lane` (operator wants Leslie + separate Lane Post-Shoot task), Site Staging 6/4 (Jill's Slack said 6/8 with "decision pending").
- **One critical correction to prior session's plan**: HDL Open Page Decisions (id `7ebfba02...`) is **operator-sourced**, not fabricated. Jill's 2026-04-27 Slack message asked HDL to decide on 3.6/8.1/8.2/8.3 before B2 KO 5/7. The corrective triplet on disk currently DELETEs this row — that DELETE is wrong.

---

## Findings by category

### Category 1 — Convention violation (FAIL, prod-wide)

The `date=endDate` convention codified 2026-04-28 has not been retroactively applied. 95 of 101 weekItems violate.

| Sub-pattern | Count | Examples |
|---|---|---|
| `endDate=null` on weekItems with date set | 65 | HDL R1 Review, HDL Feedback, all milestones across 4 batches |
| `date != endDate` (date pinned to startDate on ranges) | 29 | HDL Batch 1 Design (date=4/17, endDate=4/28); LPPC Map Dev Revisions (date=4/22, endDate=4/24); Bonterra Dev IR Revisions (date=4/23, endDate=4/29); 16 Convergix items |
| Milestone invariant violation (startDate==endDate but date !=) | 1 | Convergix Events Page — Staging (id `e8968554`): startDate=endDate=4/30 but date=4/24 |

**UI impact:** runway renders weekItems by `date`. Range tasks pinned to startDate flip red as soon as today passes the start. 29+1 weekItems are already misrepresented. The 65 null-endDate rows can't render their range bars at all.

### Category 2 — Day-of-week mismatches (FAIL, real)

After case-normalization (stored lowercase, `date` returns Title-case), 4 real mismatches remain. All Convergix:

| Item | id prefix | date | actual weekday | stored dayOfWeek |
|---|---|---|---|---|
| AISTech 2026 | `9e432ae4` | 2026-04-24 | Friday | monday |
| Events Page — Staging | `e8968554` | 2026-04-24 | Friday | thursday |
| May Content Calendar Draft to Client | `66414d4d` | 2026-04-28 | Tuesday | monday |
| New Capacity PPT — Complete | `063b7c31` | 2026-05-04 | Monday | friday |

**UI impact:** TV view groups by dayOfWeek; these show in the wrong column.

### Category 3 — Project-level completeness gaps (FAIL)

| Cluster | Count | Specifics |
|---|---|---|
| Retainer wrappers naked on dates | 3 | AG1 Social Content Trial (all 4 null), Hopdoddy Digital Retainer (startDate/endDate null despite contractStart/End set), Dave Asprey Wind Down (startDate=2026-04-20 ≠ contractStart=2025-11-14) |
| In-production projects with null notes/owner/dates | 6 | Bonterra Impact Report (notes null); Beyond Petro: Organic Social + Playbook, Fact Sheets, beyondpetrochemicals.org maintenance, spilltracker.org maintenance, Plastic Additives LinkedIn Post (5 projects all null owner+dates) |
| Status/category mismatches | 11 | 7 "completed-but-active" (Beyond Petro Plastic Additives, Convergix Events Page Updates / Rockwell PartnerNetwork / Brand Guide v2 / Big Win Template / Social May, Soundly iFrame, Wilsonart Chester); 1 EDF on-hold-active; 1 LPPC Website Blog Posts not-started-on-hold; 1 Convergix Corp Collateral in-production-awaiting-client; 1 LPPC dueDate empty-string |
| Project endDate buffer drift | 7 | Project endDate later than MAX(child endDate): Bonterra Impact Report (proj 5/11, kids imply 4/29), Convergix New Capacity (5/11 vs 5/8), AUTOMATE Booth (6/22 vs 4/24 — under-scheduled), HDL Website Build (7/7 vs 7/2 — intentional buffer), LPPC Map (5/11 vs 4/24), LPPC Revamp (5/11 vs 4/24), TAP ERP Rebuild (10/26 vs 8/15) |
| Convergix orphan retainer-tagged L1s | 4 | Life Sciences Brochure, Social Media Templates, Organic Social Playbook, Big Win Template — engagementType=retainer + Convergix contract dates pinned but parentProjectId=NULL (not nested under wrapper). Structural drift. |

### Category 4 — Slackbot create-gap (FAIL)

Slackbot creates leave fields null. Yesterday's batches did not backfill these for 4 known cases:

| Item | Missing fields |
|---|---|
| Bonterra Final Review (id `e0292ec9`) | dayOfWeek, endDate, notes |
| Bonterra Deliver to Client (id `f2c5f718`) | dayOfWeek, endDate, notes |
| AG1 PRO Content (id `92708ffc`) | status (=not-started despite "concepting"), realistic startDate/endDate (Slackbot placeholder 4/30/4/30) |
| Hopdoddy Brand Refresh Website launch | status (null) |

### Category 5 — Drafter fabrications and unverified writes (FAIL)

Confirmed via audit-log evidence in batch `hdl-website-build-cleanup-2026-04-27`:

| Item | Issue | Operator-true value |
|---|---|---|
| HDL Confirm to Launch (id `c396b045`) | Date 7/2 fabricated; notes literally say "Drafter chose 7/2…OPERATOR REVIEW" | 7/6 (single-day milestone per schedule sheet) |
| HDL Calculators (id `8a41acc3`) | resources `CW: Chris (client)` | `CW: Chris` — Chris is `team_members.roleCategory=contractor` |
| HDL Legal Articles (id `e51cd07c`) | resources `CW: Chris (client)` | `CW: Chris` — same |
| HDL Civ R1 Refinements (id `6134b42f`) | resources `CD: Lane`, dates 6/15–6/22 sourced from drafter's own Project-notes rewrite (self-referencing) | Leslie (Dev) does refinements; Lane post-shoot is separate |
| HDL Site Staging (id `56e46f3a`) | Date 6/4 — drafter resolved operator's open question | Jill's 2026-04-27 Slack said 6/8 with "decision pending" — operator clarification needed |
| HDL Lane Post-Shoot Editing | Missing entirely (no row exists) | Should be range 6/2–6/19, owner Lane |
| HDL Schema/SEO/AIO (id `bc34aac7`) | resources `Vendor: Ken Clark` — name from operator but scope unconfirmed | `Dev: Leslie` pending Jill scope confirm |
| 5 weekItems with `OPERATOR: verify before APPLY` text in notes | Drafter self-flagged unverified; APPLY shipped anyway | Schema/SEO/AIO, Ad Words, Smokeball, Batch 2 Dev, Confirm to Launch |
| HDL Project notes | Contains drafter-authored content not in any operator message: B1/B2 batch windows, R1 Site Review 6/5, R1 Feedback 6/10, Civ R1 6/15–6/22, CIV final 6/23–6/29, LAUNCH 7/7, Dave-out windows | Needs reconciliation against verbatim operator messages |

### Category 6 — Open Page Decisions correction (PRIOR SESSION CALL WAS WRONG)

The prior session's brain doc and corrective plan call HDL Open Page Decisions (id `7ebfba02`) "fabricated" and the triplet's A6 step DELETEs it.

**Source attribution panel found Jill's 2026-04-27 Slack message authorizing this row** — HDL needs to decide on 3.6/8.1/8.2/8.3 before B2 design KO 5/7. Drafter set date=2026-05-04, dayOfWeek=monday, owner=Jill, resources=HDL — all reasonable.

**Action:** REMOVE the DELETE from the corrective plan. The row is operator-authorized. It does still need the convention shift (endDate=2026-05-04, single-day milestone).

### Category 7 — Cascade integrity (WARN, not FAIL)

Cascade behavior on yesterday's 4 batches is clean:
- Zero unintended reverse-cascade `cascade-duedate` writes from any batch
- 25 of 29 L1 projects with children have correct MIN/MAX math
- Convergix retainer wrapper guard intact (4171aa4d): startDate=2026-02-01, endDate=2026-07-31 pinned correctly

Three drifts:
- AUTOMATE Booth project endDate 6/22 vs children-MAX 4/24 (intentional outer-bound to show date)
- Social May 1-day drift (project endDate=4/27, child=4/28; project status=completed → harmless)
- Hopdoddy/Dave Asprey wrapper guards not pinning (separate completeness fix)

4 past-end L2s in-progress (3 LPPC + 1 AUTOMATE Booth) — stale hygiene, not cascade bugs.

### Category 8 — AG1 root cause (FAIL — TP planning miss)

Verbatim from RCA panel:
> Every write executed exactly as the spec wrote it. The spec is what's wrong, not the writes.

The AG1+S+B spec verbatim, line 51:
> "Note on contractStart/contractEnd: not setting on Social Content Trial yet — wrapper guard still pins start/end to the project row's current values (both null), which keeps recompute from clobbering them. If we want the wrapper to display a SOW window, set contractStart/contractEnd as a follow-up batch once the formal $30K SOW is signed."

TP made a correct technical observation but applied the wrong product rule on top: "wait for paper SOW." Operator framing was "30-day verbal SOW underway" — that IS a SOW window. Plus the spec only deferred contractStart/contractEnd; startDate/endDate on the project row itself were never addressed at all.

For AG1 PRO Content: spec touched only `parent_project_id` and `notes`. Spec explicitly did NOT address status/startDate/endDate. The Slackbot baseline (Allison's 2026-04-27 create with `not-started` + same-day placeholder) was preserved.

**RCA prescription** (operator confirms before APPLY):
- Social Content Trial wrapper: startDate **2026-04-13** (best-guess Batch 1 kickoff), endDate **2026-05-13** (start+30d), contractStart/End same, owner **Jill**
- AG1 PRO Content: status **in-progress**, startDate **2026-04-27** (Allison's create date), endDate **2026-05-13** (or 4/30 if scoped to concept-deliverable only)
- Confidence: HIGH on status/owner/engagementType; MEDIUM on contract window dates; LOW on PRO Content endDate scope

---

## Status of corrective triplet on disk

**Triplet at:** `scripts/runway-migrations/hdl-bonterra-corrective-2026-04-28.{ts,-verify.ts,-REVERT.ts}`
**DRY_RUN:** green (per prior session); not re-verified this audit
**Audit row count:** 62
**Status:** NOT applied. Hold.

**Coverage gaps and bugs in the triplet (vs. this audit's findings):**

| Finding | Triplet addresses? |
|---|---|
| HDL convention shift (28 tasks) | YES |
| Bonterra UI red flag (Dev IR Revisions date) | YES |
| Bonterra Slackbot gaps (Final Review + Deliver to Client) | YES |
| HDL `Chris (client)` strip | YES |
| HDL Civ R1 Refinements split (resources + Lane Post-Shoot create) | YES |
| HDL Schema/SEO/AIO Ken Clark strip | YES |
| **HDL Open Page Decisions DELETE** | YES — **but DELETE is WRONG; row is operator-sourced** |
| HDL Site Staging 6/4 vs 6/8 | NO — leaves 6/4 unchanged |
| HDL Confirm to Launch 7/2→7/6 | YES |
| AG1 wrapper dates/contracts | NO — out of scope |
| AG1 PRO Content status/dates | NO — out of scope |
| Hopdoddy Digital Retainer naked wrapper | NO — out of scope |
| Bonterra Impact Report null notes | NO — out of scope |
| Beyond Petrochemicals 5 in-production projects | NO — out of scope |
| Convergix 4 weekday mismatches | NO — out of scope |
| Convergix 16 range tasks date≠endDate | NO — out of scope |
| LPPC range tasks date≠endDate (3) | NO — out of scope |
| LPPC empty-string dueDate | NO — out of scope |
| 11 status/category mismatches | NO — out of scope |
| 4 Convergix orphan retainer-tagged L1s | NO — out of scope |
| Dave Asprey wrapper guard issue | NO — out of scope |
| 4 past-end L2s | NO — out of scope |
| 5 HDL `OPERATOR: verify` markers in notes | PARTIAL (Schema/SEO/AIO, Smokeball, Batch 2 Dev, Confirm to Launch addressed; Ad Words convention shift only) |

**Triplet covers ~half of the findings. It also has at least one wrong write (Open Page Decisions DELETE).**

---

## Operator decisions required before any corrective

These are the points where the audit found ambiguity or conflict between operator inputs. Each needs an explicit operator answer before a corrective batch ships.

| # | Decision | Audit finding | Recommendation (low-confidence — operator confirms) |
|---|---|---|---|
| Q1 | **AG1 trial start/end dates** | RCA best-guess 4/13–5/13 from "Batch 1 6 pieces completed" timing. Could be 4/14 → 5/14. | Confirm exact day. Default 4/13–5/13. |
| Q2 | **AG1 PRO Content endDate** | Concept due 4/30, but post-concepting content delivers within trial window. | 5/13 if scoped to trial close; 4/30 if scoped to concept-writeup-only deliverable. |
| Q3 | **HDL Site Staging — 6/4 or 6/8?** | Jill's 2026-04-27 Slack: "6/8, decision pending whether to fold into R1 Site Review or stand alone". Drafter wrote 6/4 without authorization. | Pick 6/4 (current prod) or 6/8 (Jill's stated value). |
| Q4 | **HDL Open Page Decisions** | Operator-authorized. Drafter set date=5/4. | Keep at 5/4 with convention shift to single-day milestone. **Remove DELETE from corrective.** |
| Q5 | **HDL Schema/SEO/AIO Ken Clark scope** | Pending Jill confirmation per operator's open Q. | Strip Ken Clark, set `Dev: Leslie` pending verification (current corrective plan). |
| Q6 | **HDL Civ R1 Refinements assignment** | Operator: Leslie (Dev), not Lane (CD). Lane post-shoot is separate. | Resources `Dev: Leslie` + create separate "Lane Post-Shoot Editing" range 6/2–6/19. |
| Q7 | **HDL Project notes drafter content** | Notes contain B1/B2 windows, Site Review 6/5, R1 Feedback 6/10, etc. without operator audit trail. | Refresh notes from operator's verbatim 2026-04-27 messages, not paraphrase. |
| Q8 | **Hopdoddy Digital Retainer — wrapper or pass-through?** | engagementType=retainer + contract dates pinned but startDate/endDate null. | If retainer wrapper → pin startDate=contractStart=2026-01-01, endDate=contractEnd=2026-12-31. Operator confirms or treats as separate decision. |
| Q9 | **Dave Asprey wrapper start** | startDate=2026-04-20 (wind-down phase) vs contractStart=2025-11-14 (full retainer span). | If wrapper → set startDate=2025-11-14. If "wind-down phase only" → operator confirms current value. |
| Q10 | **4 Convergix orphan retainer-tagged L1s** | engagementType=retainer + Convergix contractStart/End but parentProjectId=NULL. Should they nest under wrapper `4171aa4d`? | Nest under wrapper (consistent with other retainer L1s). |
| Q11 | **11 project status/category mismatches** | 7 completed-but-active, 1 EDF, 1 LPPC, 1 Convergix Corp Collateral. | Flip category to match status (completed→completed, on-hold→on-hold). |
| Q12 | **4 past-end L2s** | 3 LPPC (R3 Design Review 4/23, Development Kickoff 4/23, Map Dev Revisions 4/24) + 1 AUTOMATE Booth (Booth Layout—Nicole 4/24). | Operator decides per-row: complete (work done) vs extend endDate (work continues) vs cancel. |
| Q13 | **Bonterra Impact Report notes** | null on in-production project. | Refresh notes from operator's 2026-04-27 Bonterra context (Internal Review held 4/23, Bonterra changes 4/27, Final Review 4/29, Deliver 4/30, Go Live 5/11). |
| Q14 | **Beyond Petrochemicals 5 in-production projects** | All 5 have null owner/dates. Wasn't in scope of any 2026-04-27 batch. | Separate cleanup batch. Need operator/Kathy on owner per project + dates. |
| Q15 | **5 HDL weekItems with `OPERATOR: verify` markers in notes** | Drafter self-flagged unverified, APPLY ran. Notes still flag in prod. | After Jill confirms scope (Schema/SEO/AIO, Ad Words, Smokeball, Calculators), strip the verify markers from notes and write final values. |

---

## Recommended path forward

### Option A — Comprehensive corrective (single batch, after operator answers)

One large batch covering all FAIL categories above. Estimated ~200+ audit rows. Would require:
1. Operator answers Q1–Q15
2. New plan markdown with locked values
3. Subagent drafts triplet
4. Code-review QA + 5-panel holdout QA before APPLY
5. APPLY + verify

**Pros:** one shot, full integrity sweep
**Cons:** large batch = more failure surface; Slackbot questions on operator's plate

### Option B — Phased correctives (recommended)

Phase 1 — **Convention sweep** (no judgment calls): flip `date := endDate` on all 95 violating weekItems + recompute dayOfWeek from date. Mechanical. Operator pre-confirms convention only. Estimated 100+ audit rows.

Phase 2 — **HDL/Bonterra/AG1 targeted corrective**: address all operator-decision items (Q1–Q7, Q15). Estimated 60–80 rows. Replaces the on-disk corrective triplet.

Phase 3 — **Beyond Petrochemicals + project-level cleanup**: Q11–Q14 + Q8–Q10 + 4 weekday mismatches. Estimated 30–50 rows. Needs Kathy/Jill input on BP.

Phase 4 — **Slackbot UX root cause**: separate engineering track to make Slackbot creates require baseline fields. Off the data-TP critical path.

**Pros:** smaller batches, less coupled, easier to verify; each phase has narrower operator decision surface
**Cons:** more cycles

### Option C — Operator-driven priority pass

Operator picks the top 5 most-painful items and we do them first; rest scheduled later. Lower throughput but tightest operator control after trust loss.

---

## Slackbot UX root cause (separate track)

Half of the gaps trace back to Slackbot creates that leave baseline fields null:
- Bonterra Final Review + Deliver to Client (dayOfWeek, endDate, notes null)
- AG1 PRO Content (status=not-started, dates=same-day placeholder)
- Hopdoddy "Brand Refresh Website launch" (status null)
- AG1 Concept Writeups (resources malformed "Sami, Lane")
- Beyond Petrochemicals 5 in-production projects (no owner, no dates)

**Fix:** Slackbot create modal/flow must require: owner, status, startDate, endDate (or single-day milestone toggle), dayOfWeek auto-derived, parent project picker, role-prefixed resources. Until this ships, every Slackbot create needs a TP backfill pass.

This is a known item in the Future-work backlog; today's audit confirms it's the recurring root cause, not just a polish item.

---

## What to do next

1. **Operator reviews this report**. Verifies findings independently (spot-check via runway UI or `mcp__runway__get_client_detail`).
2. **Operator answers Q1–Q15** (or selects priority subset).
3. **Choose path A, B, or C** above.
4. **DO NOT APPLY the on-disk corrective triplet as-is** — it has the wrong DELETE on Open Page Decisions and is undersized for the actual problem. Either:
   - Delete the triplet and start fresh, or
   - Patch it (remove A6 DELETE, add Open Page Decisions endDate=5/4 single-day milestone, expand scope per Phase 2)
5. **Every future corrective ships through this audit pattern**: code-review QA + 5 holdout panels + AG1-style RCA when warranted.

---

## Methodology improvements codified by this audit

**Add to `feedback_data_qa_holdout_pattern.md` (already written):**
- 5-panel holdout (Completeness, Consistency, Intent, Source, Cascade) runs in parallel BEFORE APPLY
- Panels never read the spec or migration scripts — only prod state and operator-stated intent

**Add as new feedback entries (if not already saved):**
- AG1 RCA's "5 panels needed" includes a **Slackbot-baseline panel** for any spec touching a weekItem/project created in the last 14 days by a non-operator — placeholder defaults must be reviewed before the spec ships
- AG1 RCA's "Intent panel: any project whose notes describe active work must NOT have status=not-started" is a cross-check between status enum and notes-string semantics
- Source Attribution found that drafter notes containing literal `OPERATOR: verify` markers shipped to prod despite the markers — APPLY gating should grep for these markers on plan and reject

---

End of audit report. Trust withdrawn → verification first. Operator decides next steps.
