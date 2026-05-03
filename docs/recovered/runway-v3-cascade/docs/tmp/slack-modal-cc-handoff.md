# CC handoff — Slack Modal Phase 1 (autonomous orchestration mode, v2)

You are the orchestrator for the Slack Modal Phase 1 build. Operator has approved pre-plan v5 (locked 2026-04-30 after two Data TP review rounds). Your job: **orchestrate the build end-to-end with minimal human intervention**, with explicit halt-and-resume gates at three points (after spikes, before/after Wave 1 schema migration, after Wave 14 ngrok). Operator approves at gates; otherwise you self-orchestrate.

**TP seat for this build:** operator-only at the plan-mode review gate. R1 TP exits after pre-plan handoff; do not ping "TP" — submit your plan directly to operator.

This is NOT a typical sequential build. You will dispatch subagents in parallel within waves, run holdout QA agents with clean context after waves finish, run a multi-panel blind audit before commit, and self-verify at every gate.

## Read-stack (in order, before anything else)

1. `docs/tmp/slack-modal-pre-plan.md` (this worktree) — **the spec, v4**. Treat as authoritative.
2. `~/.claude/projects/-Users-jasonburks-Documents--AI---R1/memory/project_slack_modal_spec.md` — field design (rolled-in from Data Integrity TP, schema-corrected).
3. `docs/tmp/slack-modal-data-tp-brief.md` — architecture grep (current code state, file:line refs).
4. `CLAUDE.md` (this worktree) — project conventions, post-build pipeline, model selection rules.
5. `.claude/MEMORY.md` — project gotchas. Critical for this work:
   - Turbopack requires `.tsx` for any file with JSX
   - `proxy.ts` is the WorkOS auth middleware; new `/api/slack/interactivity` and `/api/slack/commands` routes need allowlist entries
   - Runway uses a separate Turso DB (`RUNWAY_DATABASE_URL`); migrations run via manual `pnpm runway:push`
