# Data-integrity TP response to primary TP — 2026-04-23

**Docs reviewed:**
- `docs/tmp/cc2-clean-prompt-2026-04-22.md` (authoritative CC #2 prompt)
- `docs/tmp/cc2-data-writes-inventory-2026-04-22.md` (for external TP review)
- `docs/brain/tp-cc1-plan-review-2026-04-22.md` (CC #1 decisions record)
- `docs/brain/tp-handoff-2026-04-22-post-cc1-cc2.md` (post-compaction handoff)

**Written against fresh prod snapshot pulled 2026-04-23T15:19:06 UTC** (see `wrapper-state-audit.md` for facts).

---

## Headline

**CC #2 authoritative prompt: close to shippable.** 3 tightening asks below; none are structural. The plan-mode handling, post-code pipeline, test-db.ts mandate, migration-scaffolds-cut, MCP path correction, rebase-first ordering — all aligned with my independent review.

**Data-writes inventory: needs refresh.** The document was written against a pre-Kathy-cleanup snapshot (2026-04-22 pre-22:45 UTC). Prod has moved since then. Three of the four "open decisions for external TP" were resolved by operator during the 2026-04-22/23 sessions while this TP session was in prep. Listing them as open risks re-litigating locked calls.

**CC #1 review doc + handoff: no objections.** Δ1-Δ4 decisions are consistent with my CC #1 review. Keep them.

---

## Stale facts in data-writes inventory (Part B Change 1)

Fresh prod (2026-04-23 15:19 UTC):

| Inventory claims | Prod reality | Status |
|---|---|---|
| "Convergix has 16 retainer-type L1s" | **20 retainers** (17 active + 3 historical completions) | Stale |
| Table lists `Social Content (12 posts/mo)` | Renamed to `Social Content — April 2026` (Kathy cleanup 2026-04-22) | Stale |
| Table lists `Brand Guide v2 (secondary palette)` | Renamed to `Brand Guide v2` (palette dropped per Kathy) | Stale |
| Table lists `Industry Vertical Campaigns` | Renamed to `CDS Vertical Campaign` (Kathy cleanup split this into CDS + Industrial/Battery Assembly) | Stale |
| Table missing | `Social Content — May 2026` (new L1) | Missing |
| Table missing | `Social Content — June 2026` (new L1) | Missing |
| Table missing | `Social Content — July 2026` (new L1) | Missing |
| Table missing | `Industrial/Battery Assembly Campaign` (new L1) | Missing |

The 3 completed L1s (Life Sciences Brochure, Social Media Templates, Organic Social Playbook) are still in prod unchanged. They stay unparented per operator directive (see Resolved Decisions below).

**Canonical 17 active Convergix L1s to nest (verified fresh snapshot 2026-04-23):** see `wrapper-state-audit.md` for the full table with IDs + statuses.

---

## Resolved decisions — strike from "open" list

Inventory's "Open decisions for external TP" (Part B Change 1):

**Decision 1 — "Include the 3 completed L1s under the wrapper?"** — **RESOLVED 2026-04-22.** Operator directive to me during Kathy cleanup session: "we are not doing legacy projects from the past, please don't build those." The 3 historical completions stay unparented. Nest only the 17 active L1s. See `pending-decisions.md` Resolved section.

**Decision 2 — "Children retain duplicated `contract_start`/`contract_end`?"** — **RESOLVED 2026-04-23.** Keep duplicated per operator + TP convention: "safer if wrapper gets deleted/reparented later." Children carry contract metadata directly so they render correctly in isolation (e.g., Week view). Redundant with wrapper's, but intentional for query efficiency. See `pending-decisions.md` Resolved section.

**Decision 3 — "Wrapper status = 'in-production' while some children are completed/blocked — OK?"** — **RESOLVED.** Not a decision, a sanity check. Confirmed: wrapper status reflects the contract relationship, not children's aggregate. Locked as `status="in-production"` until operator manually flips to `completed` after contract_end + wrap-up work done. `detectWrapperCloseOut` (CC #1 Item 4B in my review) surfaces the nudge.

**Decision 4 — "Wrapper category / resources / sort_order?"** — **PARTIALLY RESOLVED.** Locked per `project_convergix_cleanup_applied.md`:
- `category: "active"` — locked.
- `resources: NULL` — locked (team stays on client per operator directive; wrapper rendering pulls from client team if helpful).
- `sort_order: TBD` — genuinely open. My recco: default to `0` or a low value so the wrapper renders at the top of the Convergix section. Operator sign-off.

**New decision I'm flagging** (not in TP's list): **Wrapper `startDate` / `endDate` at creation time.** Original locked metadata said "let recompute populate from children." CC #2's Task 4 recompute guard freezes wrapper dates when it has children, so auto-populate can't happen. Revised: set `startDate="2026-02-01"` and `endDate="2026-07-31"` explicitly at creation. UI renders wrapper with visible contract-window timeline. Full rationale in `wrapper-state-audit.md`. Operator sign-off requested.

---

## Wrapper metadata correction in inventory

TP's inventory Part B Change 1 proposes:

```
name: "Convergix Retainer 2026-02-01 - 2026-07-31"
```

**Should be:**

```
name: "Convergix Retainer"
```

Dates belong in `contractStart`/`contractEnd` fields, not the name. The locked metadata table (in `project_convergix_cleanup_applied.md`) has always said `name: "Convergix Retainer"`. Putting dates in the name creates rename churn every time the contract rolls (2H 2026 would need a new wrapper per the SOW pattern, not a rename). Keep the name stable.

**Also missing from Change 1 scope:** the **retainer-renewal Task** on the wrapper. Per locked metadata:
- Title: "2H retainer conversation with Daniel" (or operator wordsmith)
- `projectId = <wrapper.id>`, `clientId = convergix`
- `startDate = 2026-05-25`, `endDate = 2026-05-25`, `weekOf = 2026-05-25`, `dayOfWeek = "monday"`
- `status = "scheduled"`, `owner = "Kathy"`, `resources = "Kathy"`, `category = "kickoff"` (or "deadline" — operator call)

This L2 anchors the retainer-renewal flag detection for 2026-05-25.

---

## Framing correction — "who drives the writes"

Inventory Part B says: *"Operator drives these via direct MCP or one-off scripts, post-merge of both branches."*

CC #2 prompt says: *"No migration runs in this PR. Future data work (Convergix wrapper creation, scheduled-status backfill) drives separately via MCP direct."*

Per operator directive 2026-04-23 (memory `feedback_no_migrations_by_cc.md`):
> "All prod data writes go through the data-integrity TP session. Not CCs. Not one-off operator-written scripts outside a TP session."

Correct framing: **data-integrity TP (me) drives the writes**, using the MCP tools CC #2 builds + drizzle-typed inserts where appropriate, under batch-hygiene rails in `docs/tmp/data-integrity-audit/`. Operator approves per-operation; I execute.

Nothing to change in the CC #2 prompt (it correctly tells CC "not your problem"). The inventory doc's framing should be updated so downstream readers don't assume operator is running migrations directly.

---

## Change 2 (scheduled-status backfill) — per-row, not blanket

Inventory Part B Change 2 proposes blanket backfill of ~20 qualifying NULL-status L2s with a filter (start_date >= today, skip completed/cancelled parents, skip multi-day spanning today).

Fresh snapshot: **17 NULL-status L2s** (LPPC 10, Bonterra 3, Dave Asprey 2, Soundly 1, Hopdoddy 1; Convergix is 0 post-Kathy-cleanup).

**My position (aligned with Phase 3 planning in `next-phases.md`):** per-row reasoning, not blanket. Reasons:

1. **Blanket filter loses signal.** Some past-dated NULL rows still matter (delivered but status never flipped). Blanket `start_date >= today` skips them; they remain NULL forever.
2. **Operator directive 2026-04-22:** per-row reasoning deferred to Phase 3 writes with data-integrity TP owning the per-row call when Kathy/team replies land.
3. **Workflow:** Phase 3 question doc went to Kathy 2026-04-22. Replies drive per-row decisions. Blanket doesn't wait for replies.
4. **Small volume:** 17 rows across 5 clients. Per-row is not expensive; blanket isn't saving meaningful effort.

**Recommendation:** drop Change 2 from the inventory doc. Or reframe as "Phase 3 per-row backfill, data-integrity TP owns, blocked on Kathy replies." Do not frame as a single-batch blanket operation.

---

## Tightening asks for CC #2 prompt

Three items from my CC #2 review that TP captured partially but not fully:

### 1. `parentProjectId` validation — add same-client check

CC #2 prompt Task 5 Commit 11 lists `parentProjectId` validation as:
- parent exists
- parent engagementType="retainer"
- no cycle via 10-hop walk

**Add:** parent and child must share the same `client_id`. Without this, someone could nest a Convergix L1 under the Dave Asprey wrapper (if Dave Asprey had children) by mistake, corrupting retainer hierarchy. Same check applies to `set_project_parent` (Task 5 Commit 13).

### 2. `override_project_date` idempotency key

CC #2 prompt Task 5 Commit 13 says `override_project_date` writes audit with `update_type = "date-override"`. It doesn't specify the idempotency key composition.

**Add:** idempotency key MUST be derived from `(projectId, field, oldValue, newValue)`, not just `newValue`. Per `feedback_revert_idempotency_poisoning` memory: revert + retry on same key poisons. Include oldValue → each revert produces a distinct key.

Also: **audit row must include both `oldValue` and `newValue`** so reverts are straightforward.

### 3. `contractStart` / `contractEnd` regex → real date validation

CC #2 prompt Task 5 Commit 11 says contract date fields take "ISO YYYY-MM-DD regex." Shape-only regex accepts "2026-13-45."

**Change:** validate with real ISO parse + roundtrip: `const d = new Date(val); d.toISOString().slice(0,10) === val`. Optional: enforce `contractStart < contractEnd` at tool boundary.

None of these are structural to the prompt; they're Zod/validator internals. CC can fold them in during plan mode.

---

## No objections to CC #1 review doc

I've independently reviewed CC #1 per `cc1-review.md` in the data-integrity audit directory. My review is consistent with TP's decisions (Δ1-Δ4, phase B step 3, blocked split, owned files adjustment).

**Additional items I asked ride on CC #1** (per operator directive, cluster labeled Item 4 in `cc1-review.md`):
- **4A:** By Account view — strip prices, wrapper-as-umbrella render, standalone-project marker.
- **4B:** New detector `detectWrapperCloseOut` — wrapper past contract_end + in-production surfaces a "Needs Update" nudge.
- **4C:** `get_retainer_team` helper + MCP tool (spec in `get-retainer-team-spec.md`).

If TP's authoritative CC #1 prompt doesn't include 4A-4C, they need to be added before CC #1 fires. Same operator directive that cut migration scaffolds from CC #2 added these to CC #1.

---

## My execution plan — after both CCs merge

Per cluster analysis in `wrapper-state-audit.md`:

**After CC #1 merges (Gates A + B live):**
- Cluster 2: create wrapper (~1 audit row) + nest 17 active Convergix L1s (~17 audit rows) under `batch_id = "convergix-wrapper-create-2026-XX-XX"`, unique `updated_by`.
- Safe without CC #2's recompute guard because project creation + `parentProjectId` updates don't trigger recompute on the wrapper itself.
- Post-verify: `pnpm runway:check-orphans` (CC #2 ships this — defer verify if not live yet).

**After CC #2 merges (Gate C also live):**
- Cluster 3: add retainer-renewal Task on wrapper under `batch_id = "convergix-wrapper-renewal-task-2026-XX-XX"` (~1 audit row).
- Needs guard to prevent recompute from collapsing wrapper dates to the single Task date.

**Phase 3 (blocked on Kathy replies):**
- Per-row backfill of 17 non-Convergix NULL L2s. Owned by me. Each row gets a specific status (scheduled, in-progress, blocked, at-risk, completed) with reasoning from hot-sheet + Kathy reply.

All three batches execute via tsx scripts in `docs/tmp/data-integrity-audit/` with DRY_RUN → 2-pass fresh-context QA → APPLY → post-verify. Per `/data-integrity` skill rails.

---

## Concrete edits TP should make

**To `docs/tmp/cc2-data-writes-inventory-2026-04-22.md`:**

1. Refresh Change 1 against fresh prod (20 retainers, updated names, 17 active + 3 historical).
2. Fix wrapper `name` to "Convergix Retainer" (no dates in name).
3. Add retainer-renewal Task to Change 1 scope.
4. Strike Decisions 1, 2, 3 from "Open decisions" — they're resolved. Move to a "Resolved decisions" section citing `pending-decisions.md`.
5. Narrow Decision 4 to just `sort_order` (category + resources are locked).
6. Add new decision: wrapper `startDate` / `endDate` at creation = contract window (explicit).
7. Reframe "who drives the writes" from "operator via MCP" to "data-integrity TP via MCP tools + drizzle typed inserts under batch-hygiene rails."
8. Drop Change 2 (blanket backfill) or reframe as "Phase 3 per-row, blocked on Kathy replies, data-integrity TP owns."

**To `docs/tmp/cc2-clean-prompt-2026-04-22.md`:**

1. Task 5 Commit 11 `parentProjectId` validation — add "parent and child share `client_id`."
2. Task 5 Commit 13 `set_project_parent` validation — same client_id check.
3. Task 5 Commit 13 `override_project_date` — idempotency key from `(projectId, field, oldValue, newValue)`; audit row includes `oldValue` + `newValue`.
4. Task 5 Commit 11 `contractStart` / `contractEnd` — real ISO date parse + roundtrip validation, not shape regex.

**To `docs/brain/tp-handoff-2026-04-22-post-cc1-cc2.md` (optional):**

Update "Open questions awaiting answers" → "External TP review" section with "resolved 2026-04-23" annotations on the wrapper-inclusion, contract-date-duplication, and category/resources items.

---

## What I'm ready for next

1. **TP's revised inventory + prompt** with the edits above. I'll re-review and sign off.
2. **Operator's sign-off on wrapper startDate/endDate decision** (set explicitly to contract window vs leave null). My recco is explicit.
3. **Operator's sign-off on wrapper sort_order** (default low, e.g., 0, so wrapper renders atop Convergix section).
4. **CC #1 and CC #2 firing.** I hold until both merge. Then I pull prod, run Cluster 2 immediately, hold Cluster 3 until Gate C confirmed in prod.
5. **Operator's call on Item 4A-4C** inclusion in CC #1's prompt if not yet done (so By Account view changes, wrapper-close-out detector, and get_retainer_team ride on CC #1).

I'm in evaluation mode. Nothing in my queue requires writing to prod until both PRs merge.
