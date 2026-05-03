# Data-TP Convergix Arc Close — 2026-05-02 rundown

> Written by R1 TP from data-tp's session wrap paste, persisted to disk for cross-session durability. Covers the Convergix cohort close + git lessons + skill v4 patches + 3 architecture questions queued for operator review.

## Bottom line

**Convergix arc CLOSED.** 3 batches APPLIED + verified clean in prod. 169 audit rows total (114 cards + 31 status sweep + 24 convention sweep). 4-client cohort (Hopdoddy / TAP / Soundly / Convergix) complete.

Branch `feature/data-tp-cluster3` pushed to `origin` (jasonburks23/_R1) — 4 commits, +5,358 lines, persisted to remote.

Worktree at `_R1/.worktrees/data-tp-runway/` is **disposable pending operator confirm**.

## Working pattern shift (NEW this session)

Two sessions ran in parallel with **file-handoff communication** instead of operator-relayed copy-paste:

- **data-tp** (`data-integrity-tp` skill) — owns hydration, spec authoring, drafter dispatch, DRY_RUN, APPLY execution, snapshots, handoff docs
- **evaluator** (NEW `data-evaluator-tp` skill drafted today at `~/.claude/skills/data-evaluator-tp/`) — independent cross-check layer. Reads what data-tp surfaces to disk, verifies against locked operator-intent + prod state, returns verdict
- **Operator** stays in loop only at hard gates (pre-APPLY, skill-patch landing, worktree disposal)

The new evaluator skill mirrors data-integrity-tp's structure (SKILL.md + 3 reference files: cross-check-templates, escalation-criteria, learnings).

Tested today on Convergix close. File-handoff cut operator copy-paste burden from paragraphs to one-liners. Caught real issues data-tp missed (e.g., misattributed evidence on skill v4 patch #20 — claimed CAT 1-8 had a category write that didn't exist).

## Git surface — 4 items surfaced today

### 1. Branch tracking near-miss (CAUGHT + FIXED)

`feature/data-tp-cluster3` was secretly tracking `upstream/runway` (the canonical deploy branch). A bare `git push` from this branch would have shipped today's data-only commits to production deploy.

data-tp caught it pre-push, redirected to `origin/feature/data-tp-cluster3` with `-u`, reset tracking. Future pushes from this branch are now safe.

**Discipline:** before `git push` on any feature branch, verify tracking with `git branch -vv`. If pointing at a deploy branch (`runway`, `main`, anything `upstream/*`), redirect with `git branch -u origin <branch>` first.

### 2. `docs/tmp/` is gitignored — used `git add -f`

Today's cohort handoff artifacts live in `docs/tmp/data/`. Standard convention says that path is ignored. data-tp force-added all 11 artifacts to commit them today. Worked, but it's a workaround.

**Suggestion (data-tp's):** relocate cohort-handoff artifacts to a non-gitignored path next session (e.g., `docs/data-tp/`). Precedent for keeping in `docs/tmp/` exists (asprey/hdl/lppc files already committed there with `-f`), but the convention is fragile.

### 3. 4 stale untracked files in `scripts/runway-migrations/`

Leftover migration scripts from prior weeks:
- 3× `convergix-retainer-renewal-task-*.ts` from 2026-04-26
- 1× `hopdoddy-cards-1-2-2026-04-30-verify.ts` from 2026-04-30

Not in today's scope. data-tp left them alone. None deploy-blocking. Operator decides commit / delete / leave at convenience.

### 4. Skill files persistence gap (architectural question)

The `~/.claude/skills/` folder is **NOT a git repo and has no remote**. Files created there exist on local disk only.

Today's new artifacts at risk:
- `~/.claude/skills/data-integrity-tp/v4-candidates-2026-05-02.md` (8 skill patch candidates from Convergix arc)
- `~/.claude/skills/data-evaluator-tp/SKILL.md` + 3 reference files (the new evaluator skill)

If `~/.claude/skills/` gets wiped (same failure mode as 2026-05-01), all of the above vanishes — including the new skill we just drafted and tested.

**data-tp surfaced two options:**

a. **Git-init the skills directory with a remote.** Treat skills as their own versioned project. Cleanest separation, but adds a second repo to maintain.

b. **Relocate critical artifacts into the runway repo.** E.g., `docs/data-tp/skill-patches/v4-candidates-2026-05-02.md` and copies (or symlinks) of skill SKILL.md files into the runway repo. Single repo to back up, but skill source-of-truth ambiguity if both copies exist.

Operator hasn't picked yet. R1 TP recommendation: **option (c) — relocate R1-specific skills to project-scope (`_R1/.claude/skills/`)**, ride the runway repo's git history, leave cross-project skills (jason-voice, civilization-brand) in user-scope. Best of both: project-scope skills for project-bound work, user-scope for cross-project work, single backup target per repo.

## Skill v4 patches queued (8 — operator review session pending)

5 numbered (#20, #22, #23, #24, #25). #25 is **CRITICAL** — parent date overrides clobbered by child-triggered recompute, caught 3× today.

3 secondary:
- Cascade guard mandate
- Single-day endDate paired write
- Notes replace-vs-append discipline

These don't auto-land. Operator + evaluator review session decides which land in `data-integrity-tp` skill text.

## State summary

| Item | Status |
|---|---|
| Convergix prod state | All 3 batches APPLIED + verified clean |
| `feature/data-tp-cluster3` | Pushed to origin, 4 commits, persisted |
| Worktree | Awaits operator confirm before disposal |
| `data-evaluator-tp` skill | Drafted, registered, untested in production session yet |
| Skill v4 patches | 8 queued, awaiting operator review session |
| Persistence gap | Open — operator decides direction (R1 TP recco above) |
| Branch tracking | Fixed on `feature/data-tp-cluster3`; standard pre-push check pending operator adoption |

## Open questions for operator

1. Skills persistence approach — git-init `~/.claude/skills/`, relocate critical files into runway repo, or R1 TP's recco of project-scope split?
2. Standard pre-push tracking check — codify in memory + worktree script update, or leave as ad-hoc?
3. `docs/tmp/` relocation — bother with `docs/data-tp/` migration, or accept `git add -f` as the convention?

No urgency on any of these. Convergix work is preserved either way. Architecture forward.
