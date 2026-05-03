# Data Sanity Pass — Pre-Migration Verification

**When to run:** After PR #87 deploys and prod is serving PR #86 code. Before firing the migration from `docs/tmp/retainer-v4-cleanup-migration-spec.md`.

**Purpose:** Verify three things before touching data:
1. **Deploy freshness** — prod is running current code, not stale
2. **Pre-state match** — the 31 migration target records are in the state the spec expects
3. **No concurrent drift** — nothing new has happened on the board (Kathy, Jill, Allison) that would make the migration unsafe

If any check fails, STOP and resolve before running migration.

---

## Part 1 — Deploy freshness verification

### 1.1 In Flight toggle visible on prod

**Action:** Open https://runway.startround1.com/ in a browser. Hard-refresh (`Cmd+Shift+R`).

**Expected:**
- The "This Week" tab (default view, key=`triage` internally) shows:
  - Header: "Civilization Runway" + "This Week / By Account / Pipeline" tabs
  - Below the Flags rail (top right), a row with text "Showing in-flight L2s above Today." (or "In Flight hidden.") + a checkbox labeled "In Flight"
  - If any L2s match `status='in-progress' AND startDate ≤ today ≤ endDate`, an "In Flight" section renders ABOVE Today

**Failure modes:**
- No toggle row visible at all → prod deploy still stale. Check Vercel deployment status at https://vercel.com/hunt-gather-create/r1/deployments. Last merged commit should be df7cd0f's descendant (includes PR #87 fix merge).
- Toggle visible but section body never renders even when checked → could be intentional (no matching items) or could mean broken filter. Verify by checking `mcp__runway__get_week_items` returns at least one item with status=in-progress.

### 1.2 "Needs Update" section renders

**Expected:** Between the tabs header and the "Today" block, a "Needs Update" section appears if any L1 has not been touched in >7 days (or whatever the stale threshold is). May be absent if everything is fresh.

**Failure mode:** If the broader PR #86 UI isn't visible (no Needs Update, no toggle), same stale-deploy diagnosis as 1.1.

### 1.3 Quick MCP tool smoke test

