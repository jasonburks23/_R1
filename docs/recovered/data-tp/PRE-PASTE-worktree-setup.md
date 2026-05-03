# Worktree setup — DONE 2026-05-01 ~18:40 (status report; superseded for live use by post-rename state)

> **PATH NOTE (added 2026-05-01 ~19:30):** This file was written before the rename of `_R1_RECOVERED → _R1` (at ~19:00). Paths below referencing `_R1_RECOVERED/...` are now at `_R1/...`. The data-tp-runway worktree was successfully repaired via `git worktree repair` after the rename. This file is preserved as a status report of the original setup.

R1 TP executed all setup steps. Worktree healthy. Operator can now paste the data-tp + QA-partner prompts.

## What got done

### Path canonicalization
- Went with **option B** (no rename — stayed in `_R1_RECOVERED/`). Lower-risk; doesn't disrupt other live CC terminals (Modal/Gantt) which still have stale `_R1/` cwd. Operator can rename later when convenient.

### Worktree creation
```
git worktree add -b feature/data-tp-cluster3 _R1_RECOVERED/.worktrees/data-tp-runway upstream/runway
```
Branch name matches the original (`feature/data-tp-cluster3` per pre-wipe `git worktree list` output). Off `upstream/runway` like slack-modal and gantt-cli worktrees.

### `.env.local` symlink (NOT copy)
```
_R1_RECOVERED/.worktrees/data-tp-runway/.env.local → ../../.env.local
```
Verified as symlink. STEP 0 of skill complete. SQLite write-trap mitigation in place.

### Recovered files copied into worktree

| Path in worktree | Files |
|---|---|
| `docs/tmp/data/` | `convergix-spec-2026-05-01.md` (16KB Round 1 spec) |
| `docs/tmp/data-integrity-audit/` | 6 audit plan docs (multi-wave, audit-report-2026-04-28, ag1-soundly-bonterra-plan, hdl-bonterra-corrective-plan, lppc-phase3-plan, other-accounts-plan) |
| `docs/tmp/` | `runway-slack-modal-spec.md`, `slack-modal-add-flow-handoff.md`, `hdl-gantt.html`, `hdl-gantt-proposed-2026-04-28.html` |
| `docs/brain/` | `data-tp-rehydrate-2026-04-27.md`, `data-tp-rehydrate-2026-04-28-post-trust-loss.md` (existing upstream brain-RULES.md and brain-SESSION-START.md also present) |
| `scripts/runway-migrations/` | Convergix retainer renewal triplet (forward + REVERT + verify), hopdoddy-cards-1-2-2026-04-30-verify, plus upstream merged Convergix scripts |

### Deps installed
`pnpm install` in the worktree → 9s clean.

### `_R1_RECOVERED/docs/tmp/data/data-tp-handoff-2026-04-30.md`
Already in place from Track 1 recovery (30KB cross-session handoff doc).

### Skill files (untouched by wipe)
At `~/.claude/skills/data-integrity-tp/`. Latest mtimes confirm post-Soundly close patches landed:
- `data-conventions.md` — Apr 30 23:38
- `row-by-row.md` — Apr 30 20:35
- `SKILL.md` — Apr 29 08:41

These auto-load when data-tp's CC runs `/data-integrity-tp`.

## To open data-tp's terminal

```bash
cd ~/Documents/_AI_/_R1_RECOVERED/.worktrees/data-tp-runway
claude --dangerously-skip-permissions
```

Then paste from `PASTE-data-tp-reengagement.md`.

## To open QA-partner's terminal

If QA-partner runs in its own worktree, set up the same way (separate worktree on a separate branch off upstream/runway). If QA-partner runs against data-tp's outputs without its own worktree, just open Claude Code in any cwd you prefer (`_R1_RECOVERED/` root works).

Then paste from `PASTE-qa-partner-reengagement.md`.

## Verification commands (run these if anything looks off)

```bash
# Worktree on right branch?
cd ~/Documents/_AI_/_R1_RECOVERED/.worktrees/data-tp-runway && git status

# .env.local actually a symlink?
ls -la ~/Documents/_AI_/_R1_RECOVERED/.worktrees/data-tp-runway/.env.local
# Should show "lrwxr-xr-x ... .env.local -> ../../.env.local"

# Recovered files all there?
ls ~/Documents/_AI_/_R1_RECOVERED/.worktrees/data-tp-runway/docs/tmp/data/
ls ~/Documents/_AI_/_R1_RECOVERED/.worktrees/data-tp-runway/scripts/runway-migrations/ | grep convergix-retainer
```
