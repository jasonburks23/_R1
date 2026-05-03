# Data Integrity TP — Cohort Handoff

Successor TP reads this in full before invoking `/data-integrity-tp`. Rolling cohort handoff — most recent session-close at top. Each session-close section dates itself within.

**Note on file references:** Per-session "Snapshot state on disk" sections list paths under `docs/tmp/data/...` and `scripts/runway-migrations/...`. These resolved at the time of writing within the session's worktree. Worktrees are disposed after cohort close, so post-disposal those paths resolve only via the session's feature branch history on `origin` — e.g., Convergix artifacts at `origin/feature/data-tp-cluster3` (commit `0bfee29`). Treat in-doc file references as historical audit-trail; fetch the branch if you need to reconstitute.

## Session 2026-05-02 close (Convergix ✓ — cohort COMPLETE)

**Convergix** — 3 sequential batches APPLIED + verified clean today. 169 total audit rows touched. Wrapper guard intact across all 3 batches. Cohort (Hop / TAP / Sou / Cgx) closed; queue empty.

**Batch ledger:**

| Batch | Audit | What it addressed |
|---|---|---|
| `convergix-cards-2026-05-01` | 114 | Card-by-card refresh — 6 orphan parents, R2-R4 dueDate cascade guards, single-day endDate pairs, dayOfWeek calendar fixes (D2/D3) |
| `convergix-status-sweep-2026-05-02` | 30 + 1 fix | CAT 2 past-dated non-terminal status. Cert Page → completed (Card 1 precedent), Rockwell endDate=5/16 (Card 2 + post-recompute fix override), Social May endDate=5/29 (Card 3), 6 L2 multi-field rewrites |
| `convergix-convention-sweep-2026-05-02` | 24 | CAT 1 multi-day shape (8 rows), CAT 4 single-day endDate=null fills (5 rows), 2 notes dedupes (CDS R2 sentence + New Capacity Daniel-blocker) |

**Outcomes:**
- 6 prior orphans parented (cards C1-C6).
- All 6 multi-day CDS L2s reshaped to range convention (date==endDate=5/14, startDate=work begin).
- New Capacity PPT Complete (063b7c31) reshaped from multi-day to single-day milestone (date=startDate=endDate=5/8) per operator decision in convention sweep.
- 5 single-day endDate=null rows closed (Fanuc Social, 2H Renewal, Brochure, One-Pager, Jamie Nelson).
- CDS R2 Presentation (0754e95a) marked completed; Kathy presented 5/1.
- Cert Page (68a4ee37) terminal-closed at endDate=2026-04-30 (cert delivery + 1-week wrap landed).
- 3 historical NULL-parent L1s confirmed leave-as-is, operator-locked: Life Sciences Brochure (4b5bf2f0), Social Media Templates (c568d7a6), Organic Social Playbook (7c8478dc).

**Operator-locked deferrals (decisions and historical drift, NOT data integrity gaps):**
- AISTech 9e432ae4 notes "Risk: must be live by ???" placeholder (pre-existing import drift)
- Big Win Template — Social Announcement Companion notes drop
- AUTOMATE 272e7eef dueDate=2026-06-22 (vendor show date) vs deadline-L2 df90794b 2026-05-18 (drop-dead for printer) — semantic intent split, needs operator decision on data model
- Events Page 135c5a61 (completed L1) dueDate=2026-04-24 vs deadline children 2026-04-30 + 2026-05-06 (historical, no operational impact)
- 6 terminal-row endDate=null rows: Fanuc Pre-Event, Rockwell Image Swap, Rockwell Social Post, TI Award Social Post, Cert Page Daniel Follow-Up, May Calendar Draft
- 4 pre-existing L1 startDate drift items (Fanuc Article 3d5215f4, Rockwell Co-Marketing 1923fc1a, TI Article c0935359, AUTOMATE 272e7eef) — Cascade Integrity panel surfaced; investigate when Convergix returns to active sweep
- L2 66414d4d May Calendar Draft startDate=4/27 vs date=4/28 mismatch — closing endDate write would risk clobbering b452f647 endDate=5/29 override; deferred from convention sweep, needs paired override

**Skill v4 patch candidates queued (per-batch evidence — review at end of cohort close):**

| # | Pattern | Evidence today |
|---|---|---|
| 20 | `category` not in `PROJECT_FIELDS` MCP whitelist | Forced cards + convention batches into triplet path; recurring constraint across the day |
| 22 | status flip kickoff→in-progress should auto-flip cat kickoff→delivery (or warn) | Ergonomic gap — caught manually on every transition |
| 23 | Multi-day work-window vs single-day milestone decision pattern | Drafter prompt clarification — drafter flagged CAT 1 startDate "ambiguity" that was convention-correct (operator decided per-row); CAT 1-8 New Capacity PPT Complete required operator-led shape pivot |
| 24 | dayOfWeek/date calendar verification at spec-time | Caught D2/D3 in cards batch + Card 4 in status sweep + CAT 1-8 in convention sweep — pattern, not one-off |
| 25 | **CRITICAL** — parent date override clobbered by child-triggered recompute | Caught 3rd time today (Rockwell endDate post-Card-4 child writes recomputed parent down to 5/5; required fix-override batch). Skill rule needed: parent overrides write AFTER all child writes in same batch, OR helper sticky-override flag pinning past child-triggered recompute. |

