# Convergix Cards Spec — 2026-05-01 (TP-approved)

**batchId**: `convergix-cards-2026-05-01`
**updatedBy**: `data-tp-2026-05-01`
**Triplet path**: `.worktrees/data-tp-runway/scripts/runway-migrations/convergix-cards-2026-05-01{,-verify,-REVERT}.ts`

## Intent context

Convergix one-pass corrective batch (largest arc remaining, 22 L1s). Operator + evaluator pre-aligned via Q&A 4/22 + Slack 4/22-4/29 + audit log + Convergix project tracker sheet. Decisions locked across 4 questions and 3 new context locks (retainer SOW, CDS scope TBD, Industrial/Battery confirm).

Three new drift classes likely cohort-patch trigger at sweep step (status/category mismatch 6×, bot-create burst orphans 2-of-2, field corruption from XML injection 1-of-1).

## Audit count target

**~102 audit rows** (subject to drafter exact count from helper math). Drafter must verify DRY_RUN line count matches.

## Wrapper + client (verify-only, no writes)

These are already correct — verify script asserts state, forward script does NOT write.

| Row | Field | Expected |
|---|---|---|
| client `181fea93bc4d435db0a1a8283` | contractValue | "$100,000" |
| client `181fea93bc4d435db0a1a8283` | contractTerm | "Feb 1 – Jul 31, 2026" |
| project `4171aa4d88934d22b020d75fe` (wrapper) | contractStart | "2026-02-01" |
| project `4171aa4d88934d22b020d75fe` | contractEnd | "2026-07-31" |
| project `4171aa4d88934d22b020d75fe` | engagementType | "retainer" |
| project `4171aa4d88934d22b020d75fe` | parentProjectId | null |

## GROUP A — L1 corrections (16 rows touched)

### A1. `272e7eef7f554c03947d9b103d5dee80` AUTOMATE 2026 Booth Design

Per operator new context A: SOW excludes booth → outside retainer.

| Field | Old | New | Helper |
|---|---|---|---|
| parentProjectId | "4171aa4d88934d22b020d75fe" | null | updateProjectField |
| engagementType | "retainer" | "project" | updateProjectField |
| dueDate | null | "2026-06-22" | updateProjectField |
| notes | (current) | (current) + " Booth dimensions received from Nicole 2026-04-28. Layout lock proceeding." | updateProjectField |

Leave contractStart/contractEnd as-is (inherited from wrapper, surface in sweep for operator review re booth-specific SOW dates).

### A2. `c0935359406e40709a0790372` Texas Instruments Article

| Field | Old | New | Helper |
|---|---|---|---|
| category | "active" | "completed" | updateProjectField |
| dueDate | null | "2026-05-01" | updateProjectField |

### A3. `3d5215f4a3964f38a1b2afda0` Fanuc Award Article + LI Post

| Field | Old | New | Helper |
|---|---|---|---|
| status | "not-started" | "in-production" | updateProjectStatus |
| dueDate | null | "2026-05-05" | updateProjectField |

### A4. `135c5a61d5c343b1b5b39fe08` Events Page Updates (5 tradeshows)

| Field | Old | New | Helper |
|---|---|---|---|
| category | "active" | "completed" | updateProjectField |

dueDate already 2026-04-24 ✓. Status already completed ✓.

### A5. `394f9e5e5b864c2eb2260f468` Rockwell PartnerNetwork Article

| Field | Old | New | Helper |
|---|---|---|---|
| category | "active" | "completed" | updateProjectField |
| dueDate | null | "2026-04-23" | updateProjectField |

### A6. `51f39e5cdfbe446992aa155d6` Brand Guide v2

| Field | Old | New | Helper |
|---|---|---|---|
| category | "active" | "completed" | updateProjectField |
| dueDate | null | "2026-04-23" | updateProjectField |

### A7. `68a4ee3791b24d72abb5afc62` Certifications Page