4-6. Existing infrastructure (read before each touching wave):
   - `src/lib/slack/bot.ts` (line 204-210 — `generateText` loop, MAX_STEPS, MUTATION_TOOLS)
   - `src/lib/slack/bot-tools.ts` (all tool definitions; modal injection points)
   - `src/lib/runway/bot-context-behaviors.ts` (system prompt rules)
   - `src/lib/runway/bot-context.ts` and `bot-context-sections.ts` (system prompt assembly)
   - `src/lib/mcp/runway-tools.ts` (MCP tool registry — compare full surface vs bot's restricted surface)
   - `src/lib/runway/operations-add.ts`, `operations-writes-week.ts`, `operations-utils.ts` (write helpers)
   - `src/app/api/slack/events/route.ts` (Slack event ingress, signature verify pattern to mirror)
   - `src/lib/slack/verify.ts` (HMAC helper)
   - `src/lib/slack/client.ts` (Slack Web API client)
   - `src/lib/db/runway-schema.ts` lines 26-94 (schema truth for status/category/engagement enums)
   - `src/lib/inngest/functions/runway-slack-message.ts` (conversation lifecycle)

## Execution contract — autonomous orchestration

### Your role

You are a **non-coding orchestrator** at the wave level. You plan the implementation steps within a wave, dispatch subagents to write code, gate on build + tests between waves, run holdout QA + blind audit, fix what fails, and ship. You do NOT write source code yourself in your top-level session — you dispatch builder agents.

Exception: trivial single-line changes (typo fixes, comment edits, missed-import additions) you can do inline. Anything multi-file or stateful goes to a builder agent.

### TP's role

TP plans at the wave/milestone level (the pre-plan). TP reviews **your** plan critically once after Spike C resolves and before Wave 0a starts. After TP approves and operator green-lights, TP does not gate per-wave — you self-orchestrate.

If you hit a stop condition (see pre-plan §"Stop conditions"), halt and report. TP and operator re-engage.

### Operator's role

Operator approves TP's review of your plan, then doesn't engage until you report completion or hit a stop condition. Operator runs the manual `pnpm runway:push` gate after Wave 1 schema migration (you tell them when). Operator runs the post-build pipeline push (you don't push to upstream).

## Phase order

```
Spike C (pre-bundle, separate worktree feature/slack-modal-spike)
   ↓ TP reviews spike result
   ↓ operator decides (continue / scope-cut / halt)
   ↓
Main bundle (this worktree)
   ↓ /plan — produce detailed implementation plan covering Waves 0a → 16
   ↓ TP reviews plan critically
   ↓ operator approves
   ↓
Wave 0a → Wave 0b → Wave 0c → Wave 1 (Spike A inline) → Wave 2 → ... → Wave 6 (Spike B inline) → Wave 7 → ... → Wave 15
   ↓ Wave-end gate: build + test green; commit per wave
   ↓
Holdout QA (separate clean-context agent)
   ↓ Fix any real bugs found
   ↓
Multi-panel blind audit (separate read-only agent, 5 panels)
   ↓ Fix all FAILs; triage WARNs (decide fix-now or document-as-tech-debt)
   ↓
Wave 16 — post-build pipeline (/code-review → /update-docs → /pr-ready → /preflight → /canary → /atomic-commits)
   ↓ Operator pushes branch and opens PR
```

## STEP 0 — Worktree setup (do BEFORE anything else)

You're in `.worktrees/slack-modal/` on branch `feature/slack-modal`. The `scripts/worktree` script defaults to `main`, but Runway lives on `runway` (280+ commits ahead).

```bash
git fetch upstream && git reset --hard upstream/runway
pnpm install   # if dependencies don't match
```

Verify the dev server boots and `pnpm test:run` passes on the unchanged base before touching anything.

**`/canary` worktree-link pre-flight check:** verify a sibling worktree has `.vercel/project.json` linked. The `/canary` skill auto-copies the project name from a sibling on first run, but if NO sibling is linked, Wave 16 `/canary` will fail. Check via:

```bash
ls ../*/.vercel/project.json 2>/dev/null
```

If nothing returns, halt before plan-mode and ask operator to run a one-time `vercel link` in any sibling worktree.

## STEP 1 — Three pre-bundle spikes (you dispatch worktree-isolated subagents)

Per pre-plan v5, all three spikes (A, B, C) resolve before plan-mode. Dispatch them in PARALLEL using three Agent tool calls in a single message, each with `isolation: "worktree"`. After all three return, write consolidated findings to `docs/tmp/spikes-result.md` and HALT for operator approval.

**Spike A subagent prompt:**

```
You are running Spike A for the Slack Modal build. Your job is to determine whether
createWeekItem cascades to parent project's dueDate on insert when category=deadline,
the same way update_week_item does on date writes. Write findings to docs/tmp/spike-a-result.md.

Read:
- src/lib/runway/operations-writes-week.ts (full file, focus on createWeekItem)
- src/lib/runway/operations-writes-week.test.ts (existing tests for cascade behavior)
- Search for "cascade" / "dueDate" within operations layer

Document:
- Does createWeekItem cascade on insert when category=deadline? (yes/no, with file:line refs)
- If yes: what's the cascade trigger condition exactly?
- If yes: is there a clean refactor to skip cascade on initial insert? (consider impact on existing callers)
- Recommendation: cascade-safe-recipe / refactor-skip-on-insert / no-change-needed

EXECUTE NOW. Read-only investigation; no code changes.
```

**Spike B subagent prompt:**

```
You are running Spike B for the Slack Modal build. Your job is to determine whether
addProject accepts startDate/endDate directly on insert, or if those fields require a
post-create override path. Write findings to docs/tmp/spike-b-result.md.

Read:
- src/lib/runway/operations-add.ts (focus on addProject, lines ~36-49 per Data TP grep)
- src/lib/runway/operations-writes-project.ts (overrideProjectDate signature)
- src/lib/mcp/runway-tools.ts (add_project tool — does it pass dates through?)

Document:
- Does addProject accept startDate/endDate on insert? (yes/no, with code refs)
- If no: what's the bypassGuard requirement? Is there a 2-step path?
- If yes: are there guards that block dates when wrapping retainers vs normal L1s?
- Recommendation for Modal 3 retainer-wrapper write path: single-write / 2-step

EXECUTE NOW. Read-only investigation; no code changes.
```

**Spike C subagent prompt outline:**

```
You are running Spike C for the Slack Modal Phase 1 build. Your job is to determine whether
the bot's LLM-intercept architecture is viable, then write the result to
docs/tmp/spike-c-result.md and exit.

Read these files for context:
- src/lib/slack/bot.ts (lines 200-250 — generateText loop config)
- src/lib/slack/bot-tools.ts (one create_* tool definition for reference)
- src/lib/inngest/functions/runway-slack-message.ts (message-to-bot path)
- node_modules/ai/package.json (verify AI SDK v6.x; read README if available for stopWhen patterns)

Tasks (in order):

1. Determine: does the bot use generateText or streamText? (Read bot.ts; report findings.)

2. Hook the execute() of create_week_item with a throwaway intercept that returns
   { modalOpened: true } without actually opening a modal. Write a unit test that runs the
   bot's tool loop with a synthetic prompt that should pick create_week_item. Verify:
   - Does the LLM stop after the intercepted tool call?
   - Or does it keep churning through MAX_STEPS?
   Document the behavior verbatim.

3. Search AI SDK v6 for stopWhen predicates that fire on tool result shape. Document the
   API surface available for clean termination.

4. Latency proof: instrument the path from Slack event ingress → views.open call would-fire
   point. Measure p50/p95/p99 across 20 synthetic runs. Compare against 3-second
   trigger_id window.

5. Write findings to docs/tmp/spike-c-result.md with this structure:
   - Question 1: generateText vs streamText
   - Question 2: termination behavior (verbatim)
   - Question 3: stopWhen API options
   - Question 4: latency measurements
   - Recommendation: viable / fast-path-required / scope-cut-to-slash-only
   - Reasoning + recommended Wave 7 path

6. REVERT all spike code (git stash + drop, or git reset --hard to clean state). The result
   doc is the only artifact that should survive.

EXECUTE NOW. Do not enter plan mode. Modify ONLY the spike test files and
docs/tmp/spike-c-result.md.
```

After all three spike subagents return, READ all three result docs. Write `docs/tmp/spikes-result.md` consolidating:
- Spike A finding + recommended Modal 1 write path (cascade-safe-recipe / refactor / no-change)
- Spike B finding + recommended Modal 3 write path (single-write / 2-step)
- Spike C finding + recommended Wave 7 architecture path (viable / fast-path-required / scope-cut)
- Net read across all three

**HALT and report to operator. Do NOT self-judge architecture viability.** Operator reviews `spikes-result.md`, approves continuation OR redirects. Only after operator green-light do you enter plan mode.

## STEP 2 — Plan mode

After Spike C resolution AND read-stack absorbed:

1. **Enter plan mode (`/plan`).** Produce a detailed implementation plan covering all 16 waves from the pre-plan, plus the holdout QA + blind audit + post-build pipeline phases.
2. Your plan should include for each wave:
   - Files to read for context
   - Files to create or modify (concrete paths)
   - Subagent decomposition (which builder agents you'll dispatch in parallel within the wave)
   - Test strategy (TDD: tests first)
   - Wave-end gate criteria
3. **Submit plan; do not exit plan mode without explicit approval.**
4. TP reviews critically. Possible outcomes: approve / revise / push-back.
5. Operator gives final go.

DO NOT proceed past plan mode without explicit TP approval AND operator sign-off.

## STEP 3 — Wave execution

For each wave:

### Wave dispatch pattern

Dispatch builder subagents in parallel for independent file-scoped work within the wave. Use a single message with multiple Agent tool calls, each with `isolation: "worktree"` to prevent write-collisions with the orchestrator's working tree.

**Exception — Wave 0b is sequential, not parallel.** All Wave 0b validators land in `operations-utils.ts`, so parallel agents cause merge collisions. Dispatch one builder for the full Wave 0b scope, OR sequence multiple narrow builders one at a time.

Each subagent prompt must include:

1. **Self-contained context.** State the goal, the surrounding problem, what is already done, what to build. The subagent has zero memory of prior conversation.
2. **Concrete file paths.** List files to read for context AND files to modify.
3. **TDD mandate.** *"Write the test first. Run it. Confirm it fails. Then implement. Run again. Confirm it passes."*
4. **Self-verification mandate.** *"Run `pnpm test:run && pnpm lint`. Paste the output of the final summary line in your report."*
5. **Strict scope boundary.** *"Modify ONLY these files: [list]. If you find unrelated issues, list them in your final report. Do NOT fix unrelated issues in this prompt."*
6. **Plan-mode forbid.** *"EXECUTE NOW. Do not enter plan mode. You are running under bypassPermissions."*
7. **Acceptance criteria.** What "done" looks like, in concrete terms (file count, approximate line count, test names).

### Wave-end gate (mandatory)

After all subagents in a wave return:

```bash
pnpm test:run    # must be green
pnpm lint        # must be zero errors
```

If gate fails: identify the failing subagent's output, dispatch a focused fix subagent, re-gate. Do not start the next wave with a broken gate.

### Per-wave commit

After wave-end gate passes, commit the wave's changes with a single atomic commit (or 2-3 if the wave covered distinct concerns). Use conventional commit prefix (`feat:` / `fix:` / `refactor:` / `test:`). Commit body explains the WHY, not the WHAT.

This serves dual purpose: (a) progress tracking for compaction recovery, (b) clean atomic-commits at PR time.

### Progress doc

Maintain `docs/tmp/slack-modal-progress.md` updated at end of every wave:

```
# Slack Modal — build progress

## Completed waves
- Wave 0a (commit abc1234) — wrapper-creation gap fix; tests X
- Wave 0b (commit def5678) — operations-layer hardening; tests Y
- ...

## Current wave
- Wave N: <name>; subagents dispatched: <list>; status: in-progress / gating

## Open follow-ups (out-of-scope from this wave)
- [agent X reported: ...]
```

## STEP 4 — Holdout QA (mandatory after Wave 15, before audit)

Dispatch a SEPARATE subagent with clean context. The subagent has not seen any prior wave prompt. It writes tests for behaviors the build agents were never told to verify.

**Holdout QA prompt outline:**

```
You are a holdout QA agent for the Slack Modal Phase 1 build. You have NOT seen any of the
build prompts. Your job is to write tests for behaviors the build agents were never asked to
verify. Find real bugs, not stylistic issues.

Read these files for context (and ONLY these — do not read the build prompts or pre-plan):
- src/lib/slack/modals/* (all modal view builders, intercept helper, validators)
- src/app/api/slack/interactivity/route.ts
- src/app/api/slack/commands/route.ts
- src/lib/runway/operations-utils.ts (modal calls these validators)
- src/lib/db/runway-schema.ts (truth for status/category/engagement)

Write tests covering these holdout categories. Aim for 1-2 tests per category. Tests must run
under Vitest in this repo's existing setup.

1. Double-trigger: rapid concurrent submits of the same proposal (race condition)
2. Failure injection: throw inside operations-writes-week / addProject; verify error path
3. Boundary values: 24-char title limit, 280-char notes limit, 100-block view limit
4. State transition: proposal expires DURING modal-open and submit happens after
5. Missing data: Modal 1 submitted with valid state but proposal row deleted between
   intercept and submit
6. Concurrency: two users intercept-create same fuzzy-title under same client within 60s
7. Trigger_id timing: simulate views.open call 4 seconds after trigger_id generated
8. Submit-as-different-user: view_submission body.user.id ≠ proposal.user_slack_id
9. Multi-create stacking edge: third create_* call in same loop AFTER intercept already fired
10. Empty-string at write boundary: proposal args contain endDate="" (Wave 0b normalize check)
11. Cancel-then-submit: view_closed marks cancelled, submit arrives after for same proposal_id
12. Status/category matrix: every reject combination from Wave 0b
13. View update value preservation: block_actions changes type radio; verify user-typed
    title persists in re-rendered view

Run `pnpm test:run` after writing tests. Report which tests pass, which fail (real bugs).
Do not fix the bugs you find. List them with file:line and reproduction steps.
```

If holdout finds real bugs: dispatch focused fix subagents, re-run holdout, re-gate.

## STEP 5 — Multi-panel blind audit (mandatory after holdout)

Dispatch a SEPARATE read-only subagent with clean context. It examines the full implementation across 5 dimensions, grading each PASS / WARN / FAIL.

**Audit prompt outline:**

```
You are a blind audit agent for the Slack Modal Phase 1 build. You have NOT seen any of the
build prompts, the pre-plan, or the holdout QA results. Read the code fresh and judge
independently.

Read these directories thoroughly:
- src/lib/slack/modals/
- src/app/api/slack/interactivity/
- src/app/api/slack/commands/
- src/lib/runway/operations-utils.ts (validator extensions)
- src/lib/runway/bot-context-behaviors.ts (system prompt edits)
- src/lib/slack/bot-tools.ts (create_* tool definitions, intercept wiring)
- drizzle-runway/* (schema migration for bot_create_proposals)

Grade across 5 panels. PASS / WARN / FAIL for each, with rationale and file:line refs.

PANEL 1 — Data Flow + Idempotency
- Read/write correctness across modal submit → operations layer
- Race conditions on proposal lifecycle (insert / submit / cancel / expire)
- Idempotency on double-submit
- Atomic submit-and-write transaction integrity
- Audit row source/updatedBy correctness

PANEL 2 — UI/UX + Slack Modal Patterns
- Loading states (modal opens before LLM finishes if fast-path required)
- Empty states (brand-new client with no projects)
- Validation error messages teach the matrix inline (vs cryptic "invalid")
- Soft-warn + companion checkbox pattern correct
- Modal title/header/button character truncation
- Mobile rendering parity

PANEL 3 — Performance + Latency
- Async write pattern: ack < 3s, write via Inngest, post async
- views.open latency vs trigger_id 3s window
- N+1 queries on proposal load + client team filtering
- Bundle impact (Block Kit modal builders should be server-only)

PANEL 4 — Security + Auth + Input Validation
- HMAC verification + replay protection on both new endpoints
- Submitter-equals-proposer enforcement
- proxy.ts allowlist correctness
- Empty-string normalization at write boundary
- Status/category compatibility matrix (every rule from Wave 0b)
- Role-tag-required on resources
- contractStart < contractEnd validator
- Secrets handling (should not appear; flag if any logging includes Slack tokens)

PANEL 5 — Edge Cases + Failure Modes
- Null handling across optional fields
- views.open error → proposal failed → fallback message
- Spike A path: cascade-on-insert handled correctly per recipe
- Spike B path: addProject date-on-insert handled per resolution
- Multi-create intent stacking
- Past-date + non-terminal status soft-warn fires
- Title-collision soft-warn fires
- Wrapper-vs-child date-extension soft-warn fires

End with a triage table:
| Panel | PASS count | WARN count | FAIL count |
|-------|-----------|------------|------------|
| Data Flow | X | Y | Z |
| ... | | | |

For every FAIL: file:line, what's broken, suggested fix.
For every WARN: file:line, what's concerning, severity (high/medium/low).
```

**FAIL handling:** every FAIL ships as a fix subagent dispatch BEFORE Wave 16. Do not start the post-build pipeline with open FAILs.

**WARN handling:** triage explicitly. For each WARN, decide fix-now or document-as-tech-debt in `docs/tmp/slack-modal-tech-debt.md`. Do not silently ignore.

## STEP 6 — Wave 16 (post-build pipeline)

Run sequentially, not in parallel:

```
/code-review              # DRY, prop drilling, hooks/context, test coverage
/update-docs              # sync /docs knowledge base if patterns/versions changed
/pr-ready                 # debug statements, unused imports, final cleanup
/preflight                # build + grep gate + tests + lint + vercel build
/canary                   # cross-fork Vercel preview deploy (runway-targeted PRs)
/atomic-commits           # split working tree into focused commits if needed
```

Each is its own step — do not collapse or skip. After `/canary` reports a green canary URL, halt and report to operator. Operator pushes the branch and opens the PR.

## Drift prevention rules

- Each subagent dispatch includes "Modify ONLY these files: [explicit list]"
- Each subagent reports any out-of-scope issues to a list, NOT fixes them inline
- Out-of-scope items roll up into `docs/tmp/slack-modal-progress.md` "Open follow-ups" section
- After every wave, verify by `git diff --stat` that only the wave's files were touched
- If a subagent touched out-of-scope files: dispatch a revert subagent, dispatch the original work scoped narrower

## Compaction handling (predict and prepare)

You will likely compact during this build. Prepare:

1. **`docs/tmp/slack-modal-progress.md`** updated at end of every wave (already mandated)
2. **Per-wave commits** with clear conventional-commit messages (already mandated)
3. **DO NOT REPEAT block** at the top of every subagent prompt:
   ```
   ## DO NOT REPEAT COMPLETED WORK
   These are committed. Do not re-plan, re-implement, or re-test:
   - Wave 0a (wrapper-creation gap fix) — commit abc1234
   - Wave 0b (operations-layer hardening) — commit def5678
   - ...
   ```
4. **On compaction recovery:** read pre-plan v4 + this handoff + progress doc + `git log --oneline -30`. Resume at the next unfinished wave from progress markers. Do NOT re-derive from scratch.

## Self-verification mandates (you, not subagents)

Before declaring a wave done:

1. `git diff --stat` — confirms only expected files touched
2. `pnpm test:run` — green
3. `pnpm lint` — zero errors
4. `git log --oneline -1` — wave commit exists with correct message format
5. Update `docs/tmp/slack-modal-progress.md`

Before declaring the build done (after Wave 16):

1. All 16 waves committed
2. Holdout QA report complete; no unfixed real bugs
3. Multi-panel blind audit complete; zero FAILs; WARNs triaged
4. Post-build pipeline ran; canary URL is green/READY
5. `docs/tmp/slack-modal-progress.md` reflects the full build state
6. Report to operator with: canary URL, total commit count, holdout summary, audit summary, any open WARN tech-debt items

## Critical do-NOTs (you and your subagents)

- Do NOT proceed past plan-mode without TP approval
- Do NOT proceed past Spike C without resolution doc
- Do NOT skip holdout QA — it's the cheapest catch for the highest-impact bugs
- Do NOT skip multi-panel blind audit — independent fresh-eyes pass catches what you miss
- Do NOT push to upstream — operator does that
- Do NOT skip preflight or canary on the runway-targeted PR
- Do NOT skip the manual `pnpm runway:push` gate after Wave 1 — tell operator when, halt until done
- Do NOT write through MCP — operations layer direct
- Do NOT bake assumptions about LLM termination — verify against Spike C result
- Do NOT introduce free-text resource entry — hard data-integrity violation
- Do NOT extend modal scope to update paths or disambiguation — Phase 2
- Do NOT attempt custom Slack modal styling beyond Block Kit — won't work, wastes time
- Do NOT trust subagent claims like "I checked X" — verify by grep / read

## Stop conditions (halt and report to operator + TP)

Per pre-plan v4 §"Stop conditions". Summary:

- Spike A finds cascade-on-insert problem AND no clean refactor
- Spike B finds `addProject` rejects insert-time dates
- Status/category matrix surfaces a 5th+ rule needing operator decision
- Async write pattern needs > 3 hrs of work
- Holdout QA finds a critical bug not in spec
- Audit returns FAIL on any panel that you can't fix in-scope
- Latency exceeds 2.5s p95 in real testing AND fast-path doesn't recover
- ngrok testing reveals modal renders incorrectly in real Slack
- Any wave finishes (always stop and report; you continue autonomously after report unless told to halt)

## Final report format (when build is done)

```
# Slack Modal Phase 1 — build complete

## Summary
- Commits: N
- Waves completed: 16/16
- Total tests added: M
- Test pass: X/X
- Lint: 0 errors
- Canary URL: <url> (status: READY)

## Holdout QA
- Tests written: K
- Real bugs found: J (all fixed; commits: ...)

## Multi-panel blind audit
- Data Flow: PASS / WARN N / FAIL 0
- UI/UX: PASS / WARN N / FAIL 0
- Performance: PASS / WARN N / FAIL 0
- Security: PASS / WARN N / FAIL 0
- Edge Cases: PASS / WARN N / FAIL 0
- WARN triage: K fixed, M documented in slack-modal-tech-debt.md

## Post-build pipeline
- /code-review: clean
- /update-docs: clean
- /pr-ready: clean
- /preflight: clean
- /canary: green
- /atomic-commits: split into N commits

## Open follow-ups
[List from progress doc]

## Operator next steps
1. Review canary URL
2. Run ngrok manual test (Wave 15 checklist)
3. Push branch + open PR (per Wave 16 closing step)
4. Apply for app review with new scopes (`canvases:write`, etc.)
```