Run against prod via loaded MCP tools:
- `mcp__runway__get_projects({ clientSlug: "convergix" })` — should return 15 projects with v4 fields populated in response (if deployed MCP returns new shape with `engagementType`, `contractStart`, etc., that confirms PR #86 MCP code is live)
- `mcp__runway__get_person_workload` (if available) — should return the bucketed v4 shape `{ownedProjects: {inProgress, awaitingClient, blocked, onHold, completed}, weekItems: {overdue, thisWeek, nextWeek, later}, flags: {contractExpired, retainerRenewalDue}}`

**If the response shape is pre-v4** (e.g. `get_projects` returns projects without `engagementType` field):
- The deployed MCP server is stale
- Fallback verification: run `git log --oneline upstream/runway | head -5` — PR #86 merge (commit `df7cd0f`) or more recent commit should be at top. If prod serves pre-v4 shapes despite commit being present, Vercel deploy is stale and hasn't rebuilt
- Remediation: same as 1.1 (Vercel deploy check, trigger redeploy)
- DO NOT proceed with migration until MCP returns v4 shape — the migration's verification steps depend on reading via MCP tools
- If MCP tool isn't available at all (404 / not registered), check `/api/mcp/runway` route is accessible and auth-bearer-token is set

---

## Part 2 — Pre-state verification (the 31 targets)

**Approach:** Run a read-only tsx script that queries each target record and compares to the spec's stated pre-migration state. Emit a JSON diff. Any mismatch = STOP.

**Script (CC can write this as a pre-flight, or operator runs this one from the worktree):**

```ts
// docs/tmp/sanity-pass-31-targets.ts (ephemeral, read-only)
// Queries all 31 migration targets against prod Turso
// Emits any mismatches vs the spec's stated pre-state
```

**What to check per target** (full list is in the migration spec):

### A. Retainer tier — expected pre-state

| Target | Field | Expected pre-state |
|---|---|---|
| Convergix 15 L1s | engagement_type | `project` on all 15 |
| Convergix 15 L1s | contract_start, contract_end | NULL on all 15 |
| Asprey `Social Retainer — Wind Down` | engagement_type | `retainer` (already set) |
| Asprey `Social Retainer — Wind Down` | contract_start | NULL |
| Asprey `Social Retainer — Wind Down` | contract_end | `2026-04-30` (already set) |
| Hopdoddy `Digital Retainer (195 hrs)` | engagement_type | NULL |
| Hopdoddy `Digital Retainer (195 hrs)` | contract_start, contract_end | NULL |
| Hopdoddy `Digital Retainer (195 hrs)` | owner | NULL |
| Hopdoddy `Brand Refresh Website` | owner | `Leslie` |
| Hopdoddy `Brand Refresh Website` | resources | NULL |
| Hopdoddy `Brand Refresh Website` | engagement_type | NULL |
| Soundly `Payment Gateway Page` | engagement_type | `retainer` |
| Soundly `Payment Gateway Page` | contract_end | `2026-05-31` |
| Soundly `Payment Gateway Page` | end_date | NULL |

### B. Convergix polish — expected pre-state

| Target | Field | Expected pre-state |
|---|---|---|
| `Events Page Updates (5 tradeshows)` | end_date | `2026-05-04` |
| `Corporate Collateral Updates` | end_date | `2026-04-30` |
| `Industry Vertical Campaigns` | end_date | `2026-04-30` |
| `Industry Vertical Campaigns` | waitingOn | NULL |
| `Brand Guide v2 (secondary palette)` | waitingOn | NULL |
| 6 L2 targets (status NULL) | status | NULL for all 6 |
| `CDS Creative Wrapper` | status, end_date | `in-progress`, NULL |
| `AIST tradeshow` | status, end_date | NULL, NULL |

### C. Soundly + Asprey v4 gaps — expected pre-state

| Target | Field | Expected pre-state |
|---|---|---|
| Soundly AARP | start_date, end_date | NULL, NULL |
| Asprey Daily Social Posts | end_date | NULL |

### D. LPPC — expected pre-state

| Target | Field | Expected pre-state |
|---|---|---|
| R3 Design Review L2 | end_date | NULL |
| Map Client Clarity Ping L2 | status | `blocked` |
| Map Client Clarity Ping L2 | notes | starts with "Client clarity resolved 4/21. Good to go." |
| 5 Website Revamp L2s + Interactive Map Launch L2 | status | `blocked` on all 6 |
| All 6 L2s above | updatedAt | `2026-04-20T23:06:*` (blanket-cleanup timestamp) — **NOT** >= 2026-04-21T14:00:00Z |

**Plus verify NO existing L2 with title:**
- `Interactive Map — Dev Revisions` under Interactive Map L1 (should not exist yet — creation in D.3)
- `Present Revised Map` under Interactive Map L1 (should not exist yet — creation in D.4)
- `Policy Materials Import (LPPC)` under Website Revamp L1 (should not exist yet — creation in D.5)

### Mismatch handling — playbook

If any pre-state doesn't match, apply the following decision tree:

**1. Identify the mismatch type:**
- **Field-level drift** (e.g., status changed, date updated) — someone touched the record after spec drafting
- **Unexpected value** (e.g., Convergix L1 already has engagement_type='retainer' somehow) — data was different than we thought when spec was drafted
- **Missing record** (a target record has been deleted) — rare but possible

**2. Check updatedAt to determine cause:**
- If `updatedAt > 2026-04-21T14:00:00Z` → concurrent user update → STOP, consult operator about Kathy/Jill/Allison's intent
- If `updatedAt < 2026-04-21T14:00:00Z` → spec was drafted with incorrect assumption → update the spec to match reality

**3. Decision:**
- **Option A — Update the spec:** Edit the migration-spec.md file to reflect the actual current state, re-run sanity pass to confirm, then proceed.
- **Option B — Skip this item:** If the mismatch makes the migration irrelevant for that record (e.g., someone already made the change we were planning), remove it from the migration's target set and proceed with the rest.
- **Option C — Abort entire migration:** Only if the mismatches are numerous or indicate broader data drift requiring full re-investigation.

**Default:** Option A or B — do NOT abort everything over one drift case.

**Always:**
- Document the mismatch in the sanity-pass-report
- Require operator approval before choosing any option
- If in doubt, STOP and ask rather than guessing

---

## Part 3 — Concurrent drift check

### 3.1 Drift scan on ALL 33 migration targets (not just LPPC)

**Action:** Query every migration target record — across all 6 clients (Convergix, Asprey, Hopdoddy, Soundly, LPPC, TAP) — and verify `updatedAt` is NOT newer than the spec's drafting timestamp.

**Spec drafting timestamp:** `2026-04-21T14:00:00Z` (the trust-preservation threshold)

**Scope:** All 33 targets listed in the migration spec's change list. Includes:
- 15 Convergix L1s (retainer flip targets)
- Convergix L1 end_date / waitingOn fixes (4 L1s)
- Convergix L2 status/endDate fixes (8 L2s)
- Asprey L1 (1) + L2 (1)
- Hopdoddy L1s (2)
- Soundly L1s (1)
- LPPC L1 + L2 updates (9 records)
- LPPC creations (3 new L2s — verify NOT existing yet)
- TAP L2 (1)

**If ANY migration target has `updatedAt > 2026-04-21T14:00:00Z`:**
- Someone (Kathy, Jill, Allison, or someone else) has touched it since the spec was drafted
- STOP. Do not apply.
- Pull the record's full current state
- Decide: does the migration still apply? Does their update change our intent? Consult operator.

**LPPC-specific addendum:** The pre-existing blanket-cleanup timestamp on 6 LPPC L2s (Pencils Down, Staging Links, Feedback Due, QA Phase, Website Launch, Interactive Map Launch) is `2026-04-20T23:06:*` — this is fine (pre-14:00 boundary). Only flag if they move PAST 2026-04-21T14:00:00Z.

### 3.2 Global "new L1 + L2" check

**Action:** Query BOTH `projects` (L1) AND `week_items` (L2) for records with `created_at > 2026-04-21T14:00:00Z`. Across any client.

**Expected:** Zero or very few (Kathy might create new items operationally — those are hers, leave alone).

**Review each new record:**
- Is it a duplicate of anything the migration would create (D.3, D.4, D.5)? If yes, skip the creation step — Kathy got there first.
- Is it on a client NOT in migration scope? Fine, leave alone.
- Is it a new L1 that should trigger additional migration coverage (e.g., a new Convergix L1 created after spec drafting)? Pause and consult operator.

### 3.3 Flag state snapshot

**Action:** Pull current flags via `mcp__runway__get_flags` (if available post-deploy) or compute by querying all L1s+L2s.

**Expected flag counts pre-migration** (verify these match current prod):
- `retainer-renewal-due`: **1** — Asprey `Social Retainer — Wind Down` should ALREADY be firing (already has engagement_type='retainer' + contract_end=2026-04-30, 9 days out, within 30-day threshold). Operator confirmed this is visible in the Soft Flags section of the live board. If it's NOT firing pre-migration, something's wrong with the board/deploy — investigate before proceeding.
- `contract-expired`: verify against live board (operator's screenshot showed "Contract expired: High Desert Law" in Soft Flags — 1 expected if HDL contract_end is past today)
- `past-end-l2`: multiple (4 per operator screenshot: TAP ERP Rebuild, LPPC R3 Design Review, LPPC Development Kickoff, Asprey Daily Social Posts)

**Post-migration flag expectations** (delta, not replacement):
- `retainer-renewal-due`: **count UNCHANGED** — Asprey already firing pre-migration, migration only adds `contract_start` which doesn't affect renewal logic. Verify count stays at the same number, doesn't increment.
- Convergix (contract_end=2026-07-31, 101 days out) — does NOT fire renewal flag. Verify Convergix NOT in the retainer-renewal-due pill list post-migration.
- Hopdoddy Digital Retainer (contract_end=2026-12-31, 254 days) — does NOT fire. Verify NOT in pill list.
- Soundly Payment Gateway — post-migration engagement_type='project' — does NOT fire renewal. Verify NOT in pill list.
- `past-end-l2`: should drop by 2 (Asprey Daily Social Posts + LPPC R3 Design Review via their new endDates). Plus 2 more (TAP ERP Rebuild + LPPC Development Kickoff) via their new endDates in spec sections D.13 + D.14. Total drop: 4. Expect past-end count to go to 0 (or near 0) post-migration.
- `contract-expired`: unchanged — migration does not touch HDL's contract state.

---

## Part 4 — Prod UI visual spot-check

### 4.1 "Today" block expectations

**Current date: 2026-04-21 (Tuesday)**

Expected "Today" cards on prod:
- **Soundly iFrame Provider Search — Evening Launch** (startDate=2026-04-21, category=LAUNCH — per operator's earlier screenshot)
- **LPPC Map Client Clarity Ping** (startDate=2026-04-21, category=APPROVAL — also in screenshot)

Any other L2 with startDate=2026-04-21 AND status NOT completed should appear.

**If additional Today cards appear that aren't expected:** note, but don't block — these could be valid new items.

### 4.2 "This Week" block expectations — PRE-migration only

Expected week columns visible (Mon 4/20, Thu 4/23, Fri 4/24) per operator's screenshot:
- Mon 4/20: TAP ERP Rebuild, LPPC R3 Design Review (KICKOFF, REVIEW)
- Thu 4/23: Convergix Fanuc Award Pre-Event Info Ask, Convergix CDS Creative Wrapper
- Fri 4/24: HDL Full Site Design, Convergix Big Win Template PPT

Verify each expected card is present. If any are missing, investigate before proceeding.

**DO NOT check for** LPPC `Interactive Map — Dev Revisions` or `Present Revised Map` pre-migration — those are spec section D.3 and D.4 CREATIONS, so they shouldn't exist yet. Seeing them pre-migration would indicate either Kathy created them herself (flag for operator) or a stale migration partially ran.

See "Post-migration verification" section below for what to check AFTER the migration applies.

### 4.2a Post-migration verification (run AFTER migration, not during sanity pass)

After migration apply succeeds, the following should appear:
- Fri 4/24: LPPC `Interactive Map — Dev Revisions` (Leslie in resources, startDate=4/22, endDate=4/24 — appears based on date bucket)
- Fri 4/24: LPPC `Present Revised Map` (Kathy-owned, startDate=4/24, single-day)
- Mon 4/27: LPPC `Policy Materials Import (LPPC)` (Kathy-owned, status=blocked, waitingOn=Matt per notes)

The In Flight section should populate with at minimum:
- Asprey Daily Social Posts + ManyChat (4/20–4/30 window, in-progress) — now includes today 4/21
- LPPC R3 Design Review (4/20–4/22, in-progress) — now includes today 4/21
- LPPC Development Kickoff (4/20–4/23, in-progress, via spec D.13 fix) — includes today
- TAP ERP Rebuild — Development (4/20–2026-08-15, in-progress, via spec D.14 fix) — long engagement

### 4.3 Flags rail — current state

Per operator's screenshot, 3 WARNING flags:
- Kathy has 32 deliverables in 10 days (across 2 clients: LPPC, Convergix)
- Jill has 8 deliverables in 10 days (across 4 clients: Soundly, Bonterra, High Desert Law, Hopdoddy)
- Daniel has 5 items in their inbox (across: Convergix)

Zero critical/red flags (expected — thresholds are stale≥30 days and past-end≥14 days).

**Post-migration prediction:**
- Same 3 WARNING flags (quantity may shift slightly due to status flips)
- 1 new WARNING or INFO: Asprey retainer-renewal-due (contract_end 4/30 in 9 days — threshold 30)
- 1 fewer implicit: Asprey Daily Social Posts past-end (if it was firing) should disappear

---

## Output of sanity pass

Produce a pre-migration report at `docs/tmp/sanity-pass-report-2026-04-21.md` with:
- ✅ or ❌ per check (Part 1, 2, 3, 4)
- Full JSON snapshot of all 31 pre-state records (for revert safety backup)
- Any concurrent-update findings (LPPC records modified after 14:00)
- Any unexpected data findings
- Final recommendation: GO or STOP

**Only if ALL Part 1, 2, 3 checks pass → operator approves → CC fires migration.**

---

## Tools CC should use for sanity pass

- `npx tsx` scripts for direct Turso reads (same pattern as migration scripts in `scripts/runway-migrations/`)
- `mcp__runway__*` MCP tools for higher-level reads once deploy is verified
- Drizzle Studio (`pnpm runway:studio`) for visual verification

---

## Estimated runtime

- Part 1 (deploy check): ~2 minutes (manual + 1 MCP call)
- Part 2 (31 target pre-state): ~30 seconds (one bulk query)
- Part 3 (drift check): ~20 seconds (one query)
- Part 4 (UI spot-check): ~3 minutes (visual)

Total: ~6 minutes wall-clock before we have GO/STOP.
