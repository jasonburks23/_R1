# Future skill: `/data-integrity`

**Purpose:** Capture the process and learnings from this session so a fresh Claude can spin up as a "data integrity thought partner" for this project (or a sibling project) without repeating discovery. Operator plans to build this as a skill using `/skill-builder` as the base.

## Concept

A persistent agent, TP-style, whose job is to be **the source of truth on data, schema, prod DB, and data shape** for the project. Spins up alongside a `/thought-partner` but with a narrower mission: protect prod data integrity.

Differs from `/thought-partner`:
- TP owns the plan (milestones, chunks, CC coordination).
- `/data-integrity` owns the **data**: what the schema says, what prod actually contains, where the gaps/NULLs/drift live, what's safe to write, what's risky.
- The two collaborate. TP routes data questions to `/data-integrity`. `/data-integrity` evaluates TP's proposed plans from a data-integrity angle and pushes back on risky writes.

Similar rails to `/thought-partner`:
- No prod writes without explicit per-operation approval.
- Scratch scripts in `docs/tmp/<skill-name>/`.
- Never display secret values; reference env vars by name.
- Small chunks, one question at a time for the operator.

## Onboarding sequence (what a fresh session should do)

**Step 1 — Project orientation (parallel):**
- Read `CLAUDE.md`, `README.md`, `package.json`.
- `git log --oneline -20`, `git status`, `git branch -a`.
- List top-level `/src` + `/scripts` + `.env*` files.

**Step 2 — Find the data plane:**
- Locate the schema file(s) (e.g., `src/lib/db/*-schema.ts`).
- Locate the DB client + env var names (never print values).
- Locate any existing "pull" script (e.g., `pnpm runway:pull`). If none exists, write a read-only snapshot script into `docs/tmp/<skill-name>/` using the project's DB client pattern.

**Step 3 — Pull a baseline snapshot.** All tables. Save to `data/` or equivalent so diffs are possible later.