Plus three secondary patches surfaced for landing:
- Mandatory cascade guard on every dueDate write (cards batch R2/R3/R4 pattern; Round 4 added 9 guards retroactively).
- Drafter checklist: single-day L2 needs paired endDate write (B9/E1 + CAT 4 pattern).
- Notes replace-vs-append discipline (A8 R2 sentence dup root cause).

**Cohort table at Convergix close (full 4-client matrix):**

| Drift category | Hop | TAP | Sou | Cgx | Patch state |
|---|---|---|---|---|---|
| Date conventions | y | y | y | y | PATCHED 4/30 ✓ Sou + Cgx validation passed |
| L1 dueDate=null hard-deadlined | y | y | y | n/a | PATCHED 4/30 ✓ |
| Past-dated non-terminal status | n | n | n | y (6 rows) | **NEW 1-of-4 BUT volume-driven — promote to enforced sweep #8 candidate** |
| Resources missing role prefix entirely | y | n | n | n | 1-of-4 |
| Stale single-day shape on active range | n | y | n | y (5 rows) | 2-of-4 (TAP + Cgx); CAT 4 sweep enforced; Cgx validation pass |
| Wrapper-or-project structural / missing wrapper | y | n | y | n (intact 2/1-7/31) | PATCHED 5/1 (sweep #7) |
| Status/category mismatch | n | n | y | n | 1-of-4 |
| Resources peer-alignment gap | n/a | y | y | n | PATCHED 5/1 (enforced #6) |
| Category semantic drift | n/a | y | n | n | 1-of-3 (still tracked) |
| contractStart/End null on signed | n/a | y | y | n (wrapper anchored 2/1-7/31) | PATCHED 5/1 |
| Multi-day shape: date==endDate vs date==startDate | n | n | n | y (8 rows reshape) | **NEW 1-of-4 — covered by skill v4 #23; queue review** |
| Notes append-style dedupe drift | n | n | n | y (2 rows) | **NEW 1-of-4 — covered by "notes replace-vs-append" patch; queue review** |
| Parent date override clobbered by child-triggered recompute | n | n | n | y (3× today) | **NEW CRITICAL — skill v4 #25 (no skill text yet)** |

**Threshold guidance:** Past-dated non-terminal status hit only Cgx (1-of-4) but volume (6 rows + dedicated batch) warrants enforced sweep promotion regardless. CAT 1 / CAT 4 / notes-dedupe did not trigger 2-of-4 patch-now thresholds; documented in skill v4 candidates for review session.

**Snapshot state on disk:**
- `docs/tmp/data/convergix-snapshot-2026-05-02-final.json` — post-3-batch-APPLY closing snapshot, will NOT be overwritten (Cgx is cohort tail)
- `docs/tmp/data/convergix-handoff-2026-05-02.md` — same-day Convergix-specific resume doc (3 batches detailed, open items + skill v4 candidates + post-compaction checklist)
- `docs/tmp/data/convergix-snapshot-2026-05-01-r2.json` — pre-cards R2 hydration
- `docs/tmp/data/convergix-snapshot-2026-05-01-post-apply.json` — post-cards
- `docs/tmp/data/convergix-snapshot-2026-05-02-post-status-sweep.json` — post-CAT-2
- `docs/tmp/data/convergix-batch-audit-2026-05-01.json` — 114 audit rows from cards batch
- `docs/tmp/data/convergix-spec-2026-05-01.md` — cards batch spec
- `docs/tmp/data/convergix-status-sweep-2026-05-02-spec.md` — CAT 2 batch spec
- `docs/tmp/data/convergix-convention-sweep-2026-05-02-spec.md` — convention sweep spec
- 9 triplet files in `scripts/runway-migrations/convergix-*.ts` (forward + verify + REVERT × 3 batches)

## Session 2026-05-01 close (Soundly ✓ → Convergix next)

**Soundly** — `soundly-cards-2026-04-30` (113 ops). All ok. Verify 11/11 PASS. 113 audit rows, 0 cascade collateral. Sweep no-op (7 categories scanned post-patch — only deferred-by-design iFrame Evening Launch L2 surfaces, not a new corrective batch). Outcomes:
- **NEW Retainer wrapper L1** "Soundly Website Retainer" created (engagementType=retainer, parentProjectId=null, 0 children — pure relationship marker for the $41,600/yr retainer).
- 3 existing L1s contract-dated per individual SOWs: iFrame + PG joint SOW Term 3/1–5/31; AARP SOW Term 3/1–7/15. dueDates anchored: iFrame=4/22 launch, PG=5/31 SOW close, AARP=7/15 launch.
- iFrame L1 status/category aligned (active→completed) + notes refreshed (drop "Jill confirm" — not in audit).
- 9 orphan L2s (bot-create burst 4/29) rebucketed to AARP L1 with deck-correct dates from AARP schedule deck. 2 AARP Feedback rows disambiguated as Round 1 + Round 2.
- 2 NEW L2s on AARP: "Sprint 1 — API + CMS & DB Updates" (4/15–4/29 completed); "Soundly Review/Feedback (Round 2)" (4/30–5/6 in-progress).
- Pipeline e9350d02 (AARP $31,400 duplicate) deleted.
- PG L2 8ef611c4 convention fix (date=endDate=5/31, dayOfWeek=sunday, weekOf=5/25, resources peer-aligned).

**4 skill patches landed at Soundly close** (`~/.claude/skills/data-integrity-tp/data-conventions.md`):
1. **Mechanical sweep #6 PROMOTED** — "Resources peer-alignment gap" promoted from tracked-class to enforced sweep category. Trigger: 2-of-3 cohort hits (TAP + Soundly).
2. **NEW sweep category #7** — "Missing retainer wrapper L1 when client carries a retainer." Trigger: 2-of-3 (Hopdoddy added late + Soundly missing entirely). Convergix already has wrapper. Cross-client check pending Beyond Petro et al.
3. **NEW § Contract dates and contractValue** — "Contract dates anchor on SOW Term window, NOT Effective Date." Examples: TAP, AARP, joint Soundly SOW. Paperwork-effective lag is normal; project-start lag is not.
4. **Same § (Patch 4)** — `client.contractValue` scope rules: retainer ARR for retainer-clients with outside-retainer SOWs (Soundly = $41,600 even though $103K total booked); SOW total for project-only clients (LPPC, TAP precedent). `client.contractTerm` follows the same rule.

**Cohort table at Soundly close (3 cols filled — patches landed):**

| Drift category | Hop | TAP | Sou | Patch state |
|---|---|---|---|---|
| Date conventions | y | y | y | PATCHED 4/30 ✓ Soundly validation passed |
| L1 dueDate=null hard-deadlined | y | y | y | PATCHED 4/30 ✓ Soundly validation passed |
| Past-dated non-terminal status | n | n | n | 0-of-3 |
| Resources missing role prefix entirely | y | n | n | 1-of-3 |
| Stale single-day shape on active range | n | y | n | 1-of-3 |
| Wrapper-or-project structural / missing wrapper | y | n | y | **PATCHED 5/1 (new sweep #7)** |
| Status/category mismatch | n | n | y | 1-of-3 |
| Resources peer-alignment gap | n/a | y | y | **PATCHED 5/1 (promoted to enforced #6)** |
| Category semantic drift | n/a | y | n | 1-of-2 (still tracked) |
| contractStart/End null on signed | n/a | y | y | **PATCHED 5/1 (Contract date conventions § landed)** |

**Snapshot state on disk:** worktree's `docs/tmp/data/soundly-snapshot.json` (post-APPLY, 4 L1s + 13 L2s + 0 pipeline). Will be overwritten on next snapshot run for Convergix.

## Convergix prep (operator's one-pass strategy)

Convergix is the biggest arc remaining: 22 L1s + retainer wrapper + drift since 2026-04-26 cleanup. Operator wants this in **one pass**, not day-per-client like Hopdoddy/TAP.

**New pattern: operator pre-stages structured input upfront.** Replaces card-by-card pings.

At Convergix kickoff, operator hands over:
- Convergix Hot Sheet / Status Doc
- A per-L1 status table (active / done / deprecated / on-hold per L1, plus any drift operator already knows about — 22 rows of marks)
- Any recent Slack threads or stakeholder context

TP then:
- Snapshots Convergix
- Reconciles snapshot against operator's per-L1 marks
- Drafts the full corrective batch (one big triplet, not multiple)
- **Evaluator decides every 🟡 in-line.** TP only escalates genuine unknowns (new structural calls, real ambiguity).
- Standard pipeline: drafter → rails check → 6 holdout panels → APPLY direct → verify → re-snapshot → sweep (now 7 categories) → handoff update.

This mode is **"operator pre-aligns once, machine executes"** — different from Hopdoddy/TAP's "iterate to alignment."

### Convergix pre-flags from prior handoffs (verify on snapshot pull)

1. 🚩 **`86d94de276b94134bdd811ec5` "New Capacity ppt"** — landed via bot 2026-04-29 outside any data-tp session. status=`not-started`, owner=`null`, resources=`Freelance` (no role prefix), dueDate=2026-05-06, parentProjectId=`null` (NOT linked to retainer wrapper), notes=`null`. Almost certainly a duplicate of `0c208308` "New Capacity (PPT, brochure, one-pager)" already nested under retainer wrapper. Triage: confirm dup → delete 86d94de OR merge + parent-link to wrapper + role-tag resources.

2. 🟡 **Possible role-prefix violations on retainer wrapper children** — sweep category #3 candidate. Last cleaned through Cluster 3 on 2026-04-26; drift since unknown without snapshot.

3. 🟡 **Date-convention sweep candidates** — bare-name resources, stale notes referencing past dates, possible date-convention violations on L2s under wrapper children. Sweep category #1.

4. 🟡 **Convergix retainer wrapper exists** (per prior session: "Convergix already has wrapper. Wrapper id 4171aa4d."). New sweep category #7 (missing-wrapper) does NOT trigger for Convergix — but verify wrapper has correct contractStart/End/dueDate per now-landed Contract date conventions §.

5. 🟡 **Wrapper-guarded date trap** — Convergix wrapper has children, so `overrideProjectDate` on the wrapper requires `bypassGuard` flag if direct date overrides are needed. Children L1 dates auto-derive from L2s, but wrapper dates do NOT propagate up — same quirk as Soundly's new wrapper but inverted (Convergix wrapper has children).

### What to ask operator at Convergix kickoff (in this exact order)

1. **Hot Sheet / Status Doc / recent Jill+Kathy thread** — operator paste before any destructive proposal.
2. **Per-L1 status table** — 22 rows, operator's marks. This is the speed lever.
3. **Confirm "New Capacity ppt" disposition** — delete dup, or merge + parent-link.
4. **Confirm wrapper contract date semantics** (per now-landed Contract date conventions § — SOW Term not Effective).

### What to NOT touch

- Convergix retainer wrapper structure (already in shape).
- Anything explicitly marked completed/canceled in operator's per-L1 table.
- Anything outside the per-L1 table without operator explicit add.

## Session 2026-04-30 close (Hopdoddy ✓ + TAP ✓ → Soundly next)

Both Hopdoddy and TAP closed clean. Skill patches landed. Soundly is next; Convergix follows.

**Hopdoddy** — `hopdoddy-cards-1-2-2026-04-30` (15 ops). All ok. Verify 5/5 PASS. 15 audit rows, no cascade collateral. Sweep no-op (5 categories scanned, all clean). Outcomes: BR Refresh 5/19 launch + dueDate anchor; Digital Retainer wrapper backfilled (1/1–12/31 + standing team); new L1 "Brand Refresh Revisions" under wrapper for LOE-pending revisions.

**TAP** — `tap-cards-2026-04-30` (38 ops). All ok. Verify 10/10 PASS. 38 audit rows, no cascade rows (`triggeredByUpdateId=null` on all). Sweep no-op (5 categories scanned, all clean). Outcomes: ERP Rebuild SOW mirrored (3/1–11/30 contract + dueDate); 5 phase L2s convention-fixed (kickoff→delivery/launch, multi-day shape, weekOf math, resources peer-aligned to `PM: Jason, Dev: Tim`); 3 new L2s created (Discovery completed, Project Kickoff completed, Warranty 10/29–11/30 with `blockedBy=[Training]`); Deployment notes refreshed.

**Skill patches landed at TAP close** (`~/.claude/skills/data-integrity-tp/data-conventions.md`):
- New § **Mechanical sweep categories** (after Structural review) — 5 enumerated categories (date conventions, past-dated non-terminal status, resources missing role prefix, stale single-day shape, task-dependent role labels) + tracking-only emerging classes. Triggered by 2-of-2 cohort hits on date conventions.
- New § **L1 dueDate anchor** (after Categories) — explicit anchor rules (single-event launch, multi-phase + warranty, multi-phase no warranty). Triggered by 2-of-2 cohort hits on L1 dueDate=null on hard-deadlined projects.
- Cross-reference added in `row-by-row.md` § Verification at end pointing to the new sweep section.

**Cohort table at TAP close (Hopdoddy + TAP columns filled, watch for 2-of-3 on Soundly):**

| Drift category | Hopdoddy | TAP | Soundly | Patch state |
|---|---|---|---|---|
| Date conventions | yes | yes | _ | **PATCHED 2026-04-30** |
| L1 dueDate=null on hard-deadlined | yes | yes | _ | **PATCHED 2026-04-30** |
| Past-dated non-terminal status | no | no | _ | 0-of-2 |
| Resources missing role prefix entirely | yes | no | _ | 1-of-2 |
| Stale single-day shape on active range | no | yes | _ | 1-of-2 |
| Wrapper-or-project structural | yes | no | _ | 1-of-2 |
| Status/category mismatch | no | no | _ | 0-of-2 |
| Resources peer-alignment gap (NEW class) | n/a | yes | _ | 1-of-2 (tracked) |
| Category semantic drift (NEW class) | n/a | yes | _ | 1-of-2 (tracked) |
| `contractStart`/`contractEnd` null | n/a | yes | watch all 3 L1s | cross-client item #5 |

**Threshold rule:** any 2-of-3 surface at Soundly close → patch lands at Soundly close (per existing handoff rule).

**Snapshot state on disk:** worktree's `docs/tmp/data/tap-snapshot.json` (post-APPLY, 8 weekItems). Will be overwritten on next snapshot run for Soundly. Hopdoddy/TAP states are permanent in prod — verify via targeted MCP if needed (`get_week_items({clientSlug:'hopdoddy' or 'tap'})`).

## TL;DR

**Queue (operator-locked):** ~~Hopdoddy~~ ✓ → ~~TAP~~ ✓ → ~~Soundly~~ ✓ → ~~Convergix~~ ✓. **Cohort COMPLETE 2026-05-02.**

**Snapshot pattern:** Run `pnpm runway:snapshot --scope=<slug>` at the start of each client's pass, not up front. The script overwrites, one snapshot on disk at a time. Just-in-time is cleaner than pre-pulling all four.

**LPPC is data-clean.** Don't re-touch unless cross-client patterns demand.

**HDL / AG1 / Bonterra remain clean-by-fiat.** Don't touch unless cross-client surfaces.

## Session intent for the next round

Operator's queue, in order:

1. **Hopdoddy** (2 L1s, 0 L2s) — Brand Refresh launch verification + Digital Retainer wrapper-or-project structural call.
2. **TAP** (1 L1, 0 L2s) — Contract date backfill + phased-work L2 question.
3. **Soundly** (3 L1s, 0 L2s) — iFrame status/notes contradiction + cross-project contract date sweep.
4. **Convergix** — its own session. Largest scope (22 L1s including retainer wrapper + 1 newly-drifted bot-create).

## What just landed (LPPC, 2026-04-29 → 2026-04-30)

- **Counts:** 6 L1s (was 7, deleted `dfbf69a7` Mailchimp duplicate), 16 L2s (was 17, deleted 2 placeholder rows + created Hero Video Resolution).
- **3 batchIds shipped:**
  - `lppc-rowbyrow-2026-04-29` — 13 cards across forward-status drift, project notes refreshes, dedupe delete, resources fixes.
  - `lppc-mechanical-sweep-2026-04-29` — 16 ops. Date convention enforcement (`date=endDate`, `dayOfWeek` tracks `date`, single-day `endDate` fills, Map Client Clarity Ping resources relabel CW→AM).
  - `lppc-followup-fixes-2026-04-29` — 13 ops. Pencils Down 4/23→5/4 push (cascade-safe recipe verified — no leak to parent project.dueDate), Policy Materials Import 4/27→5/4 push, QA Phase multi-day fill 5/7→5/8.
- **L1s without L2s (intentional):** completed (YER, Spring CEO Invite) and on-hold (Blog Posts, Training Video, placeholder L2s deleted per Mailchimp precedent).
- **Active L1s:** Interactive Map (4 L2s), Website Revamp (12 L2s).
- **Hero Video Resolution L2** (`423ea9c0`) is new — Bill delivered 3 motion-sick hero videos 4/28; gated on resolution before Staging 5/4.

## Snapshot workflow (data-fresh-after-compaction recco)

The snapshot script `scripts/runway-snapshot.ts` (in `.worktrees/data-tp-runway/`) is the canonical fresh-state pull. It writes raw passthrough JSON for one client + purges other `*.json` in `docs/tmp/data/` as part of its run.

**Per-client, just-in-time pattern:**

```bash
cd /Users/jasonburks/Documents/_AI_/_R1/.worktrees/data-tp-runway
pnpm runway:snapshot --scope=hopdoddy
# Work Hopdoddy. After compaction during this pass, re-read docs/tmp/data/hopdoddy-snapshot.json. No re-pull needed.

# When done with Hopdoddy and moving to TAP:
pnpm runway:snapshot --scope=tap
# Hopdoddy's snapshot is overwritten — but Hopdoddy state is now permanent in prod (just-applied via writes).
# If you need to verify a Hopdoddy field post-cleanup, use targeted MCP: get_week_items({clientSlug:'hopdoddy'}) is bounded and fast.
```

**Why not pre-pull all four clients:** the script is one-at-a-time. Pre-pulling burns context for clients you won't touch for 30-60 minutes. Just-in-time keeps hydration footprint at ~50-70k tokens per single-project client, ~80-100k for Convergix.

**Compaction mid-card behavior:** the on-disk snapshot survives compaction. Conversation context is summarized away but the file stays. Re-read it to resume. `set_batch_mode` from prior context is gone — re-set with the same batchId before resuming writes.

**Mid-pass staleness (within a client):** the snapshot is fresh at start-of-pass, NOT through the full pass. After Card N writes to prod, any Card N+M that depends on those rows is reading stale snapshot state. Two options:

- **Spot-verify just-written rows** with bounded MCP: `get_week_items({clientSlug:'X'})` or `get_client_detail({slug:'X'})` between cards when a downstream card references prior-card rows. Cheap, surgical.
- **Re-snapshot mid-pass** (`pnpm runway:snapshot --scope=X` again) before scoping the mechanical sweep at the end. Heavier but resets the running state to current.

Default: spot-verify between cards, re-snapshot before the closing mechanical sweep so the sweep operates on post-row-by-row state, not stale pre-cleanup state.

**Current state of `docs/tmp/data/`:**
- Main repo: only this handoff doc.
- Worktree: stale `lppc-snapshot.json` from 2026-04-29 ~14:43 UTC (pre-cleanup). **Will be overwritten on first snapshot run** — that's fine.

## Hydration sequence for next session

1. **Read this handoff doc** (you're doing it).
2. **Read the data-integrity-tp skill files:** `~/.claude/skills/data-integrity-tp/SKILL.md`, `data-conventions.md`, `row-by-row.md`, `holdout-panels.md`, `rails-reference.md`.
3. **Read the live intent doc:** `docs/runway-data-integrity-intent.md` (operator-curated; ground truth for conventions).
4. **Operator briefs intent.** Confirm queue + which client first (default: Hopdoddy).
5. **Run snapshot for client #1** from worktree: `pnpm runway:snapshot --scope=hopdoddy`.
6. **Pull broad prod state via MCP** (one round-trip):
   - `get_data_health` (drift counters)
   - `get_clients(includeProjects=true)` (full client + project rows; informs cross-client awareness)
   - `get_team_members`, `get_pipeline`
7. **Code rails (write-bearing only):** read from `.worktrees/data-tp-runway/`:
   - `src/lib/db/runway-schema.ts`
   - `src/lib/runway/operations-utils.ts`
   - `src/lib/runway/operations-add.ts` (creates)
   - `src/lib/runway/operations-writes-week.ts`
   - `src/lib/runway/operations-writes-project.ts`
8. **Skip brain docs / archive memory.** Memory may be stale — verify any cited file path or helper behavior by grep before acting.

## Operator-locked queue with pre-flags

Pre-flags from prod state observed during the LPPC session — successor walks in with eyes open.

### 1. Hopdoddy (2 L1s, 0 L2s)

**`c323e450` Brand Refresh Website** (in-production, dates 4/30-4/30 — TODAY)
- 🟡 Notes: *"Design done, holding for launch\n\n[Legacy target: End of April — National Burger Day]"*
- **Status verification needed today.** Did it actually launch? If yes, flip to `completed`. If slipped, push dates and refresh notes.
- resources=`AM: Jill, CD: Lane, Dev: Leslie` ✓ clean

**`bc55c0b7` Digital Retainer (195 hrs)** (in-production)
- 🚩 **`engagementType=retainer` + `parentProjectId=null` = wrapper, but ZERO child L1s and ZERO L2s.** Either it's a real wrapper waiting for child workstreams, OR mislabeled (should be `engagementType=project`). Operator decision based on intent.
- 🟡 notes=`"Check with Jill"` (placeholder, needs real content)
- 🟡 resources=`null`
- contractStart=2026-01-01, contractEnd=2026-12-31 ✓

**Expected:** 3-5 cards. Brand Refresh status decision is the lead; Digital Retainer wrapper-vs-project is the structural call.

### 2. TAP (1 L1, 0 L2s)

**`3a9c9051` ERP Rebuild** (in-production, owner=Jason)
- 🚩 **`contractStart=null, contractEnd=null` despite contractTerm `"Mar 1 – Nov 30, 2026"`** — backfill needed. Both writable via `update_project_field`.
- resources=`PM: Jason, Dev: Tim` ✓
- 🟡 Notes call out phases: *"Discovery → SRD → DB Design → Dev (current) → Data Migration → Testing → Deployment → Training. Each phase blocked by predecessor."* — these are L2 territory. Operator decides: create one L2 per phase (timeline-trackable), OR keep notes-only as project-level scope.
- 🟡 owner=Jason (operator himself). Convention OK; just flag for awareness.

**Expected:** 2-4 cards. Contract date backfill (mechanical), then operator decision on phased L2 creation.

### 3. Soundly (3 L1s, 0 L2s)

**`cf4d6575` iFrame Provider Search** (status=completed, category=active)
- 🚩 **status/category MISMATCH** (same class as `35a75784` Website Blog Posts in LPPC).
- 🚩 **status=completed but notes contradict:** *"90% done, waiting on UHG iframe testing\n\n[Legacy target: Launch evening 4/21, live 4/22]"* — 90% is not completed. Either status is wrong OR notes are stale. Operator must clarify before any write.
- 🟡 contractStart=null, contractEnd=null
- resources=`AM: Jill, Dev: Leslie, Dev: Josefina, PM: Jason` ✓

**`8279d9eb` Payment Gateway Page** (in-production)
- 🟡 contractStart=null, contractEnd=null (despite Soundly contractTerm `"Sep 2025 – Aug 2026"`). All three Soundly projects have this gap — sweep candidate.
- notes=`"Under signed $30K SOW, through May 2026"` (sparse but informative)
- resources, dates ✓

**`54d65143` AARP Member Login + Landing Page** (in-production)
- 🟡 contractStart=null, contractEnd=null (same pattern)
- 🟡 Notes flag risk: *"HIGH PRIORITY: contractor bandwidth."* — Josefina is the contractor on resources; bandwidth concern is real. May warrant a tracking L2.
- dates 2026-04-17 → 2026-07-15 ✓

**🟡 Memory reference:** Possible NaN/NaN bug shipped on Soundly 2026-04-29 per memory feedback. Check `find_updates(clientSlug='soundly', since='2026-04-28')` to verify it was caught. If still in prod, fix.

**Expected:** 4-6 cards. iFrame status/category + status/reality reconciliation is the lead; contractStart/contractEnd backfill across all 3 is the mechanical sweep.

### 4. Convergix (its own session — pre-flags)

Last cleaned through Cluster 3 on 2026-04-26. Drift since:

**`86d94de276b94134bdd811ec5` "New Capacity ppt"** — landed via bot 2026-04-29T19:58 UTC outside any data-tp session.
- status=`not-started`, owner=`null`, resources=`Freelance` (free-text, no role prefix)
- dueDate=2026-05-06, parentProjectId=`null` (NOT linked to retainer wrapper)
- notes=`null`
- 🚩 **Almost certainly a duplicate** of `0c208308` "New Capacity (PPT, brochure, one-pager)" already nested under the retainer wrapper. Same client, similar name, similar deliverable scope.
- This is the duplicate-create class the Slack modal is being built to prevent.
- Triage: confirm dup with operator, then either delete `86d94de` or merge + parent-link to wrapper + role-tag the resources.

**Expected other drift** across 22 L1s: bare-name resources, stale notes referencing past dates, possible date-convention violations on L2s under wrapper children.

Convergix deserves its own session. Do not fold into the three-small batch.

## Open cross-client items rolling forward

Systemic, not client-specific. Successor should be aware:

1. **Empty-string normalization gap on `update_project_field` dueDate.** Confirmed via Kathy's 4/27 no-op write (`""` → `""` preserved). LPPC's `d7d7cc2f` was fixed individually (set to "2026-05-11"). Other clients likely have similar empty-string fields. **Pending fix:** Slack modal pre-plan Wave 0b includes empty-string-to-NULL normalization at write boundary — addresses future writes. Existing rows still need a sweep.

2. **Status/category mismatches.** Saw on `35a75784` Website Blog Posts (resolved this session) and `cf4d6575` iFrame Provider Search (next up in Soundly). Beyond Petro and EDF have similar drift. Slack modal Wave 0b adds a status/category compatibility validator that will reject future mismatches.

3. **Resources field format violations.** Bare names without role prefix (e.g., `"Freelance"` on Convergix's new ppt project). Convention: `Role: Person`. Slack modal Wave 0b adds role-tag-required validator at write boundary.

4. **Multi-day vs single-day shape conventions.** LPPC fully clean now. Other clients likely have the same pattern (multi-day with `date == startDate` instead of `date == endDate`, single-day with `endDate=null`). Mechanical sweep pattern from LPPC is reusable.

5. **`contractStart` / `contractEnd` null on retainer-period projects.** LPPC was a project-type contract; not affected. Soundly has 3/3 null contractStart/End despite signed term. TAP has null contractStart/End despite contract term. Pattern: retainer/project metadata wasn't backfilled when contracts signed. Cross-client backfill candidate.

6. **Wrapper-creation path is broken at the bot layer** (`engagementType`, `parentProjectId`, `contractStart`, `contractEnd` not in `create_project` enum). AG1 Social Content Trial wrapper still has null wrapper dates per intent doc — operator hasn't given dates yet (verbal SOW). Slack modal Wave 0a closes this.

## Skill patches pending (process flags from this session)

1. **Mechanical sweep scope expansion.** This session's sweep caught date-convention violations only. Missed semantic drift, surfaced post-hoc on LPPC's Pencils Down. Operator flagged for `data-conventions.md` / `row-by-row.md` patch. Until that patch lands, **before scoping each client's mechanical sweep, explicitly state the five categories being checked**:

   1. **Date conventions** (`date == endDate` on multi-day, `dayOfWeek` tracks `date`, single-day `endDate` filled, `weekOf == Monday(date)`)
   2. **Past-dated rows with non-terminal status** (anything with `date < today` and status ∉ {`completed`, `canceled`, `deferred`})
   3. **Resources missing role prefix** (any resources string without `Role: Person` shape — bare names, `Freelance`, etc.)
   4. **Stale single-day shape on active range work** (single-day row sitting on a range task that's still active — needs `endDate` widened, OR the task is actually done and status hasn't been flipped)
   5. **Task-dependent role labels** (e.g., Map Client Clarity Ping was tagged CW when the actual task — pinging the client — is AM work)

   If the sweep is scoped without naming these five, that's the LPPC-Pencils-Down failure mode repeating. Memory file: `feedback_sweep_scope_semantic_drift.md`. If the expanded scope holds across Hopdoddy/TAP/Soundly, fold into `row-by-row.md` § Verification at end so it's no longer memory-only.

2. **Verify-before-trust on prior batches.** Phase 3 batch on 2026-04-28 flipped Pencils Down to `completed` after Kathy's same-day note said it was deferred. Holdout panels weren't run. Pattern: when reviewing prior batch outcomes, audit against operator-stated intent, not just code-correctness.

3. **Cascade-safe recipe verified working.** Pencils Down 4/23→5/4 with category-flip recipe (deadline → delivery → date writes → deadline) produced `reverseCascaded: false` on every op AND verified post-write that parent project.dueDate stayed null. Recipe is canonical for any deadline-row date push.

## Process notes for the data-tp role

Reinforces the skill but came up enough this session to call out:

- **Set `set_batch_mode` BEFORE the first write of every session.** Operator caught Card 1 going through direct `update_week_item` instead of `batch_apply` — direct writes risk Slack leak even with batch mode active. Default to `batch_apply` for everything.
- **Reorder ops within a batch to avoid noisy cascades.** When deletes + status changes coexist, do deletes first so cascade fires on already-removed rows.
- **`weekOf` last** in any multi-field batch. The row's lookup key for prior ops is the original weekOf; only flip weekOf at the end.
- **Hot Sheet / Status Doc ground-truth pattern (per-client kickoff).** Operator's Hot Sheet caught Card 8 LPPC misclassification (Website Blog Posts as awaiting-client when truth was on-hold). Generalize: at every per-client kickoff, BEFORE proposing any delete, rename, status flip, or category change, ask the operator: *"Does this client have a Status Doc, Hot Sheet, or recent stakeholder note you can paste?"* If yes → wait for it before authorizing destructive writes. If no → flag any status/category/structural call as 🟡 medium-confidence at most, since prod state alone is insufficient ground truth on intent.
- **Decide-then-ask, not menu-then-decide.** Every card recco includes confidence + override condition, not "A or B?". Got this right by Card 3 onward; Card 8 was the misstep.
- **Cascade-safe recipe is canonical** for any deadline-row date write: flip category to delivery → write date/endDate → flip category back to deadline. Same batch_apply, sequential ops.

## Cohort tracking across the three small ones

Operator's framing on Hopdoddy/TAP/Soundly is **"test whether skill v2 holds across multiple clients in sequence before Convergix scale."** Treat the three as a cohort, not three independent passes. If the same drift category surfaces on 2+ of 3, that's a skill-patch signal — fold into `row-by-row.md` / `data-conventions.md` / `SKILL.md` before Convergix kicks off.

**Maintain a running count.** After each client closes, update this table inline (or in a fresh handoff if compacting). At Convergix kickoff, the table should read clearly which patches need to land first.

| Drift category | Hopdoddy | TAP | Soundly | Patch signal? |
|---|---|---|---|---|
| Date convention violations (multi-day shape, `weekOf`, etc.) | _ | _ | _ | already in skill |
| Past-dated non-terminal status | _ | _ | _ | patch candidate |
| Resources missing role prefix | _ | _ | _ | patch candidate |
| Stale single-day shape on active range work | _ | _ | _ | patch candidate |
| Task-dependent role label drift | _ | _ | _ | patch candidate |
| `contractStart` / `contractEnd` null on retainer-period | flag (none) | yes | yes (3/3) | already cross-client item #5 |
| Status/category mismatch | _ | _ | yes (`cf4d6575`) | already cross-client item #2 |
| Wrapper-or-project structural ambiguity | yes (`bc55c0b7`) | _ | _ | edge case, watch |
| Empty-string field at write boundary | _ | _ | _ | already cross-client item #1 |

**Threshold + timing:** **2-of-3 surfaces = skill patch lands at the close of whichever client triggers the threshold**, not held until pre-Convergix prep. If Hopdoddy + TAP both surface category X, the patch to `row-by-row.md` / `data-conventions.md` lands at TAP-close so Soundly runs the patched skill — and Soundly becomes the validation pass. If Hopdoddy + Soundly both surface (TAP didn't), patch at Soundly-close. Holding the patch until pre-Convergix wastes a data point and risks Soundly drifting in a way the patch would have caught.

1-of-3 stays in memory only. 3-of-3 = patch lands at whichever close hit threshold (likely TAP-close = 2-of-2 already triggered).

## Side reference: tickets filed elsewhere this session

Not data-tp swimlane:

1. **Multi-day row display-logic bug** — board renders multi-day L2s in two places (anchored on `startDate` AND in-flight active section). Routed to thought-partner. Successor: don't try to fix in data — it's a UI ticket.

2. **Slack modal pre-plan** at `.worktrees/runway-v3-cascade/docs/tmp/slack-modal-pre-plan.md`. Reviewed this session; flags filed (cascade trap on deadline creates, multi-day date=endDate enforcement on Modal 1, wrapper dates on insert verification, LLM termination fail-safe, title-collision soft-warn promotion). Modal lands → most data-tp queue items get hardened at the input layer.

3. **Gantt detector convention bug** — Gantt TP was anchoring `dayOfWeek`/`weekOf` checks against `startDate` instead of `date`. Reverified post-fix; reads clean.

## On re-engagement

1. Read this handoff doc.
2. Read `~/.claude/skills/data-integrity-tp/SKILL.md` + sub-files.
3. Read `docs/runway-data-integrity-intent.md`.
4. Operator briefs intent (confirm queue: Hopdoddy → TAP → Soundly → Convergix; confirm starting scope).
5. Run `pnpm runway:snapshot --scope=convergix` from `.worktrees/data-tp-runway/` (Hopdoddy + TAP + Soundly closed; Convergix is next per Session 2026-05-01 close section). For Convergix: ask operator for Hot Sheet + per-L1 status table BEFORE scoping (operator's one-pass pattern — see § Convergix prep).
6. Standard MCP pull: `get_data_health`, `get_clients(includeProjects=true)`, code rails for write-bearing scope.
7. **At per-client kickoff, ask operator for Status Doc / Hot Sheet** before any destructive proposal.
8. Surface findings to operator. Decide-then-ask. Row-by-row for judgment, mechanical sweep for convention.
9. **Before scoping the mechanical sweep**, name the five categories explicitly (date conventions + past-dated non-terminal status + resources missing role prefix + stale single-day shape + task-dependent role labels). If a category is intentionally out of scope, say why.
10. **Spot-verify between cards** with bounded MCP when downstream cards depend on prior writes. **Re-snapshot before the closing mechanical sweep** so it operates on post-row-by-row state.
11. **Update the cohort tracking table** after each client closes. If a category hits 2-of-N at any close, **patch the skill at that close** so the next cohort client runs the patched version. Don't hold patches for pre-Convergix prep.

Ready when you are.