Daniel delivered certs 2026-04-23 per Slack — cert page no longer awaiting client.

| Field | Old | New | Helper |
|---|---|---|---|
| status | "awaiting-client" | "in-production" | updateProjectStatus |
| category | "awaiting-client" | "active" | updateProjectField |
| dueDate | null | "2026-04-30" | updateProjectField |
| waitingOn | "Daniel" | null | updateProjectField |
| notes | (current) | (current) + " Certs received from Daniel 2026-04-23. Wraps within 1 week (target 2026-04-30)." | updateProjectField |

### A8. `0e4214c60728476db177f4de1` CDS Vertical Campaign

Per operator new context B: keep dueDate=5/14, append note about case study + brochure scope TBD.

| Field | Old | New | Helper |
|---|---|---|---|
| dueDate | null | "2026-05-14" | updateProjectField |
| notes | (current) | replace ending: "...R2 presentation: 2026-05-01 (covers R1 changes + creative wrapper presentation). Case study + brochure scope TBD per 4/7 deck; extend dueDate when those land." | updateProjectField |

### A9. `f391dff5ceaf45279a807ace9` Social Content — April 2026

April execution complete (4 posts shipped 4/27 per L2 notes).

| Field | Old | New | Helper |
|---|---|---|---|
| status | "in-production" | "completed" | updateProjectStatus |
| dueDate | null | "2026-04-27" | updateProjectField |

### A10. `b452f64704f5453c8bb6c5591` Social Content — May 2026

Calendar drafted but May execution (weekly posts) ahead — premature completion.

| Field | Old | New | Helper |
|---|---|---|---|
| status | "completed" | "in-production" | updateProjectStatus |
| dueDate | "2026-04-28" | null | updateProjectField |

### A11. `65b2cac113a048f592867a71c` Corporate Collateral Updates

Stale awaiting-client category — certs received per 4/23.

| Field | Old | New | Helper |
|---|---|---|---|
| category | "awaiting-client" | "active" | updateProjectField |
| notes | (current) | replace ending: "...Kathy Q2b 2026-04-22: brochure already built — just need certs + Fanuc info to finalize. Certifications received from Daniel 2026-04-23. Targeting completion of Brochure + PPT with certs incorporated by 2026-04-30 status call." | updateProjectField |

### A12. `0c208308ff48427092776c0da` New Capacity (PPT, brochure, one-pager)

| Field | Old | New | Helper |
|---|---|---|---|
| dueDate | null | "2026-05-08" | updateProjectField |
| notes | (current) | (current) + " Daniel potential blocker on brochure + one-pager per Q5a 2026-04-22." | updateProjectField |

### A13. `0157c423` Big Win Template

Re-parent to wrapper (created 4/22 inside retainer); cat fix + dueDate.

| Field | Old | New | Helper |
|---|---|---|---|
| parentProjectId | null | "4171aa4d88934d22b020d75fe" | updateProjectField |
| category | "active" | "completed" | updateProjectField |
| dueDate | null | "2026-04-23" | updateProjectField |

### A14. `95ba6a2f178a4b338be77b1a9` Industrial/Battery Assembly Campaign

| Field | Old | New | Helper |
|---|---|---|---|
| dueDate | null | "2026-07-31" | updateProjectField |

### A15. `86d94de276b94134bdd811ec5` "New Capacity ppt" — DELETE

Confirmed duplicate of `0c208308`. Use deleteProject helper (or raw drizzle + manual audit if helper not exported).

## GROUP B — L2 sweep (mechanical convention fixes)

### B1. `9e432ae4ccac4b24ab1628eaf` AISTech 2026 — cascade-safe (deadline cat)

Recipe: cat→delivery → date+dayOfWeek writes → cat→deadline back. **Category-first ordering critical.**

| Field | Old | New |
|---|---|---|
| category | "deadline" | "delivery" (then back to "deadline") |
| date | "2026-04-24" | "2026-05-06" |
| dayOfWeek | "monday" | "wednesday" |

