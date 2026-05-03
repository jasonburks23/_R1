# Data Integrity Audit — session baseline

**Purpose:** Rehydrate post-compaction. Read these files in order:

1. `baseline-mission.md` — who I am this session, rails, what I will/won't do
2. `baseline-env.md` — where code lives, how to reach prod Runway DB, branch state
3. `schema.md` — tables, columns, conventions (v4)
4. `data-shape.md` — prod row counts, distributions, baseline integrity results (check last-refresh timestamp!)
5. `known-issues.md` — concerns I've surfaced and their status
6. `convergix-reconciliation.md` — hot sheet vs prod for Convergix; source of truth for wrapper/clean-up pass
7. `pending-decisions.md` — operator + Kathy questions, open calls, **adjustment log** (check for activity I missed)
8. `next-phases.md` — what comes after Convergix; roadmap notes for Phase 3+ (audit remaining 12 accounts) and Phase 4 (CC #1/#2 plan review)
9. `future-skill-notes.md` — design notes for building this as a `/data-integrity` skill later

**Raw artifacts** (refresh if questioning whether baseline is stale):
- `audit.ts` + `report.md` — table totals + integrity checks
- `detailed.ts` + `detailed-report.md` — per-project listing + timestamp samples
- `retainers.ts` + `retainers-report.md` — retainer family + category×status matrix
- `/data/runway-snapshot.json` (outside this dir, in worktree `data/`) — full prod pull from `pnpm runway:pull`

**Session started:** 2026-04-22. Snapshot pulled 2026-04-22 ~13:26 UTC.

**If any of these files contradict live prod, trust prod and update the file.**
