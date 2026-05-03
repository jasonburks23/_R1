# Operator Questions — Pre-TP Pushback

**Structure:** Two parallel PRs (89 + 90). Questions grouped by PR.
Each question has a default proposal. Accept default = "default".

---

## PR 89 — Write-path + migrations/scripts (CC #A)

### Q89.1 — RESOLVED

Generalized coercion refactor pulled out of PR 89 into its own PR 91. PR 89 keeps PR 88's field-specific `parentProjectId` coercion unchanged + inline comment. PR 91 runs sequentially after PR 89 merges. See `pr91-plan-2026-04-21.md`.

### Q89.2 — Scheduled-status L2 backfill business rules (non-blocking, can answer during review)

Scaffold ships with TODOs. Operator answers during PR review OR post-merge before apply.

- **Q89.2a — Qualifying filter:** default `status IS NULL AND start_date IS NOT NULL AND start_date > current_date`.
- **Q89.2b — Terminal parent exclusions:** default skip L2s under completed/cancelled L1s.
- **Q89.2c — Scope:** default single batch.
- **Q89.2d — Multi-day L2s spanning today:** default DO NOT mark scheduled (already in-flight).

### Q89.3 — Convergix retainer-wrapper business rules (non-blocking, scaffold + TODO)

- **Q89.3a — Wrapper name:** default `"Convergix Retainer 2026-02-01 → 2026-07-31"`.
- **Q89.3b — Owner:** **TRULY BLOCKING if not defaulted.** Default proposal: Jason. Confirm or specify.
- **Q89.3c — Status:** default `"in-production"`.
- **Q89.3d — Engagement type:** default `"retainer"`.
- **Q89.3e — Contract dates:** default `2026-02-01 → 2026-07-31`.
- **Q89.3f — Children's contract dates:** default leave duplicated.

### Q89.4 — Retainer-aware recompute rule (non-blocking)

**Default:** Skip L1 date recompute when `engagementType='retainer' AND (contract_start IS NOT NULL OR contract_end IS NOT NULL)`.

**Alt 1:** Skip for ALL retainers regardless of contract dates.
**Alt 2:** Only skip end_date recompute, still recompute start_date.

### Q89.5 — Target-backup JSON disposition

**Default:** Move to `scripts/runway-migrations/backups/`.
**Alt:** Delete.

### Q89.6 — Scratch file disposition

**Default:** Delete both `query-data.ts` and `docs/tmp/lppc-check.ts`.
**Alt:** Add to .gitignore without deleting.

---

## PR 90 — UI/Flags/Detectors (CC #B)

### Q90.1 — Grandparent demotion warning surface (llama #4)

**Default:** New flag category `hierarchy-demotion` rendered in FlagsPanel.
**Alt 1:** Entry in /runway/admin data-health endpoint only.
**Alt 2:** Both.

### Q90.2 — Flag-count: confirm exclude blocked from resource-conflict count

**Default:** Exclude. Kathy 33 → ~11, meaningful signal improvement.
**Confirm:** GO / HOLD.

### Q90.3 — Flag-count window definition (non-blocking, scaffold + TODO)

Current: `currentMonday → now+10d` (11-17 days effective).

**Default proposal:** strict `now → now+10d` rolling.
**Alt:** keep currentMonday-anchored, relabel to "this week + next."
**Alt 2:** different window (7d, 14d).

### Q90.4 — Flag-count secondary-resources counting (non-blocking, scaffold + TODO)

**Default:** Count `resources` participants in addition to owner.
**Alt:** Owner-only (status quo).

### Q90.5 — Flag-count multi-day L2 dedupe (non-blocking, scaffold + TODO)

**Default:** Count each L2 once per person.
**Alt 1:** Count per calendar day.
**Alt 2:** Fractional day weighting.

---

## Non-blocking, no PR ownership (operator runs these anytime)

- **P1 data fixes (TP audit):** 4 items at `operator-mcp-fixes-2026-04-21.md`.
- **Beyond-petro / 5-client cleanup wave:** future data migration PR, operator drives when ready.
- **Audit infrastructure (triggered_by_update_id cascade linkage, per-child undo):** future code PR, architectural.

---

## TP pushback pass — what to challenge

TP reads all plan files (`pr89-plan-*`, `pr90-plan-*`, this file, `flag-investigation-prompt-*`, `operator-mcp-fixes-*`) and pushes back on:

1. **Split integrity:** is the write-path / read-path line really clean? Did CC miss a shared file?
2. **Default proposals:** anything wrong, unsafe, or doesn't match operator intent?
3. **Blocking vs non-blocking:** did CC mis-classify? Any "non-blocking" item that actually blocks?
4. **Task sizing per PR:** PR 89 has 8 tasks + 11 commits. PR 90 has 5 tasks + 4 commits. Is 89 too big? Should any 89 task split out or drop?
5. **Missing questions:** what should operator have been asked that CC didn't ask?
6. **Rebase conflict resolution on PR 89:** the described merge (keep null support + drop PR 88's coercion in favor of generalized normalizer) relies on Task 4 being correct — any risk of regression for MCP callers?
7. **Parallelism claim:** is the zero-overlap guarantee actually true? Specific test: what happens if CC #A's coercion change touches `operations-writes-week.ts` in the same block that CC #B's staleness change also touches indirectly via a shared import?

Output format: diagnosis + recommendations. No code changes. CC reviews post-compact.
