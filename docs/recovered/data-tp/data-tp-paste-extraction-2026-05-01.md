# Data TP scrollback paste — extraction notes

> **PATH NOTE (added 2026-05-01 ~19:30 post-rename):** Paths below referencing `_R1_RECOVERED/...` were captured before the rename to canonical `_R1/`. Read any `_R1_RECOVERED/path` as `_R1/path`. Audit trail preserved as-written for accuracy of the recovery timeline.

Created: 2026-05-01 ~17:35 PM CDT, by R1 TP during data loss recovery Track 3.

## Purpose

Operator is pasting data-tp Claude Code session scrollback (chunked or whole) into the R1 TP session. TP reads each chunk and writes durable extractions to this file BEFORE responding, so context-loss between paste cycles or compaction never erases progress.

## Context heading into Track 3

- `data-tp-handoff-2026-04-30.md` (30KB) already on disk at `_R1_RECOVERED/docs/tmp/data/`. This was the data-tp's own cross-session handoff — covers ~80% of state through 2026-04-30.
- `convergix-spec-2026-05-01.md` (16KB) already on disk at `_R1_RECOVERED/docs/recovered/data-tp-runway/docs/tmp/data/`. Convergix one-pass batch spec.
- Convergix retainer renewal triplet (forward + REVERT + verify) recovered to `_R1_RECOVERED/docs/recovered/data-tp-runway/scripts/runway-migrations/`.
- Many `runway-v3-cascade` Convergix audit files at `_R1_RECOVERED/docs/recovered/runway-v3-cascade/docs/tmp/data-integrity-audit/` (convergix-batch.ts, convergix-batch-plan.md, convergix-followup.ts, convergix-full-state.ts, convergix-kathy-replies.md, convergix-null-status-review.ts, convergix-post-verify.ts, convergix-reconciliation.md, convergix-task-meta-check.ts).
- Operator confirmed Convergix is the next batch to apply; HDL/AG1/Bonterra/LPPC/Soundly/Dave Asprey already closed.
- Operator skipped data-tp's QA-partner session — cross-checker only, no unique state.

## Open questions to answer from paste

1. What was the EXACT last action of data-tp #1 (Convergix) before the wipe? (handoff doc covers through 2026-04-30; wipe was 2026-05-01 08:38 AM)
2. Was there a "convergix-cards-2026-05-01" set of files that was about to be finalized? (operator referenced these as the imminent finalize step)
3. Round 1 DRY_RUN result, Round 2 dispatch state — what got reviewed, what's still pending operator approval
4. Any new operator decisions on Convergix L1 dispositions made in the live session that aren't in convergix-spec-2026-05-01.md
5. Any QA panel results from cross-checker that data-tp #1 acted on
6. Any blocking questions for stakeholders (Kathy?) that surfaced post-handoff-doc

## Paste log + extractions

(Added in real time as operator pastes; one section per paste chunk.)

---

## Paste 1 — Post-compaction Convergix work (2026-05-01 PM, last session before wipe)

### Where data-tp is RIGHT NOW (the gap to bridge)

**Round 1 of convergix-cards-2026-05-01 batch is mid-QA.** All 6 QA agents returned. The drafter has been instructed to re-dispatch with a patch spec for Round 2. Operator gave LOCK on 4 questions + 3 new context items (Convergix Retainer SOW, CDS scope TBD, Industrial/Battery confirm). NO APPLY HAPPENED YET.

