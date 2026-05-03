# Pending decisions + open questions

## Awaiting Kathy's reply (operator is refining wording)

Draft question set I provided (9 items, operator may trim to 4):

1. **AUTOMATE Booth + Events Page** — one project or two?
2. **Corporate Brochure + Corporate PPT** — merged as Corporate Collateral Refresh, or separate?
3. **Big Win PPT + Big Win Social Announcement** — one project w/ two deliverables or two projects?
4. **Brand Guide v2 final files** — 4/23 or 4/30?
5. **Industry Vertical Campaigns** — realistic CDS wrap? Industrial/Battery Assembly kickoff?
6. **Rockwell Co-Marketing** — any timing yet, or still TBD on Daniel's scope?
7. **Fanuc Award article** — pre-write this week or wait for Nicole's post-event info?
8. **Anything missing** from hot sheet that's on your plate?
9. **Retainer renewal** — any word, or plan for 7/31 wrap?

My priority recco if operator trims: **1, 4, 5, 8** (directly change what we'd write to prod).

## Awaiting operator calls

- **Scheduled-status backfill** for 17 non-Convergix NULL-status L2s — standalone, bundled with Phase 3 writes, or coordinated with CC #2. Recco B (bundle with Phase 3). Deferred by operator 2026-04-22 — wants data-integrity TP to own the per-row reasoning when Phase 3 replies land.
- **Convergix wrapper timing** — blocked on CC #1 merge. Ordering decision is still open: write immediately after CC #1 ships, or let CC #2's data touch settle first.

## Resolved

- **Timestamp normalization** — RESOLVED 2026-04-22. 38 ms-encoded `updates.created_at` rows corrected in place under batch_id `timestamp-correction-2026-04-22`. Post-verify clean. See `known-issues.md` #5.
- **Convergix wrapper semantic scope + nesting** — RESOLVED 2026-04-22. Wrapper is **per-contract-period** (Framing A), tied to the 1H 2026 SOW (Convergix_2026_1H_Retainer_SOW_012626, effective 2026-01-26, term 2026-02-01 → 2026-07-31). Wrapper `contract_start` = 2026-02-01, `contract_end` = 2026-07-31. Nest the 17 active Convergix L1s under the wrapper. The 3 historical completions (Life Sciences Brochure, Organic Social Playbook, Social Media Templates) stay unparented — operator directive: "we are not doing legacy projects from the past, please don't build those." If Convergix renews for 2H, a separate wrapper is created per the existing `Convergix_2H_2026_Retainer_SOW` pattern (already drafted in Drive).
- **Convergix wrapper metadata (Q1 + Q3)** — RESOLVED 2026-04-23. Creating the wrapper (above-L1 retainer-period container, `projects` row) with: `name`="Convergix Retainer", `clientId`=convergix, `engagementType`="retainer", `contractStart`=2026-02-01, `contractEnd`=2026-07-31, `status`="in-production", `category`="active", `owner`="Kathy" (required for `contractExpired` + `retainerRenewalDue` flag detection per agent investigation), `resources`=NULL (team stays on client per operator — wrapper rendering can pull client team if helpful). Empty: notes, dueDate, waitingOn, parentProjectId. Status DOES NOT auto-flip to completed on contract_end — new "Needs Update" surfacing logic (CC #1 Item 4B `detectWrapperCloseOut`) detects wrappers past contract_end + still in-production and nudges operator to close out manually.

- **Wrapper `startDate` / `endDate` at creation** — RESOLVED 2026-04-23 (operator confirmed during CC plan-review session). Set explicitly to contract window: `startDate`="2026-02-01", `endDate`="2026-07-31". Original locked metadata's "let recompute populate from children" is now stale because CC #2's recompute guard freezes wrapper dates whenever it has children (which it always will after nesting). Auto-populate path is closed. Setting explicitly at creation gives By Account view a visible timeline (Kathy can see "we're in month X of 6" at a glance) and avoids null-date render degradation. Guard preserves the values once children nest.

- **Wrapper `sort_order`** — RESOLVED 2026-04-23 (operator confirmed during CC plan-review session). `sort_order`=0. Renders wrapper at top of Convergix section on By Account view, above the 17 nested L1s. Natural container-first hierarchy (wrapper card header, deliverables underneath).

- **CC #1 scope additions (4A / 4B / 4C)** — RESOLVED 2026-04-23 (operator confirmed during CC plan-review session). All three ride on CC #1 rather than a follow-up PR: 4A (By Account view changes — strip prices, wrapper-as-umbrella, standalone marker), 4B (`detectWrapperCloseOut` for past-contract-end wrappers), 4C (`get_retainer_team` helper + MCP tool per `get-retainer-team-spec.md`). CC #1 commit count grows from ~4 to ~6. All read-path, zero data writes. Scope expansion + 3 tightening asks (Phase B Δ3-parallel grep, Phase C `CONTRACT_EXPIRED_ACTIVE_STATUSES` Set, Phase D extra wrapper-detection tests + comment) being relayed to CC #1 via primary TP's round-2 feedback.

- **CC #2 prompt tightening asks** — RESOLVED 2026-04-23. Three validator-level adjustments approved: (1) `parentProjectId` validation + `set_project_parent` add same-`client_id` check; (2) `override_project_date` idempotency key derived from `(projectId, field, oldValue, newValue)` not just `newValue`, audit row includes both values; (3) `contractStart`/`contractEnd` use real ISO parse + roundtrip, not shape regex. None structural. Primary TP folding into CC #2 prompt during round-2 redraft.

## Awaiting primary TP / operator hand-off

- **CC #1 plan + TP's analysis doc** — haven't been shown yet. Expected to be light on data touch.
- **CC #2 plan + TP's analysis doc** — haven't been shown yet. Expected to be heavy on data touch. This is where I fact-check every claim.
- **CC #2 migration spec** — retainer-aware recompute guard with EXISTS-subquery predicate. Need to verify the predicate doesn't sweep in standalone retainers (Hopdoddy Digital Retainer, Dave Asprey Wind Down) or the yet-to-be-created Convergix wrapper.

## Notes for CC #1 / CC #2 plan review (operator directives to flag)

These are operator asks logged 2026-04-23 that should be fact-checked against whichever CC plan touches the relevant view/area.

**By Account view:**
- Render retainer wrappers as the visible umbrella for their children (17 L1s nested under "Convergix Retainer").
- Visually mark any standalone (non-wrapper) project under a retainer client so it reads as "outside retainer scope."
- **Do NOT show prices / dollar amounts** on this view (operator has asked for this "several times"). Example gap: today the Convergix card shows $100,000 and Beyond Petro shows $93,000 in the header — both should be removed from By Account.
- Pipeline view is the correct home for prices (used by executives + AMs working deals).

**Week Of view:**
- Wrappers should NOT be displayed (wrappers have no L2s, would ghost). But the wrapper → child → L2 data chain must be preserved in queries so the bot can answer hierarchy questions intelligently.

**Needs Update area:**
- New logic required: surface any retainer wrapper whose `contract_end` has passed AND `status` is still `in-production`. The nudge is "this retainer is due to be closed out." Operator manually flips to `completed` after wrap-up. This is NOT automatic status change — the data carries the facts, the UI provides the nudge.

**Bot / MCP hierarchy intelligence:**
- Confirmed working today (via `get_projects(engagementType='retainer')` + `get_projects(parentProjectId=<id>)`): "What retainers do we have?" and "What projects are under Convergix Retainer?"
- NOT working today: "Who's on the Convergix Retainer team?" Would need a new helper (~30 LOC) that dedupes resources across children L1s, plus a new MCP tool `get_retainer_team`. Small, good candidate to bundle with a CC branch that's already touching bot tools.

**Wrapper-filter gap on CC #1:**
- Investigation 2026-04-23: CC #1 (`feature/runway-flags-consolidation`) may NOT add a Week-view wrapper filter. Wrapper code (data model + By Account render + MCP tools) shipped in PR 88 to main already. The filter to hide wrappers from Week view appears absent from both main AND CC #1's branch. **Needs verification before wrapper migration proceeds** — if the filter doesn't exist, a wrapper with no L2 children will ghost in Week view until someone adds the filter.

## My confidence levels

- Data shape I've captured is **accurate as of 2026-04-22 ~13:30 UTC**. Any write to prod between now and next read invalidates it — re-pull snapshot before acting.
- Schema doc reflects the `feature/runway-flags-consolidation` branch, which is off `upstream/runway`. If CC #1 or CC #2 plans diverge from this schema, trust their plan and update `schema.md`.
- Reconciliation with hot sheet is **my interpretation**. Kathy's replies may shift several assumptions — update `convergix-reconciliation.md` then.

## Log of adjustments (update as discoveries land)
| Date/time | What changed | Files updated |
|---|---|---|
| 2026-04-22 ~13:30 UTC | baseline captured | all files in this dir |
| 2026-04-22 ~15:01 UTC | Kathy 9:01 AM local: 5 task edits + 1 delete (Partner-of-Year image swap consolidated into Rockwell Partner Award image swap; April Social 4/20 Posts marked completed; 3 notes updates). Doesn't affect Q1 or Q2 scope. | `data-shape.md`, `kathy-updates-report.md` |
| 2026-04-22 ~15:05 UTC | Confirmed timestamp bug is contained to raw-drizzle scripts; app/MCP writes correct | `known-issues.md` |
| 2026-04-22 ~EOD UTC | Q1-Q5 Convergix question drafts complete. Final sweep: 0 missed Projects, 0 orphan tasks, 0 pipeline items. Operator refining wording and sending to Kathy. | `baseline-mission.md`, new `handoff.md` |
| 2026-04-22 ~17:40 UTC (post-compaction) | Phase 3 audit drafted for 12 non-Convergix accounts. Per-client question doc handed to operator for formatting in Google Docs. Corrected BP L1 count (9, not 10). | `phase3-audit.ts`, `phase3-audit-report.txt`, `phase3-findings.md`, `data-shape.md` |
| 2026-04-22 ~22:45 UTC | Convergix Kathy-cleanup batch APPLIED. 92 writes in primary batch + 9 in follow-up = 101 audit rows. Projects 16 → 20 (4 new monthly Social Content L1s — April renamed, May/June/July created; 1 new Assembly Campaign). Week_items 30 → 33 (5 creates: Events Staging, New Capacity PPT Complete, Rockwell Nicole Conversation, Assembly Completion Target, CDS Case Study; 2 deletes: Big Win Social Announcement Companion, Retainer Period Close). Structural: IVC split into CDS Vertical Campaign (renamed) + Industrial/Battery Assembly Campaign (new). Brand Guide renamed (secondary palette dropped). All 7 NULL Convergix L2 statuses resolved per-row (not blanket). 0 ms-encoded audit rows. | `convergix-batch.ts`, `convergix-followup.ts`, `convergix-post-verify.ts`, prod Runway DB |
| 2026-04-22 ~23:45 UTC | Timestamp correction APPLIED under batch_id `timestamp-correction-2026-04-22`. 38 ms-encoded `updates.created_at` rows corrected in place (÷1000). No new audit rows written — in-place column fix only. Post-verify: 0 rows remain ms-encoded globally, total updates count unchanged (758), affected batch row counts preserved (34 + 4), original `updated_by` values preserved, global min/max created_at now bounded 2026-04-18..2026-04-22. QA pass 1 clean (zero critical), pass 2 skipped — deterministic single-column transform + independent post-verify script ran as substitute cross-check. | `timestamp-correction.ts`, `timestamp-correction-dryrun.txt`, `timestamp-correction-apply.txt`, `timestamp-correction-verify.ts/txt`, `known-issues.md`, `data-shape.md` |
| 2026-04-23 (session-end) | `/data-integrity` skill shipped on `feature/data-integrity-skill` branch (commit 7e39058, 5 files, 922 lines). Wrapper Q1/Q3 metadata locked (see Resolved). `get_retainer_team` helper + MCP tool spec drafted for ride-along on whichever CC branch touches bot tools. Worktree diff captured: CC #1 branch is empty (= upstream/runway), CC #2 branch TBD by operator. Operator directive logged: **all data writes go through data-integrity TP**, no outside migration scripts. Buttoning up for compaction. | `.claude/skills/data-integrity/*`, `get-retainer-team-spec.md`, `worktree-diff-vs-upstream.md`, `pending-decisions.md`, `project_convergix_cleanup_applied.md` auto-memory |
| 2026-04-23 (post-compact CC plan-review session) | Reviewed CC #1's revised plan (TP round-1 incorporated) + CC #2's initial plan + primary TP's `cc2-data-writes-inventory` + authoritative `cc2-clean-prompt`. Pulled fresh prod snapshot (2026-04-23T15:19 UTC): zero wrapper writes have happened; 17 active Convergix L1s + 3 historical completions confirmed; 17 non-Convergix NULL-status L2s confirmed. Wrote 3 review docs (`cc1-review.md`, `cc2-review.md`, `tp-cc-review-response-2026-04-23.md`) + `wrapper-state-audit.md`. **Operator-locked 4 decisions:** wrapper startDate/endDate explicit (2026-02-01/2026-07-31), wrapper sort_order=0, CC #1 scope adds 4A/4B/4C (commit count ~4→~6), CC #1 round-2 tightening asks all approved (Δ3-parallel grep, CONTRACT_EXPIRED_ACTIVE_STATUSES Set, Phase D wrapper-detection tests). CC #2 prompt tightening asks (same-client check, idempotency oldValue, real ISO parse) approved separately. Primary TP drafting 5 deliverables (cc2-prompt diffs, inventory refresh, cc1-round-2-feedback doc, tp-cc1-plan-review record update, route back to data-integrity TP for re-review). Awaiting drafts. | `cc1-review.md`, `cc2-review.md`, `tp-cc-review-response-2026-04-23.md`, `wrapper-state-audit.md`, `pending-decisions.md`, `project_convergix_cleanup_applied.md` auto-memory |