**Step 4 — Run a structured integrity audit.** Produce a report covering:
- Row counts per table.
- Distribution of enum-like columns (status, category, engagement_type, etc.).
- NULL counts on fields the schema implies should be populated.
- FK integrity (ref that doesn't exist, JSON arrays pointing to missing rows).
- Orphaned self-references (if the schema has any).
- Date-field sanity (past end dates on active rows, etc.).
- Timestamp storage sanity (if mode: timestamp, check for ms-encoded drift).
- Audit-log batch listing + recent actor activity.

**Step 5 — Read the write path.**
- Identify the operations-writes layer.
- Identify field whitelists, guards, recompute logic, cascade audit patterns.
- Note patterns like batch hygiene (batch_id + updated_by uniqueness), DRY_RUN semantics, revert/retry idempotency rules.

**Step 6 — Write baseline documents in `docs/tmp/<skill-name>/`:**
- `README.md` — entry point with read order
- `baseline-mission.md` — role, rails, working style, terminology rules for stakeholder-facing drafts
- `baseline-env.md` — paths, env var names, commands, branch state
- `schema.md` — tables, columns, invariants, whitelist gotchas
- `data-shape.md` — counts, distributions, integrity results, **updated timestamps**
- `known-issues.md` — ranked by staff-impact vs plumbing
- `pending-decisions.md` — open questions + adjustment log
- `next-phases.md` — post-current-phase roadmap notes

## Ongoing capabilities

Once bootstrapped, the skill should be able to:

1. **Answer data-shape questions.** "How many X are there? Which Ys have NULL Z?" Re-pull if baseline is stale.
2. **Cross-walk external source documents.** Hot sheets, spreadsheets, client-facing docs — fetch via Drive MCP or user-provided content, reconcile against prod, flag deltas.
3. **Draft grounded stakeholder questions.** Use the question-drafting pattern (see below).
4. **Coordinate safe bulk data updates.** DRY_RUN script → operator review → APPLY script → verify. Every step explicitly approved.
5. **Evaluate CC / migration plans.** Fact-check data claims against snapshot. Verify field names against schema whitelists. Check batch hygiene. Identify DRY_RUN vs APPLY gaps. Push back on risky writes.
6. **Track prod drift.** When stakeholders (like Kathy) update data in real time, detect via audit log, refresh baseline, confirm open questions aren't invalidated.

## Question-drafting pattern (learned on Convergix, 2026-04-22)

For each cleanup pass:

1. **Pull a snapshot**, run an integrity audit against the affected Project(s).
2. **Fetch the external source of truth** (hot sheet, etc.) — use Drive MCP where available.
3. **Cross-walk prod vs source.** Identify deltas: missing rows, date mismatches, NULL values, orphaned refs, expired dates on active rows.
4. **Identify what's downstream of the same unblocking moment** (e.g., multiple Projects waiting on the same person/event). Bundle those into one cluster question to keep stakeholder in context.
5. **Draft questions per this pattern:**
   - Main question: ground in source doc + current prod state, then ask the modeling/structural question.
   - Follow-up cluster: one bullet per related Project. Parent bullet = Project name + conversational grounding sentence. Sub-bullets = specific questions.
   - Shared catch-all at the end: "For all X above" with blockers + "any other thoughts on timeline."
6. **Format rules for stakeholder-facing drafts:**
   - No em dashes.
   - No italics.
   - Output in a code block for easy copy/paste.
   - Project = L1, Task or Phase = L2. No jargon like "wrapper" or "parent_project_id."
   - Use the stakeholder's vocabulary when possible (e.g., if hot sheet uses "deliverables," use that word too).
   - Grounding statements must be conversational sentences, not bullets of facts.

## Rails / anti-patterns

- **Never rubber-stamp.** If a migration plan looks fine, verify at the data level anyway.
- **Never recommend a write without a DRY_RUN first.** Even trivial ones.
- **Never batch approvals.** One approval per operation, even when tedious.
- **Don't touch prod state while stakeholder is actively editing** without coordinating.
- **Respect stakeholder updates.** If they edit data while I'm drafting, re-check baseline; their edits take precedence over my plan.
- **Don't propose renaming/restructuring** unless the operator asks. The current data shape exists for reasons.
- **Don't skip the audit log review.** Prior batches teach you about past mistakes (revert/retry cycles, field whitelist misses, timestamp encoding bugs).

## Process learnings worth capturing in the skill

These emerged from the Convergix work:

- **DRY_RUN skips helper guards** → every cleanup script needs pre-write validators, not just DRY_RUN logs.
- **Revert-then-retry poisons idempotency** → bump updated_by on retry.
- **Field whitelist silent skip** → grep migration field names against schema constants before approving.
- **Raw-drizzle vs ORM inserts create format drift** → prefer ORM path for timestamp columns.
- **"Retainer Period Close" anchor tasks** artificially inflate Project end dates through recompute. Watch for similar anchor patterns in other projects.
- **Grounding bullets that state facts** ≠ grounding that helps the stakeholder. Must be conversational sentences.
- **Bundle cluster questions** while stakeholder is mentally in context for a Project.
- **Prod changes during your session.** Re-pull before acting.

## Files this skill would produce on a fresh run

Same as in `docs/tmp/data-integrity-audit/` today:
- `README.md` + baseline docs (mission, env, schema, data-shape, known-issues, pending-decisions)
- Scratch scripts (audit.ts, detailed.ts, retainers.ts, etc.) — read-only
- Snapshot report files
- `next-phases.md` — so the agent can hand off to its own post-compaction self

## Open skill-design questions to work through later

- Should the skill store baselines in `docs/tmp/` (gets cleaned up) or somewhere persistent like `.claude/data-integrity-baseline/`?
- Should it auto-refresh snapshots on a time threshold (e.g., if baseline > 1 hour old, re-pull)?
- How does it coordinate with `/thought-partner` in a shared session? Route data questions vs own the full TP role?
- Does it have permission to approve its own read-only scripts, or does every script still need operator sign-off?
- Should it build a schema-diff mode so it can be told "here's a PR, tell me what changes about the data model"?

## When to revisit this file

- Every time we learn something non-obvious about working with this project's data.
- Every time the operator adjusts drafting style, rails, or terminology.
- Before drafting the actual skill via `/skill-builder`.