**batchId**: `convergix-cards-2026-05-01` (preserved into Round 2)
**updatedBy**: `data-tp-2026-05-01` (preserved — no APPLY rotation needed since R1 didn't APPLY)
**Triplet path**: `.worktrees/data-tp-runway/scripts/runway-migrations/convergix-cards-2026-05-01{,-verify,-REVERT}.ts`
**Audit count**: ~104 (was 102, +1 cat flip + 1 cascade-duedate audit on A14)

### The 4 Round 2 patch fixes (must be in the next dispatch)

| # | Severity | Source | Issue | Fix |
|---|---|---|---|---|
| 1 | CRIT | Code-QA | D2 dayOfWeek="thursday" wrong — 5/8 is Friday | D2_DOW → "friday" (forward + verify + spec) |
| 2 | CRIT | Code-QA | D3 dayOfWeek="thursday" wrong — 5/8 is Friday | D3_DOW → "friday" |
| 3 | CRIT | Panel 5 + TP | A14 dueDate cascade guard mismatch — Industrial/Battery has existing deadline child 8f9cacca (date=7/31). Cascade fires same-value (safe), but drafter's "expect 0" guard would FAIL APPLY | Adjust A14 guard to expect 1 cascade item, document |
| 4 | CRIT | TP catch | A10 dueDate=null would corrupt L2 66414d4d "May Content Calendar Draft" deadline child (cascade clears its date) | Recipe: flip 66414d4d category deadline→delivery (skill-correct anyway — calendar draft is a delivery, not external deadline) BEFORE A10.dueDate=null write |

### Locked decisions (Q1-Q4 + new context A/B/C)

**Q1 — 5 orphan L2 chain:** Parent all 5 to AUTOMATE Booth Elements (#2 / 272e7eef). Confirmed via Convergix project tracker sheet. Snap "Deliver files" L2 from 5/17 → 5/15. b85f246 "Internal review for booth graphics" also → AUTOMATE Booth.

  Side-effect on planned +2 L2s under #2: keep "printer-due 5/18" milestone; DROP "booth schedule build placeholder" (now-parented chain covers active build work).

**Q2 — Rockwell Co-Marketing (#13) Nicole conv 4/28-29:** Default → B. L2 746b03b4 → status=completed, L1 stays awaiting-client. (Decision tree if signal: scope landed → A; slipped → C.)

**Q3 — Social Content monthly model:** A (keep 4 separate L1s — April/May/June/July). SOW confirms "12 pieces of content/month." Defer remodel until Slack modal lands.

**Q4 — Retainer renewal L2 (1859637a):** date=2026-05-25, dayOfWeek=monday, category=kickoff, status=scheduled, owner=Kathy, resources="AM: Kathy, PM: Jason".

**A — Convergix Retainer SOW (effective 2026-01-26):**
- wrapper 4171aa4d: contractStart=2026-02-01, contractEnd=2026-07-31, contractValue=$100,000
- client.contractValue=$100,000 (per skill v3: retainer ARR for retainer-client with outside SOWs)
- SOW EXCLUDES "Tradeshow design and booth production or fabrication" → AUTOMATE Booth (#2 / 272e7eef) is OUTSIDE retainer. If currently parent=wrapper, re-parent to standalone (parent=null + engagementType=project). If already standalone, leave.
- For all OTHER L1s: don't re-parent based on SOW scope inference. Surface anomalies in sweep.

**B — CDS Vertical (#11 / 0e4214c6):** Per 4/7 deck, case study + brochure scope still TBD. Keep dueDate=5/14 (data-tp pre-decided). Add notes: "Case study + brochure scope TBD per 4/7 deck; extend dueDate when those land." Smaller surface easier to extend than retract.

**C — Industrial/Battery (#16 / 95ba6a2f):** SOW confirms this is the 2nd of 2 vertical campaigns. dueDate=7/31 aligns with retainer end. Lock as drafted.

### Issues parked for sweep step (post-APPLY) — NOT in Round 2 patch

| Item | Decision |
|---|---|
| 3 historical L1s with NULL parent + retainer engagementType (Life Sciences Brochure, Social Media Templates, Organic Social Playbook) | Per "leave historical." Surface for confirmation post-APPLY |
| AISTech L2 9e432ae4 notes contain "???" placeholder | Sweep step (pre-existing import drift) |
| Big Win Template "Social Announcement Companion" notes drop (Kathy Q5b) | Sweep step (NIT-tier) |
| Fanuc Social Post f78857f3 endDate=null on single-day | Sweep step (single-day convention nit) |
| AUTOMATE post-batch endDate recomputes to 5/18 (vs 6/22 stored) | NO FIX. Per skill v3 § L1 dueDate: endDate auto-derives from L2 widths; dueDate=6/22 anchors event separately. Convention-consistent. |
| Past-dated non-terminal status sweep | Sweep step (operator triage post-APPLY) |

### Snapshot facts (at last hydration before wipe — fresh re-snapshot needed on resume)

- **22 L1s + 42 L2s + 0 pipeline**
- Wrapper 4171aa4d: clean (data-tp confirmed pre-batch state)
- 16 L1s under wrapper, 1 wrapper itself, 5 parentProjectId=null
- 6 orphan L2s (CRIT-2 cluster: b85f246 + 5 chain + Booth review)
- 1 L2 with field corruption (CRIT-1: f78857f3 has bot tool-call XML injected into weekOf — fix in batch: weekOf=2026-05-04, status=scheduled, category=delivery, dayOfWeek=thursday, resources="CW: Kathy, Dev: Leslie")
- Last update: 2026-05-01T04:31 UTC
- Heavy drift since 4/26: Kathy's status flips + Jill's 4/29 bot burst (6 orphans + new L1 86d94de + 2 date pushes)

### Cohort signals at Convergix close (3 patches likely land)

| Drift class | Hop | TAP | Sou | Cgx | Patch state |
|---|---|---|---|---|---|
| Status/category mismatch (was 1-of-3) | n | n | y | 6× | **Patch trigger** — promote to enforced sweep #8 |
| Bot-create burst orphans (NEW) | n/a | n/a | y (9) | y (6) | **2-of-2 → new sweep category #9** |
| Field corruption from bot XML injection (NEW) | n | n | n | y (1) | 1-of-4, tracked-only |
| Stale awaiting-client cat (drifted from real state) | n | n | n | y (Cert+CorpColl) | 1-of-4, tracked-only |

### What we have on disk (recovered)

- ✅ `convergix-spec-2026-05-01.md` (16KB) at `_R1_RECOVERED/docs/recovered/data-tp-runway/docs/tmp/data/` — FULL Round 1 spec the drafter worked from
- ✅ Convergix audit triplet recovered to `_R1_RECOVERED/docs/recovered/runway-v3-cascade/docs/tmp/data-integrity-audit/`: convergix-batch.ts (54KB — Wave 14 wrapper-create work, NOT cards-2026-05-01), convergix-batch-plan.md, convergix-followup.ts, convergix-full-state.ts, convergix-kathy-replies.md, convergix-null-status-review.ts, convergix-post-verify.ts, convergix-reconciliation.md, convergix-task-meta-check.ts
- ✅ Convergix retainer renewal triplet (4/26): convergix-retainer-renewal-task-2026-04-26.ts + REVERT + verify (recovered to data-tp-runway/runway-migrations/)
- ✅ data-tp-handoff-2026-04-30.md (30KB cross-session handoff)
- ⚠️ **MINOR GAP: convergix-cards-2026-05-01.ts + verify + REVERT (Round 1 triplet code) NOT recovered.** Was drafted by a worktree-isolated subagent during the live data-tp session; subagent transcripts not in any session JSONL we scanned. **NOT a blocker:** the `.md` spec is the INPUT to the drafter agent; the `.ts` is the OUTPUT. Spec → triplet is reproducible. Net loss = ~17 min of drafter agent runtime. Round 2 path: update the recovered spec to incorporate the 4 fixes (D2/D3 dayOfWeek, A14 cascade guard, A10 cat-flip recipe), re-dispatch drafter, get fresh triplet, Round 2 DRY_RUN, 1-panel re-QA on Cascade Integrity, APPLY.
- ❌ Convergix project tracker sheet content (Q1 source-of-truth for orphan parenting) was a Google Sheet operator pasted; data-tp pulled from it but the raw sheet content isn't on disk. Not blocking — Q1 already locked.

### Resume notes for data-tp (next session)

When data-tp is re-engaged:
1. Symlink `.env.local` to `_R1/.env.local` (NOT a copy — STEP 0 of skill, prevents SQLite trap)
2. Verify recovered files in proper paths (`docs/recovered/data-tp-runway/...` → `.worktrees/data-tp-runway/...` after worktree creation)
3. Re-snapshot Convergix prod IN FULL (data has continued to drift since the wipe; old snapshot stale)
4. Compare fresh snapshot to the locked decisions in this doc — flag any new drift since 2026-05-01T04:31 UTC
5. Re-draft convergix-cards-2026-05-01 triplet from `convergix-spec-2026-05-01.md` + apply the 4 Round 2 fixes documented above
6. Run Round 2 DRY_RUN + 1-panel re-QA on Cascade Integrity (per data-tp's own halt-state plan)
7. Then APPLY when operator approves

---

## State going into Paste 2 (snapshot of what we know now)

- Convergix workstream was the LAST workstream data-tp was on (HDL/AG1/Bonterra/LPPC/Soundly/Dave Asprey already closed)
- Round 1 batch QA complete; Round 2 patch dispatch was the next move when wipe hit
- 4 critical fixes documented above
- Locked decisions Q1-Q4 + new context A/B/C documented above
- Spec doc `convergix-spec-2026-05-01.md` recovered; Round 1 triplet code unrecovered but reproducible from spec
- Cohort patch trigger: 3 likely sweep-rule patches at Convergix close (status/cat #8, bot-burst orphans #9, field corruption #10)
- Paste 2 will fill in: how data-tp arrived at this state across HDL/AG1/Bonterra/LPPC/Soundly/Dave Asprey arc — the broader pattern library, skill-evolution moments, operator preferences, prior cohort findings, etc.

---

## Paste 2 — Pre-compaction larger history (HDL/AG1/Bonterra/LPPC/Hopdoddy/TAP/Soundly/Dave Asprey arc)

### Methodology note

Paste 2 is 100,632 lines / 9.9MB but ~80% duplicated content (terminal scrollback re-renders across 47 compactions). Read incrementally: targeted greps + sample reads of high-density sections.

### CRITICAL DISCOVERY — skill files survived the wipe

`~/.claude/skills/data-integrity-tp/` is OUTSIDE `_R1/` — escaped the wipe. Files present with current mtimes:

| File | mtime | Notes |
|---|---|---|
| `data-conventions.md` | Apr 30 23:38 | **Post-Soundly close patches landed** |
| `row-by-row.md` | Apr 30 20:35 | **Post-Soundly close patches landed** |
| `SKILL.md` | Apr 29 08:41 | Stable since LPPC handoff doc work |
| `drafter-prompt.md` | Apr 28 12:05 | Stable |
| `holdout-panels.md` | Apr 28 12:05 | Stable |
| `rails-reference.md` | Apr 28 12:05 | Stable |

**Implication: the "skill v3 + 4 post-Soundly patches" referenced in the recap are already on disk.** We don't need to extract them from scrollback. data-tp re-engagement reads them directly via skill auto-load on `/data-integrity-tp` invocation.

### Cohort tracking framework (extracted from line ~42500-42800 of scrollback)

Operator's framing: "test whether skill v2 holds across multiple clients in sequence before Convergix scale." The 3 small clients (Hopdoddy, TAP, Soundly) were a cohort to validate skill v2.

**Cohort tracking table** (lives in `data-tp-handoff-2026-04-30.md` — recovered):

| Drift category | Hopdoddy | TAP | Soundly | Patch signal? |
|---|---|---|---|---|
| Date convention violations (multi-day shape, weekOf, etc.) | _ | _ | _ | already in skill |
| Past-dated non-terminal status | _ | _ | _ | patch candidate |
| Resources missing role prefix | _ | _ | _ | patch candidate |
| Stale single-day shape on active range work | _ | _ | _ | patch candidate |
| Task-dependent role label drift | _ | _ | _ | patch candidate |
| contractStart/contractEnd null on retainer-period | flag (none) | yes | yes (3/3) | already cross-client item #5 |
| Status/category mismatch | _ | _ | yes (cf4d6575) | already cross-client item #2 |
| Wrapper-or-project structural ambiguity | yes (bc55c0b7) | _ | _ | edge case, watch |
| Empty-string field at write boundary | _ | _ | _ | already cross-client item #1 |

**Patch threshold + timing rule:**
- 2-of-3 surfaces = skill patch lands at the close of WHICHEVER client triggers the threshold (NOT held until pre-Convergix prep)
- 1-of-3 stays in memory only
- 3-of-3 = patch at whichever close hit threshold (likely TAP-close = 2-of-2 already triggered)
- Soundly post-close had "4 skill patches landed" per the post-compact recap → those are now reflected in the on-disk `data-conventions.md` + `row-by-row.md` updates from Apr 30 evening

### The 5 sweep categories (mandatory naming before mechanical sweep scope)

When data-tp scopes a mechanical sweep at end of any client pass, must explicitly state:
1. **Date conventions** (date == endDate on multi-day, dayOfWeek tracks date, single-day endDate filled, weekOf == Monday(date))
2. **Past-dated rows with non-terminal status** (date < today AND status ∉ {completed, canceled, deferred})
3. **Resources missing role prefix** (any resources string without "Role: Person" shape — bare names, "Freelance", etc.)
4. **Stale single-day shape on active range work** (single-day row sitting on a range task that's still active — needs endDate widened OR status flipped)
5. **Task-dependent role labels** (e.g., Map Client Clarity Ping was tagged CW when the actual task — pinging the client — is AM work)

Skipping any of these = LPPC-Pencils-Down failure mode repeating. Memory file: `feedback_sweep_scope_semantic_drift.md` (already on disk in user memory).

### Mid-pass staleness rule

The on-disk snapshot is fresh at start-of-pass, NOT through the full pass. After Card N writes to prod, any Card N+M depending on those rows reads stale snapshot state. Two patterns:
- **Spot-verify between cards**: bounded MCP `get_week_items({clientSlug:'X'})` or `get_client_detail({slug:'X'})` between cards when downstream depends on prior writes
- **Re-snapshot mid-pass**: `pnpm runway:snapshot --scope=X` again before the closing mechanical sweep

**Default**: spot-verify between cards, re-snapshot before the closing mechanical sweep so it operates on post-row-by-row state.

### Hot Sheet / Status Doc pattern (at every per-client kickoff)

Before any delete, rename, status flip, or category change on a client, ask the operator: *"Does this client have a Status Doc, Hot Sheet, or recent stakeholder note you can paste?"* If yes → wait for it before authorizing destructive writes. If no → flag any status/category/structural call as 🟡 medium-confidence at most. Reason: prod state alone is insufficient ground truth on intent.

Caught Card 8 LPPC misclassification (Website Blog Posts as awaiting-client when truth was on-hold) — generalized into a per-client kickoff discipline.

### Decide-then-ask pattern (operator preference, locked since LPPC Card 3)

Every operator-facing question is recco + confidence + reason + override condition. NOT an option menu. Apply logic first, ask for override second.

### Cascade-safe recipe (canonical for any deadline-row date write)

For any L2 with category=deadline that needs date/endDate written:
1. Flip category deadline → delivery
2. Write date/endDate
3. Flip category back to deadline

Same `batch_apply`, sequential ops. Verified working on LPPC Pencils Down 4/23→5/4 with `reverseCascaded: false` on every op AND post-write that parent project.dueDate stayed null.

### Process notes (locked through the arc)

- **Set `set_batch_mode` BEFORE the first write of every session.** Even with batch mode active, direct `update_week_item` risks Slack leak — default to `batch_apply` for everything.
- **Reorder ops within a batch to avoid noisy cascades.** Deletes first if mixed with status changes.
- **`weekOf` last** in any multi-field batch (lookup key before the flip).

### Per-client closure log (from grepped recaps)

| Client | Status | Ops applied | Notes |
|---|---|---|---|
| HDL | Closed pre-arc (assumed clean) | — | Per operator's session-open instruction |
| AG1 | Closed pre-arc (assumed clean) | — | Per operator's session-open instruction |
| Bonterra | Closed pre-arc (assumed clean) | — | Per operator's session-open instruction |
| Beyond Petrochemicals | Closed pre-arc | — | Mentioned in audit log scope |
| LPPC | Closed 2026-04-29 evening | 24+ rows row-by-row + sweep | First in arc; surfaced 5-category sweep gap. Snapshot at `docs/tmp/data/lppc-snapshot.json` (recovered) |
| Hopdoddy | Closed clean | 15 ops | First of 3 small cohort. Per recap |
| TAP | Closed clean | (count not extracted) | 2nd of 3 small cohort |
| Soundly | Closed clean 2026-04-30 evening | 113 ops + 4 skill patches landed | LAST close before Convergix. Patches in on-disk skill files |
| Dave Asprey | Closed pre-arc | — | Referenced as precedent for [Legacy target: ...] notes pattern |
| Convergix | **MID-BATCH AT WIPE** | 0 (no APPLY) | Round 1 QA done; Round 2 patch dispatch was next move (Paste 1 detail) |

### What's already on disk

- `_R1_RECOVERED/docs/tmp/data/data-tp-handoff-2026-04-30.md` (30KB) — pre-Soundly handoff (LPPC closure + cohort framework + 5 sweep categories + Hot Sheet pattern + on-re-engagement steps 1-11)
- `~/.claude/skills/data-integrity-tp/{SKILL.md, data-conventions.md, row-by-row.md, drafter-prompt.md, holdout-panels.md, rails-reference.md}` (in user home, untouched by wipe; data-conventions + row-by-row are post-Soundly patched)
- `_R1_RECOVERED/docs/recovered/data-tp-runway/scripts/runway-migrations/`: Convergix retainer renewal triplet (4/26)
- `_R1_RECOVERED/docs/recovered/data-tp-runway/docs/tmp/data/convergix-spec-2026-05-01.md` (16KB) — Round 1 spec
- `_R1_RECOVERED/docs/recovered/data-tp-runway/docs/tmp/runway-slack-modal-spec.md`
- `_R1_RECOVERED/docs/recovered/data-tp-runway/docs/brain/` (rehydrate docs)
- `_R1_RECOVERED/docs/recovered/runway-v3-cascade/docs/tmp/data-integrity-audit/` (Convergix audit triplet from Apr 24-28 work)

### What's NOT on disk (genuine gaps)

- Soundly snapshot file (would have been at `_R1/docs/tmp/data/soundly-snapshot.json`) — referenced in compact summary; not in any session JSONL we scanned. **NOT BLOCKING** because Soundly is closed and we don't need to re-do that work.
- `convergix-cards-2026-05-01.ts` Round 1 triplet code — drafted by worktree-isolated subagent, transcript not on disk. **Reproducible from spec doc.**

### Bottom line for data-tp re-engagement

The recovery picture is much better than expected:
1. Skill files (state-of-the-art post-Soundly) intact
2. Handoff doc with cohort framework intact
3. Convergix Round 1 spec intact
4. Convergix retainer renewal triplet (precedent for similar batch shape) intact
5. The 4 Round 2 fixes documented (in this file's Paste 1 section above)

data-tp can re-engage with full continuity by:
1. Reading the on-disk skill files (auto-loaded on `/data-integrity-tp` invocation)
2. Reading `data-tp-handoff-2026-04-30.md`
3. Reading `convergix-spec-2026-05-01.md`
4. Reading THIS extraction file (Paste 1 section, especially "The 4 Round 2 patch fixes")
5. Re-snapshotting Convergix prod (data has drifted since 2026-05-01T04:31 UTC)
6. Re-drafting the Round 2 triplet with fixes incorporated
7. Standard pipeline (DRY_RUN → Cascade-Integrity re-QA → APPLY → verify → sweep)

(Paste 2 parsing complete. The bulk of the scrollback was duplicate. Key findings extracted; raw scrollback file remains on disk for reference if needed.)

---

## Post-rename gap surfaced 2026-05-01 ~19:35 (data-tp's queued response)

### Verifications data-tp ran (all PASS)

- Worktree at `~/Documents/_AI_/_R1/.worktrees/data-tp-runway`, cwd resolves
- `.env.local` symlink intact (`-> ../../.env.local`, target 2972 bytes, 4 RUNWAY_* vars)
- `convergix-spec-2026-05-01.md` present in `docs/tmp/data/`
- `git status` clean on `feature/data-tp-cluster3` (post-repair pointers all good)
- Untracked files match recovered set (4/26 retainer renewal triplet + Hopdoddy verify)

### NEW gap data-tp identified: snapshot infrastructure missing

`pnpm runway:snapshot --scope=convergix` → `Command "runway:snapshot" not found`. Both pieces lost in wipe and never made it to `upstream/runway`:

1. `scripts/runway-snapshot.ts` (the snapshot script — ~50 LOC, queries drizzle and writes JSON to `docs/tmp/data/<scope>-snapshot.json`)
2. The `runway:snapshot` entry in `package.json`

Recovery prompt did NOT flag this — it was a TP-CC-built tool created sometime in the data-tp arc, never committed upstream.

### data-tp's decision ask (operator call)

| Option | What it is | Cost | Tradeoff |
|---|---|---|---|
| A | Re-create `scripts/runway-snapshot.ts` + add `runway:snapshot` entry | ~50 LOC, reproducible from drizzle query pattern | Adds new code; needs verify before use |
| B | Skip script, use bounded MCP pulls only (`get_client_detail` + `get_week_items` + `get_orphan_week_items` for convergix) | Zero new code | Data lives in conversation only (no disk artifact unless we write it manually); slightly lossier without batch/audit metadata |

data-tp's recco: **B for this round.** Lower blast radius. Re-create snapshot script as follow-up after Convergix closes if you want it back in tooling.

### TP read (R1 fresh-context post-compact)

Endorsing B with a small modification: have data-tp consolidate the bounded MCP output to a single JSON at `docs/tmp/data/convergix-snapshot-2026-05-01-r2.json` so we have a disk artifact for the round 2 diff + audit trail. Same blast radius (no new code), keeps persistence-as-we-go discipline intact.

### Halted state

data-tp halted "awaiting your call" — has NOT pulled fresh prod state, has NOT begun re-snapshot. Standing by until operator picks A/B and TP relays back.