startDate=5/4, endDate=5/6, weekOf=2026-05-04 already correct. No paired write needed.

### B2. `e896855496d749f88cddaab43` Events Page — Staging — cascade-safe (deadline cat)

Recipe: cat→delivery → date write → cat→deadline back.

| Field | Old | New |
|---|---|---|
| category | "deadline" | "delivery" (then back to "deadline") |
| date | "2026-04-24" | "2026-04-30" |

dayOfWeek already "thursday" ✓ (4/30 is Thursday). startDate=4/30, endDate=4/30, weekOf=2026-04-27 ✓.

### B3. `35b86e337b0d4f2b95370bbf9` TI Award — Page Build (cat=delivery, safe)

| Field | Old | New |
|---|---|---|
| date | "2026-04-23" | "2026-04-30" |
| dayOfWeek | "thursday" | "thursday" (4/30 is Thursday — same day name, drafter may skip if no-op) |

startDate=4/23, endDate=4/30 ✓, weekOf already 2026-04-27 ✓.

### B4. `f9bdf4eb0b804a0baba504c114c2db14` TI award copy + image (cat=delivery)

| Field | Old | New |
|---|---|---|
| date | "2026-04-22" | "2026-05-01" |
| dayOfWeek | "wednesday" | "friday" |
| weekOf | "2026-04-20" | "2026-04-27" |

startDate=4/22, endDate=5/1 ✓.

### B5. `84928c2bdd724232a4c624b431b20922` Booth Layout + Room Dim

Booth dimensions received 4/28 per audit — close out.

| Field | Old | New |
|---|---|---|
| status | "in-progress" | "completed" |
| date | "2026-04-22" | "2026-04-28" |
| endDate | "2026-04-24" | "2026-04-28" |
| dayOfWeek | "wednesday" | "tuesday" |
| weekOf | "2026-04-20" | "2026-04-27" |

startDate=4/22 stays (kickoff date).

### B6. `9d2f190311c1462797b4761df` Big Win Template — PPT Template (cat=delivery)

| Field | Old | New |
|---|---|---|
| date | "2026-04-22" | "2026-04-23" |
| dayOfWeek | "wednesday" | "thursday" |

startDate=4/22, endDate=4/23, weekOf=2026-04-20 ✓.

### B7. `4bdaf887d26f4c9fa0d8a85af` Cert Daniel Follow-Up

Daniel delivered 4/23 → close.

| Field | Old | New |
|---|---|---|
| status | "blocked" | "completed" |

### B8. `746b03b4973f41d5b7d4bd16c` Rockwell Co-Marketing — Nicole Team Conv

Default per operator Q2 (no Slack/audit signal post-4/29).

| Field | Old | New |
|---|---|---|
| status | "scheduled" | "completed" |

### B9. `f78857f36f7d435389f89a625` Fanuc Award - Social Post & Article — CORRUPTION FIX

weekOf field has bot tool-call XML injection: `"2026-05-05</weekOf>\n<parameter name=\"category\">delivery"`.

| Field | Old | New |
|---|---|---|
| weekOf | (corrupted XML string) | "2026-05-04" |
| status | null | "scheduled" |
| category | null | "delivery" |
| dayOfWeek | null | "thursday" (date=5/7 is Thursday) |
| resources | null | "CW: Kathy, Dev: Leslie" |

date already "2026-05-07", startDate already "2026-05-07" ✓.

## GROUP C — Orphan parenting (6 orphans → AUTOMATE Booth Design)

All 6 orphans → parentProjectId=`272e7eef7f554c03947d9b103d5dee80` (AUTOMATE Booth) per operator Q1 lock + project tracker sheet.

For each orphan: `linkWeekItemToProject(weekItemId, projectId)` is the recommended helper (atomically links + recomputes parent dates). Then individual `updateWeekItemField` calls for other fields. Per-orphan op order: link → status → category(if) → owner/resources → date/dayOfWeek/weekOf (paired).

### C1. `b85f2466abce4010a6b2d6a8a` Internal review for booth graphics

| Field | Old | New |
|---|---|---|
| projectId (link) | null | "272e7eef7f554c03947d9b103d5dee80" |
| status | null | "scheduled" |
| owner | null | "Kathy" |
| resources | null | "CD: Lane" |
| dayOfWeek | null | "wednesday" (5/6 is Wed) |
| weekOf | "2026-04-27" | "2026-05-04" |

date=5/6, startDate=5/6 ✓. category=review ✓.

### C2. `e2f5ec4cc01b40a7acbcdbc78` Kathy to provide copy

| Field | Old | New |
|---|---|---|
| projectId (link) | null | "272e7eef7f554c03947d9b103d5dee80" |
| status | null | "scheduled" |
| resources | null | "CW: Kathy" |
| dayOfWeek | null | "friday" (5/1 is Fri) |

date=5/1, startDate=5/1 ✓. weekOf=2026-04-27 ✓ (Monday before 5/1). owner=Kathy ✓. category=delivery ✓.

### C3. `285e44729eb543b791eee8634` Review with client

| Field | Old | New |
|---|---|---|
| projectId (link) | null | "272e7eef7f554c03947d9b103d5dee80" |
| status | null | "scheduled" |
| owner | null | "Kathy" |
| resources | null | "CW: Kathy" |
| dayOfWeek | null | "thursday" (5/7 is Thu) |
| weekOf | "2026-04-27" | "2026-05-04" |

date=5/7, startDate=5/7 ✓. category=review ✓.

### C4. `3b5a795790a04fdc9a6aa82fb` Revisions to client

| Field | Old | New |
|---|---|---|
| projectId (link) | null | "272e7eef7f554c03947d9b103d5dee80" |
| status | null | "scheduled" |
| owner | null | "Kathy" |
| resources | null | "CW: Kathy" |
| startDate (paired) | "2026-05-13" | "2026-05-11" |
| dayOfWeek | null | "monday" (5/11 is Mon) |
| weekOf | "2026-04-27" | "2026-05-11" |

date=5/11 ✓ already. category=delivery ✓.

### C5. `5059b1bd29364bcbaca7675b3` Final approval from client

| Field | Old | New |
|---|---|---|
| projectId (link) | null | "272e7eef7f554c03947d9b103d5dee80" |
| status | null | "scheduled" |
| owner | null | "Kathy" |
| resources | null | "CW: Kathy" |
| startDate (paired) | "2026-05-15" | "2026-05-13" |
| dayOfWeek | null | "wednesday" (5/13 is Wed) |
| weekOf | "2026-04-27" | "2026-05-11" |

date=5/13 ✓ already. category=approval ✓.

### C6. `e77c06b02df94e4fae28e8c94` Deliver files — SNAP DATE 5/17→5/15 per operator Q1

| Field | Old | New |
|---|---|---|
| projectId (link) | null | "272e7eef7f554c03947d9b103d5dee80" |
| status | null | "scheduled" |
| owner | null | "Kathy" |
| resources | null | "CD: Lane" |
| date | "2026-05-17" | "2026-05-15" |
| startDate (paired) | "2026-05-17" | "2026-05-15" |
| dayOfWeek | null | "friday" (5/15 is Fri) |
| weekOf | "2026-04-27" | "2026-05-11" |

category=delivery ✓.

## GROUP D — New L2 creates (3 new rows)

### D1. AUTOMATE Booth Panels — Drop Dead for Print Files

Per operator Q1 + sheet. Parent: AUTOMATE Booth (`272e7eef`).

| Field | Value |
|---|---|
| title | "AUTOMATE Booth Panels — Drop Dead for Print Files" |
| projectId | "272e7eef7f554c03947d9b103d5dee80" |
| clientId | "181fea93bc4d435db0a1a8283" |
| date | "2026-05-18" |
| startDate | "2026-05-18" |
| endDate | "2026-05-18" |
| dayOfWeek | "monday" |
| weekOf | "2026-05-18" |
| category | "deadline" |
| status | "scheduled" |
| owner | "Kathy" |
| resources | "CD: Lane" |
| notes | "Drop dead for print files per show vendor. Panels must be at printer by this date for AUTOMATE 6/22-25." |

### D2. TI Hero Image — Design + Deploy

Per Slack 4/27. Parent: TI Article (`c0935359`).

| Field | Value |
|---|---|
| title | "TI Hero Image — Design + Deploy" |
| projectId | "c0935359406e40709a0790372" |
| clientId | "181fea93bc4d435db0a1a8283" |
| date | "2026-05-08" |
| startDate | "2026-04-28" |
| endDate | "2026-05-08" |
| dayOfWeek | "thursday" (5/8 is Thu) |
| weekOf | "2026-05-04" |
| category | "delivery" |
| status | "blocked" |
| owner | "Kathy" |
| resources | "CD: Lane, Dev: Leslie" |
| notes | "Hero image needed for TI Article (live 4/28). Kathy created HTML alt 4/25; Lane to design proper hero, Leslie to deploy. Body-copy intro paragraph requested per Kathy's 4/25 message." |

### D3. Rockwell PartnerNetwork — Image Replacement

Per Slack 4/27 (image cut-off issue). Parent: Rockwell PartnerNetwork Article (`394f9e5e`).

| Field | Value |
|---|---|
| title | "Rockwell PartnerNetwork — Image Replacement" |
| projectId | "394f9e5e5b864c2eb2260f468" |
| clientId | "181fea93bc4d435db0a1a8283" |
| date | "2026-05-08" |
| startDate | "2026-04-28" |
| endDate | "2026-05-08" |
| dayOfWeek | "thursday" |
| weekOf | "2026-05-04" |
| category | "delivery" |
| status | "blocked" |
| owner | "Kathy" |
| resources | "CW: Kathy" |
| notes | "Live article images getting cut off (text-baked-in image cropping). Kathy to request different image from client. Per Leslie 4/27: design/logic crops images taller than default aspect ratio." |

## GROUP E — Retainer renewal L2 update

### E1. `1859637a9dc84a4e889988552` 2H Convergix Retainer Renewal

Per operator Q4 lock.

| Field | Old | New |
|---|---|---|
| date | null | "2026-05-25" |
| startDate (paired) | null | "2026-05-25" |
| resources | "AM: Kathy" | "AM: Kathy, PM: Jason" |

dayOfWeek=monday ✓, weekOf=2026-05-25 ✓, category=kickoff ✓, status=scheduled ✓, owner=Kathy ✓.

## GROUP F — Fanuc Article re-parent verification

`f78857f36f7d435389f89a625` already has projectId=`3d5215f4` (Fanuc Article L1). After Group B9 corruption fix, no further parenting needed. Verify only.

## Op order discipline

Within batch:
1. **L1 deletes first** (`86d94de` delete) so cascades fire on already-removed rows
2. **Cascade-guarded L2 writes** (B1 AISTech, B2 Events Staging) use category-first recipe
3. **Per-row order**: link → status/category → owner/resources/notes → date/startDate/endDate/dayOfWeek → weekOf (LAST)
4. **L1 status flips** before category writes if both moving (cascade-status fires on status, no cascade on category)
5. **paired startDate** writes alongside any `date` write where startDate also moves
6. **wrapper guard**: NOT applicable here (no overrideProjectDate calls; AUTOMATE re-parent uses updateProjectField on parentProjectId, not on dates)

## DRY_RUN expectations

Drafter must run DRY_RUN, capture line count, document in summary. Expected ~102 audit-row write attempts.

## Rails compliance pre-check (TP will run)

12 points per `rails-reference.md`. Drafter does NOT skip enums, paired startDate, paired dayOfWeek, weekOf invariant, category-first ordering, batch hygiene.
