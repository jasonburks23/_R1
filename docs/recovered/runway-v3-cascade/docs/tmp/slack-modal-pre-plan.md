# Slack Modal — Phase 1 pre-plan (v5 — locked for autonomous CC kickoff)

Captured 2026-04-29, v4 locked 2026-04-30 after Data TP 56-delta review, **v5 locked 2026-04-30 after Data TP review of v4** (4 criticals + 12 other flags rolled in). This is the spec; the execution contract lives in `slack-modal-cc-handoff.md`.

## Companion docs (read-stack)

- **Architecture brief (verbatim from Data TP grep):** `docs/tmp/slack-modal-data-tp-brief.md`
- **Field design (verbatim, schema-corrected):** `~/.claude/projects/-Users-jasonburks-Documents--AI---R1/memory/project_slack_modal_spec.md`
- **CC execution handoff:** `docs/tmp/slack-modal-cc-handoff.md`
- **Tabled Gantt styling (out-of-scope reminder):** `docs/brain/gantt-styling-tabled-2026-04-29.md`

## v4 → v5 changelog (this round)

- **Spikes A and B pulled forward** alongside Spike C to Wave -1 — all three resolve before any wave starts (Critical-1)
- **Lint guard for `create_*` tools is allowlist-based, not blanket** — Phase 1 intercepts `create_project` / `create_week_item` / `create_team_member` only; `create_pipeline_item` and any future create tools must opt in via `INTERCEPT_ALLOWLIST` constant (Critical-2)
- **Wave 14 → 15 → 16 made explicit halt-and-resume** — CC halts after Wave 14; operator runs Wave 15 ngrok + Slack app manifest update + Vercel env var; CC resumes Wave 16 only after operator green-light (Critical-3, Critical-4, Minor-14)
- **Slack app manifest update is an explicit pre-Wave-2 operator gate** with checklist (new endpoints, 4 slash commands, scopes: `commands`, `canvases:write`) (Critical-4)
- **Operator approval gate after Spike C result** — CC does not self-judge "viable / fast-path / scope-cut" (Q2 push-back from Data TP)
- Multi-create intent stacking scoped to **schema-only in 1.0**; chained-modal UX is Phase 2 (Major-6)
- Wave 4/5/6 view builders **conditionally produce two payloads (skeleton + populated)** if Spike C resolves to `fast-path-required` (Major-7)
- Wave 10 Inngest event payload spec'd as **explicit TS interface** (Major-8)
- Wave 16 deploy script handles **canvases.create on first run + canvases.edit on subsequent** (Major-9)
- Wave 0b builders **sequenced (not parallel)** since all touch `operations-utils.ts` (Medium-10)
- **Title-collision fuzzy match: in-house Sørensen-Dice** via bigrams (~30 lines, no dep) — pre-decided to avoid mid-build debate (Medium-11)
- `/canary` worktree-linking pre-flight check added to STEP 0 (Medium-12)
- **TP seat for plan-review = operator-only** for this build (Medium-13). R1 TP exits after pre-plan handoff; operator approves CC's plan directly.
- Stop-condition wording tightened to "report progress, continue unless told to halt" (Minor-15)
- All wave builder subagents dispatched with `isolation: "worktree"` (Minor-16)
- Wave 0c clarified: dev workspace required; if absent, set up first OR retitle as "sanitize prod payloads" (Major-5)

## v3 → v4 changelog (prior round)

- Spike C added as pre-bundle hard gate
- Spikes A/B inline at Waves 1 and 6 (now pulled forward to Wave -1 per v5)
- Wave 0c (Slack fixture capture) added
- 9 critical / 10 major / 28 medium items folded into wave deltas
- Status/category matrix expanded from 3 to 7 rules
- L2 default status `scheduled` + `dayOfWeek/weekOf/endDate` derive ordering locked
- Async write pattern locked at Wave 10
- Feature flag `MODAL_INTERCEPT_ENABLED` + observability + intercept-miss alerting added
- Modal scope expanded to include `create_team_member`
- Title-collision soft-warn promoted from Phase 2 to Wave 9
- Multi-create intent stacking schema added

## Why this work exists

Soundly's dashboard rendered NaN/NaN on 2026-04-29 because the operations layer accepts malformed dates. AG1 had wrappers without dates because the bot can't write retainer fields. Resources without role tags slip in via free-text. Notes drift into schedule-recap. This modal is the input gate that stops drift at the human-input boundary before it metastasizes through MCP, bot, and migration write paths.

## Why architecture is LLM-intercept (not slash-command-primary)

Data TP's grep pass mapped the actual create-vs-update flow:

1. Bot's create-vs-update decision is purely LLM-driven via Vercel AI SDK `generateText` tool calling. No regex, no rules.
2. Zero modal scaffolding exists today. No `/api/slack/interactivity` route, no Block Kit modal helpers.
3. Bot can't create a retainer wrapper today — `create_project` (`bot-tools.ts:264-273`) doesn't expose `engagementType`, `parentProjectId`, `contractStart`, `contractEnd`. MCP can; bot can't.
4. `generateText`'s `execute()` callback runs synchronously. The modal flow is: intercept the create, store proposed args, open modal, terminate the LLM run. On submit, fresh handler completes the write.

So the trigger architecture is: bot LLM picks `create_*` → `execute()` intercepts → modal pops → user confirms → write fires through operations layer. Slash commands are a secondary manual surface.

## How create-vs-update is differentiated

The mechanism is the bot's existing LLM tool choice. Modal interception ONLY hooks `create_*` `execute()` callbacks. `update_*`, `delete_*`, and read tools continue to write/run directly with no modal.

| User says | LLM picks | Modal? |
|---|---|---|
| "Add a Concept Writeup task for AG1 Pro Friday" | `create_week_item` | ✅ Pops |
| "Move the AG1 Concept Writeup to Friday" | `update_week_item` | ❌ Direct write |
| "Mark Convergix Brochure as awaiting-client" | `update_project_status` | ❌ Direct write |
| "Set Lane as the CD on Bonterra Q2" | `update_project_field` | ❌ Direct write |
| "Start a new retainer with Acme — $8k/mo, kicks off May 1" | `create_project` | ✅ Modal 3 (post-Wave-0a) |
| "Add Sarah Smith as a Dev for Convergix" | `create_team_member` | ✅ Pops (Phase 1 inclusion) |
| "What's on AG1's plate?" | (read tool) | ❌ Query, no write |

Verbs drive tool choice: "add / create / new / start" → create. "move / change / update / mark / set" → update. False positives recoverable (cancel modal = no write). False-negative mitigation lives in the search-before-create system prompt edit (Wave 0a).

## Phase 1 scope

### In

- **Three modals:** Modal 1 (Task / L2), Modal 2 (Project / L1), Modal 3 (Retainer Wrapper)
- **Modal 4 (Team Member):** added per Data TP review item #38 — closes the "Freelance" / non-existent-team-member surface
- **Primary trigger:** bot LLM `execute()` intercept for `create_project`, `create_week_item`, `create_team_member`, and the wrapper case
- **Secondary trigger:** four slash commands `/runway-new-task`, `/runway-new-project`, `/runway-new-retainer`, `/runway-new-team-member`
- `bot_create_proposals` table holds proposed args; `private_metadata` carries proposal ID only
- Direct write through operations layer (NOT MCP)
- Real-time validation via `block_actions` (cheap rules)
- Server-side validation via `view_submission` `response_action: "errors"` (hard rejects)
- Soft warnings rendered with companion checkbox ("I've reviewed — proceed anyway") to enable submit
- **Async write pattern** at submit: ack ≤3s, dispatch write via Inngest, post confirmation/error to thread async
- Audit row source-tagged via TS union type; `updatedBy` formatted `slack:U03ABCDEF:modal`
- Resources picker as row repeater (Role + Name dropdowns, server joins to `"CD: Lane, CW: Kathy"`)
- Feature flag `MODAL_INTERCEPT_ENABLED` for staged rollout / fast disable
- Funnel observability via `bot_create_proposals.status` metrics + per-validator-rejection counter
- Intercept-miss alerting (warn when `create_*` write hits ops layer without preceding `submitted` proposal row)
- Companion Slack canvas + channel bookmark for end-user help (Wave 16)

### Out (deferred or rejected)

- L3 (sub-project advanced) creation — gated on D1 schema work
- Update-path modals — Phase 2 follow-on
- Disambiguation modal ("update existing or create new?") — Phase 2 follow-on
- `views.push` multi-step within a single modal — only used for category=deadline cascade-confirmation (Wave 8)
- Pre-LLM deterministic classifier — explicitly NOT building
- Custom modal styling (colors, fonts, CSS) — Slack doesn't support it; visual personality is emoji language + brand voice + clean hierarchy
- Logo image block — internal audience, not needed

## Bundled prerequisites — both fold into the single PR

### Wave 0a — Close the wrapper-creation gap at the bot layer (~3 hrs)

Today's bot `create_project` (`bot-tools.ts:264-273`) only accepts `clientSlug, name, status, owner, resources, dueDate, waitingOn, notes`. MCP's `add_project` accepts everything; bot is the bottleneck. Without this, Modal 3 has nothing to intercept.

**Scope:**
1. Extend `create_project` tool definition to accept `engagementType`, `parentProjectId`, `contractStart`, `contractEnd`. Mirror MCP's schema.
2. **System prompt diff (not just append):** read existing `bot-context-behaviors.ts` rules, resolve any contradictions with new rules below.
3. Add to system prompt:
   - Set `engagementType=retainer` when user describes ongoing / monthly / retainer engagement
   - Set `parentProjectId` when user says "batch under [retainer wrapper]" or similar
   - Set `contractStart/End` when user mentions contract dates
   - **Search-before-create with canonical read tool per target:**
     - Before `create_project` → call `get_projects(clientSlug=X)` first
     - Before `create_week_item` → call `get_week_items(clientSlug=X)` first
     - Before `create_team_member` → call `get_team_members(clientSlug=X)` first
     - Only proceed with `create_*` if no plausible match OR user explicitly confirms net-new
4. Add `engagementType` to `update_project_field` enum (currently excluded per `bot-tools.ts:315-323`)

### Wave 0b — Operations-layer hardening (~3 hrs)

Hardens every write path (modal, MCP, bot, migration) immediately. Per `feedback_shared_validator_module.md`: validators live in `operations-utils.ts`, every write path reuses them.

**Scope:**
1. Empty-string normalization at write boundary: `endDate=""` / `startDate=""` / `date=""` → NULL before insert.
2. **Status/category compatibility matrix** — full set, not undershot. Hard reject:
   - `not-started` + `on-hold`
   - `completed` + `active`
   - `in-production` + `on-hold`
   - `awaiting-client` + `pipeline`
   - `on-hold` + `active`
   - `completed` + (any non-`completed` category)
   - `blocked` + `active` (soft-warn, legit edge case — don't reject)
3. Role-tag-required validator on resources field (rejects bare `"Kathy"`, accepts `"CW: Kathy"`)
4. **`contractStart < contractEnd` validator** when both set
5. **Past-date + non-terminal status soft-warn:** when `date < today` and status is non-terminal (not `completed`/`canceled`), warn (don't reject — legit recovery cases)
6. **Notes maxLength enforcement:** ~280 chars on L2 notes, ~500 on L1
7. **Audit `source` enum locked as TS union type:**
   - Grep existing taxonomy across `operations-utils.ts`, `operations-add.ts`, `operations-writes-*.ts`, migrations
   - Document existing values (likely `mcp`, `bot-direct`, `migration`, `cli`/`script`)
   - Add `slack-modal-bot` and `slack-modal-slash`
   - Ship as TS union so future writers can't drift to ad-hoc strings
8. **`updatedBy` format spec:** `slack:U03ABCDEF:modal` for modal writes; document existing taxonomy and lock format
9. **Lint guard:** test that iterates `bot-tools.ts` exported tool definitions and asserts every `/^create_/` tool has a corresponding intercept entry. Prevents future create tools from silently bypassing the modal.

### Wave 0c — Slack fixture capture (~1 hr)

Per Data TP item #22: tests must use real Slack payloads, not memory-fabricated. Capture fixtures from a dev Slack workspace.

**Scope:**
1. Capture sample `block_actions`, `view_submission`, `view_closed`, slash command, and event_callback payloads from a dev workspace
2. Sanitize: `team_id`/`user_id`/`channel_id` → `T_TEST_*`/`U_TEST_*`/`C_TEST_*`
3. Commit to `tests/fixtures/slack/`
4. Provide a fixture loader helper in `src/lib/slack/test-helpers.ts`

## Pre-bundle spikes — Wave -1, hard gate (all three resolve before plan-mode)

Per Data TP v4 review Critical-1: pull Spikes A + B forward alongside Spike C. All three are signature inspections (~30 min each); resolving them up-front prevents 1-6 wave rework if architecture flips.

### Spike A — `createWeekItem` cascade-on-insert

**Question:** does `createWeekItem` cascade to parent's `dueDate` on insert when `category=deadline`, the same way `update_week_item` does on `date` writes?

**Read:** `src/lib/runway/operations-writes-week.ts` `createWeekItem` signature + body.

**Decides:** whether Modal 1's submit handler must use the cascade-safe recipe (insert as `category=delivery`, then update to `deadline` post-insert) OR refactor `createWeekItem` to skip cascade on insert OR no change needed.

### Spike B — `addProject` accepts dates on INSERT

**Question:** does `addProject` accept `startDate` / `endDate` directly on insert (zero-children case), or does the `bypassGuard` requirement mean dates must be set via `overrideProjectDate({bypassGuard: true})` post-create?

**Read:** `src/lib/runway/operations-add.ts` `addProject` signature (lines 36-49 per Data TP grep).

**Decides:** whether Modal 3 is single-write or 2-step (`addProject` no dates, then `overrideProjectDate` per field).

### Spike C — AI SDK v6 LLM termination + latency

**Question:** does the AI SDK v6 pattern of `execute()` returning `{modalOpened: true}` cleanly terminate the `generateText` loop, AND does the end-to-end flow (Slack message → Inngest → bot context load → `generateText` → `execute()` → DB insert → `views.open`) fit within the 3-second `trigger_id` validity window?

**Sub-questions:**
1. Does AI SDK v6 support `stopWhen` predicate that fires on a tool result shape? OR does the LLM keep churning unless we force-stop another way?
2. Does the bot use `generateText` or `streamText`? (Affects intercept feasibility — `streamText` may have already streamed reply text before `execute()` fires.)
3. Measure p50 / p95 / p99 latency from Slack event arrival to `views.open` call. If p95 > 2.5s, fast-path required: open empty/skeleton modal first (sub-second), then `views.update` with pre-filled content once LLM finishes.
4. Does `execute()` returning a non-throw shape mark the tool call as successful from SDK perspective, or does the SDK retry?

**Deliverable:** a 1-day spike PR (`feature/slack-modal-spike` branch, separate from main bundle worktree) with:
- Throwaway proof-of-concept: hook `execute()` of `create_week_item`, return `{modalOpened: true}`, measure what happens to the LLM loop
- Latency measurements documented
- Decision recorded: viable / fast-path-required / scope-cut-to-slash-only

**Operator approval gate (mandatory):** after all three spikes resolve, CC writes consolidated findings to `docs/tmp/spikes-result.md` and **HALTS**. Operator reads, approves continuation OR redirects (e.g., scope-cut to slash-only). CC does NOT self-judge architecture viability. Only after operator green-light does CC enter plan mode.

**If Spike C resolves "scope-cut":** halt. Operator decides: per-conversation flag pattern, versus slash-only Phase 1, versus drop bot-intercept entirely.

## Architecture

### New endpoints
- `POST /api/slack/interactivity` — handles all interactive payloads (block_actions / view_submission / view_closed / shortcut). HMAC-SHA256 + 5-min replay protection (mirrors `/api/slack/events`). Routes by `payload.type` and `view.callback_id` (`runway_new_task` / `runway_new_project` / `runway_new_retainer` / `runway_new_team_member`).
- `POST /api/slack/commands` — shared dispatcher for the four slash commands. Selects modal by command name. Creates empty-args proposal, opens modal.

`proxy.ts` updated to skip auth on both routes.

### Bot LLM intercept hook
New helper `interceptCreateForModal(toolName, args, context)` in `src/lib/slack/modals/intercept.ts`. Wired into `execute()` callbacks of `create_project`, `create_week_item`, `create_team_member`. Helper:
1. Inserts proposal row in `bot_create_proposals`
2. Calls `views.open` with appropriate modal pre-filled from `args`
3. Returns `{ proposalId, modalOpened: true }` to the LLM
4. **Code-level termination fail-safe** (per Spike C resolution): per-conversation flag stored in conversation state — subsequent `create_*` tool calls in same `generateText` loop hard-reject. Prompt-only termination is brittle and not relied upon.

### Proposal storage

New table `bot_create_proposals` in Runway Turso DB:

```
bot_create_proposals
  id                  text primary key (ulid)
  user_slack_id       text not null
  channel_id          text not null
  thread_ts           text
  tool_name           text not null  -- create_project | create_week_item | create_team_member
  args                text not null  -- JSON of LLM-extracted args
  conversation_ref    text          -- pointer to chat context
  parent_proposal_id  text          -- for multi-create intent stacking; FK to self
  intent_group_id     text          -- groups multi-create intents
  created_at          timestamp not null
  expires_at          timestamp not null  -- created_at + 30 minutes
  status              text not null  -- 'pending' | 'submitted' | 'cancelled' | 'expired' | 'failed'
  status_reason       text          -- error detail when status = 'failed'
```

**Indexes:**
- `(status, expires_at)` — for cron sweeper
- `(user_slack_id, created_at)` — for future rate-limit work
- `(intent_group_id, status)` — for multi-create chaining

**Lifecycle:**
- Created on bot intercept OR slash-command open
- `pending` → `submitted` on successful write (atomic with the write to prevent double-submit)
- `pending` → `cancelled` on `view_closed`
- `pending` → `expired` by Inngest cron at 15-min intervals
- `submitted` → `failed` if write throws (proposal marked failed, error surfaced to user, dead-letter logged)
- `submitted` / `cancelled` / `expired` / `failed` rows deleted after 24h via Inngest cron

**Schema migration timing:** runs via manual `pnpm runway:push` (per project memory — not Vercel deploy). **Wave 1 must explicitly include "operator runs `pnpm runway:push` before Wave 2 ships" as a manual gate.** Otherwise route reads non-existent table → 500s.

### Modal flows

**Modal 1 (Task)** — single-view; pushes only used for `category=deadline` cascade-confirmation step.
**Modal 2 (Project)** — single-view; conditional required visibility for startDate/endDate/dueDate/contractStart/End/parentProjectId.
**Modal 3 (Retainer Wrapper)** — single-view; locked engagementType + parentProjectId. Post-submit returns `response_action: "update"` with "Add wrapped child →" view (Modal 2 pre-filled).
**Modal 4 (Team Member)** — minimal modal; client + name + role_category + email (optional).

### Bot LLM intercept flow (PRIMARY path)

```
User: "Add a Concept Writeup task for AG1 Pro Friday with Kathy on it"
  ↓
LLM picks tool: create_week_item, args extracted
  ↓
execute() callback fires
  ↓
interceptCreateForModal("create_week_item", args, context)
  ↓
  1. INSERT INTO bot_create_proposals → proposalId
  2. views.open(trigger_id, buildTaskModal({ args, proposalId }))
  3. Set per-conversation "modal-opened" flag
  4. RETURNS { proposalId, modalOpened: true }
  ↓
LLM (per system prompt + per-convo flag): "Opened a confirmation modal — please review"
  ↓
User sees chat reply AND modal pops, pre-filled
  ↓
User edits / fills required → Submit
  ↓
view_submission hits /api/slack/interactivity
  ↓
Ack 200 immediately (sub-3s)
  ↓
Inngest event fired with { proposalId, state, userId }
  ↓
Inngest handler: load proposal, merge with state.values (user wins), validate, write via operations layer, mark proposal submitted, post confirmation to thread async
```

## Field design

**Source of truth:** `~/.claude/projects/-Users-jasonburks-Documents--AI---R1/memory/project_slack_modal_spec.md` (rolled-in version from Data TP, schema-corrected from `runway-schema.ts`). CC must read it before building view builders. Schema lives at `src/lib/db/runway-schema.ts` lines 26-94.

**Critical L2 default:** status defaults to `scheduled` at server-side write boundary (matches Wave 0b backfill convention).

## Wave decomposition (16 waves, with v4 deltas)

Each wave includes tests written alongside, not after. CC dispatches independent agents in parallel within waves; gates on build + tests between waves; runs holdout QA + multi-panel blind audit before commit.

### Wave -1 — Spike C (pre-bundle, separate worktree)
See "Pre-bundle spike" section above. Hard gate before main bundle plan-mode.

### Wave 0a — Wrapper-creation gap fix
Per "Wave 0a" section above. Tests cover create-with-retainer-fields, prompt-driven LLM behavior, and search-before-create.

### Wave 0b — Operations-layer hardening
Per "Wave 0b" section above. Tests cover each rule + integration with each existing write path.

### Wave 0c — Slack fixture capture
Per "Wave 0c" section above.

### Wave 1 — Schema migration: `bot_create_proposals` table
- Drizzle schema addition + migration
- **Operator gate (explicit halt):** CC writes `docs/tmp/wave-1-runway-push-needed.md`, halts. Operator runs `pnpm runway:push` and confirms in chat. CC resumes Wave 2.
- Tests for insert / load / expire / status transitions
- Indexes per "Proposal storage" above
- **Pre-Wave-2 operator gate (Slack app manifest):** CC writes `docs/tmp/slack-app-manifest-checklist.md` listing required app config changes (Request URLs for `/api/slack/interactivity` and `/api/slack/commands`, four slash commands registered, OAuth scopes added: `commands` and `canvases:write`). Operator updates Slack app config. CC resumes after operator confirms.

(Note: Spikes A, B, C all resolved in Wave -1; no inline spikes here.)

### Wave 2 — Slack interactivity endpoint scaffold
- New `/api/slack/interactivity` route, signature verification, payload type routing, callback_id-based dispatcher
- `proxy.ts` allowlist update
- Tests for each payload type with HMAC validation + fixture payloads from Wave 0c

### Wave 3 — Slash command dispatcher
- New `/api/slack/commands` route handling four commands
- Returns 200 immediately, creates empty-args proposal, opens modal
- Tests for command routing + proposal insertion + view_open shape

### Wave 4 — Modal 1 (Task) view builder
- Pure function in `src/lib/slack/modals/task.ts`
- Pre-fill from proposal args
- Conditional rendering: Date type radio toggles startDate visibility; Resources row repeater (max 10 rows per #31)
- Client-driven dropdown filtering (parent / owner / resources)
- Modal title/header/button truncation pattern (24/150/24 char limits per #32)
- Tests for every conditional permutation

### Wave 5 — Modal 2 (Project) view builder
- Pure function in `src/lib/slack/modals/project.ts`
- Conditional required visibility for startDate/endDate/dueDate/contractStart/End/parentProjectId based on status + engagementType
- Empty-parentProjectId workflow per #39 — render inline "Create new project first →" link/button when client has zero L1s
- Tests for matrix coverage

### Wave 6 — Modal 3 (Retainer Wrapper) + Modal 4 (Team Member) + post-create chain
- `src/lib/slack/modals/retainer-wrapper.ts` and `src/lib/slack/modals/team-member.ts`
- engagementType + parentProjectId locked on Modal 3
- Post-submit `response_action: "update"` chain on Modal 3 → Modal 2 pre-filled
- Spike B path locked from Wave -1 — implement single-write or 2-step per spike result
- **Fast-path (if Spike C resolved fast-path-required):** Modals 4/5/6 each produce TWO view payloads — skeleton (sub-second open) + populated (after LLM finishes). View builder exposes `buildSkeleton()` and `buildPopulated()` functions.
- Tests for chain flow + (if fast-path) skeleton-then-update sequence

### Wave 7 — Bot LLM intercept (HIGHEST RISK)
- `src/lib/slack/modals/intercept.ts` `interceptCreateForModal()` helper
- Wire into `execute()` callbacks of `create_project`, `create_week_item`, `create_team_member`
- **Code-level termination fail-safe** per Spike C resolution (per-conversation flag, NOT prompt-only)
- System prompt updated for `modalOpened: true` interpretation
- Latency-aware fast-path if Spike C measured p95 > 2.5s
- Tests cover proposal insertion, views.open call shape, LLM behavior change, multi-create intent stacking (sets `intent_group_id` on second `create_*` call)

### Wave 8 — `block_actions` handler
- Date type radio, Status/EngagementType selects, Resources row add/remove
- Category=deadline cascade-confirmation `views.push` with explainer copy (#11 — endDate safety carve-out): *"⚠️  On future `date` changes, this updates the parent project's dueDate. `endDate`, status, and notes changes do NOT cascade."*
- **Value preservation pattern** per #33 — read `state.values` from action payload, merge into new view's `initial_value` props on every re-render. Slack only persists `initial_value`, not user-typed values.
- Tests for each conditional flow

### Wave 9 — `view_submission` validation tier
- Empty-string normalization (already in Wave 0b ops layer; modal handler also pre-normalizes for clarity)
- Required-field check
- Status/category compatibility matrix (Wave 0b validators reused)
- Role-tag-on-resources check
- Parent-must-be-retainer check
- engagementType=retainer-needs-Modal-3 redirect
- **Title-collision soft-warn (#10):** query existing L1s/L2s by clientId, fuzzy-match ≥80%, render soft-warn with required confirm-checkbox to enable submit
- **Past-date + non-terminal status soft-warn (#7)**
- **endDate logic for both single-day AND multi-day (#2):**
  - Single-day: `startDate = endDate = date`, `endDate` server-set
  - Multi-day: `date = endDate` (date is end), `startDate` user-provided kickoff
  - Single-day with no startDate: server sets `startDate = date`, never NULL
- **Auto-derive ordering explicit (#3):** `date` set first → `dayOfWeek = dayName(date)` → `weekOf = mondayOf(date)`
- **L2 status default = `scheduled`** (#12)
- **Wrapper-vs-child date-extension soft-warn (#20)** — child whose endDate exceeds wrapper's range
- **Soft-warn checkbox companion pattern (#34)** — every soft-warn pairs with checkbox below, submit-disabled until checked
- **Validation error UX inline rule reasons (#19):** "Status `completed` can't pair with category `active`. Pick `completed` for the category, or change the status." NOT "Invalid combination."
- Tests cover every rule + every soft-warn

### Wave 10 — `view_submission` write handler with async pattern
- **Ack 200 immediately** (sub-3s) — no DB work in the request handler
- **Inngest event payload TS interface (locked):**
  ```ts
  interface SlackModalSubmitEvent {
    name: "slack-modal/submit"
    data: {
      proposalId: string
      modalCallbackId: "runway_new_task" | "runway_new_project" | "runway_new_retainer" | "runway_new_team_member"
      stateValues: Record<string, Record<string, unknown>>  // raw view.state.values
      userId: string             // body.user.id
      teamId: string             // body.team.id
      channelId: string          // resolved from proposal row
      threadTs: string | null    // resolved from proposal row
      triggerId: string          // for fast-path views.update if needed
      submittedAt: string        // ISO timestamp
    }
  }
  ```
- Dispatch via `inngest.send({ name: "slack-modal/submit", data: { ... } })`
- Inngest handler:
  - Load proposal by ID (verify still `pending`, not `expired` per #29)
  - **Submitter-equals-proposer check (#25):** reject if `body.user.id !== proposal.user_slack_id`
  - Merge proposal args with `state.values` (user edits win)
  - Auto-compute `dayOfWeek` / `weekOf` / `endDate` per ordering above
  - **Atomic submit:** mark proposal `submitted` AND write in same transaction (per #28 double-submit idempotency)
  - Call `addProject` / `createWeekItem` / `createTeamMember` from operations layer (NOT bot's tool path — per #21)
  - Tag audit row: `source` from TS union (`slack-modal-bot` or `slack-modal-slash`); `updatedBy = slack:${userId}:modal`
- **Dead-letter on write failure (#36):** mark proposal `failed`, record error in `status_reason`, post error to Slack thread
- **`views.open` error handling (#30):** detect Slack rate-limit / network / expired trigger / missing scope → mark proposal `failed` → bot posts slash-command fallback ("Modal couldn't open — try `/runway-new-task` instead")
- Tests cover happy path + every failure mode

### Wave 11 — `view_closed` cancellation handler + concurrency check
- `notify_on_close: true` on all modals
- Mark proposal `cancelled`
- Post brief DM thread reply ("No record created — modal dismissed")
- **Concurrency soft-warn (#27):** at proposal insert time, check for open `pending` proposal with same `(clientSlug, tool_name, fuzzy-title)` in last 60s → render soft-warn at modal-open ("Someone else may be creating something similar — proceed?")
- Tests

### Wave 12 — Inngest cron — proposal expiry sweeper
- Runs every 15 min
- Marks `pending` past `expires_at` as `expired`
- Deletes terminal-status (`submitted` / `cancelled` / `expired` / `failed`) rows older than 24h
- Tests cover state transitions + idempotency

### Wave 13 — Confirmation message + soft warnings rendering
- Bot-intercept-launched: post confirmation in DM thread
- Slash-launched: DM toast
- Soft-warns rendered as section blocks above offending input
- Tests for each path

### Wave 14 — Cross-flow integration + observability + feature flag
- Full happy paths: Task via bot, Task via slash, Project via bot, Project as wrapped child, Wrapper via slash + chain, Team Member via bot
- Multi-create intent stacking happy path
- **Feature flag `MODAL_INTERCEPT_ENABLED`** (env var) — when false, intercept is bypassed and bot writes direct
- **Funnel observability:** per-15-min counters on `bot_create_proposals.status` distribution; per-validator-rejection counter
- **Intercept-miss alert:** log warning when `create_*` write hits ops layer without preceding `submitted` `bot_create_proposals` row in same conversation
- Update `data-conventions.md` post-ship — natural-language creates flow through modal; raw operations-layer create only used by migrations and modal submit-handler
- Tests assert end-to-end view shape, DB write, audit source tag, proposal lifecycle, multi-create chaining

### Wave 14 → Wave 15 transition (explicit halt)

After Wave 14 commit, CC writes `docs/tmp/wave-14-complete-handoff.md` listing:
- Operator action 1: run Wave 15 ngrok test per `reference_local_testing_setup.md`
- Operator action 2: confirm Slack app manifest already has Request URLs + slash commands + scopes (per pre-Wave-2 gate; verify still active)
- Operator action 3: set `MODAL_INTERCEPT_ENABLED=true` env var in Vercel before Wave 16 canary

CC HALTS. Operator does Wave 15 + confirms 1/2/3 complete. CC resumes Wave 16 only after explicit operator green-light.

### Wave 15 — Local Slack ngrok testing (operator-driven, NOT autonomous)
- Per `reference_local_testing_setup.md`
- Confirm: request URLs registered, signature passes, all four modals render correctly in real Slack client, slash command registration, bot LLM intercept fires on natural-language input, multi-create proposal rows get correct `intent_group_id` (chained UX is Phase 2, but schema should populate)
- Manual checks per Data TP v3 review:
  - Locale / date-picker behavior (#43)
  - Streaming response UX validation (#44)
  - Notes XSS spot-check across `src/app/runway/**/*.tsx` for `dangerouslySetInnerHTML` (#45)
- Operator reports back to CC: pass/fail per check; CC fixes on fail then re-halts for re-test

### Wave 16 — Help canvas + channel bookmark + post-build pipeline
- **Help canvas (first-run aware):** deploy script checks for existing canvas via `conversations.info` → uses `canvases.create` if missing OR `canvases.edit` with `operation: replace` if exists. Source: `docs/runway/help-canvas.md`. Required scope: `canvases:write`.
- **Channel bookmark:** one-time `bookmarks.add` on the Runway Slack channel pointing at the canvas URL (idempotent — check existing first)
- **Post-build pipeline (cross-fork PR per CLAUDE.md):**
  - `/code-review`
  - `/update-docs`
  - `/pr-ready`
  - `/preflight`
  - `/canary`
  - `/atomic-commits`
  - Push (operator runs)

## Estimated LOE (single bundled PR)

- ~38-46 hours agent work
  - Spike C (pre-bundle, separate PR): ~8 hrs
  - Wave 0a + 0b + 0c: ~7 hrs
  - Waves 1-15 (modal + endpoints + intercept + lifecycle + observability): ~26-34 hrs
  - Wave 16 (help canvas + pipeline): ~3 hrs
  - Buffer: ~2 hrs
- ~8-10 hours TP review + plan-mode review across the build
- Timeline: ~12-16 calendar days from Spike C kickoff to merge
- **Wave 7 is highest-risk; Spike C resolves it before Wave 7 starts**
- **Waves 1 + 6 each have inline spikes (A and B) that gate their respective waves**

## Operational additions (run alongside or after waves)

- `MODAL_INTERCEPT_ENABLED` feature flag — env var, default true, fast-disable without revert PR
- Observability counters in `bot_create_proposals.status` over time
- Intercept-miss alerting via warn-log
- Source backfill: pre-modal rows have NULL `source`. Document NULL = pre-modal-era OR run one-shot backfill migration. Operator decides; default: document NULL convention, no backfill (less risk).
- Operator/team training one-pager — already covered by Wave 16 help canvas
- **Sequencing decision (#53):** ship modal → declare MCP create deprecated in Phase 2 → backport validators (Wave 0b validators already protect MCP create paths today). MCP creates remain available for Open Brain CC sessions; modal is the human-input gate.
- **Turso free-tier write-volume check** before Wave 1: `bot_create_proposals` is write-heavy (insert + status updates + cron deletes). Confirm free-tier daily-write limits accommodate projected volume.

## Critical do-NOTs

- Do NOT write through MCP — operations layer direct only
- Do NOT skip HMAC verification or timestamp replay protection
- Do NOT exceed `private_metadata` 3000-char limit — store full args in `bot_create_proposals`, only proposalId in metadata
- Do NOT use the same `trigger_id` after 3 seconds
- Do NOT introduce free-text resource entry — hard data-integrity violation
- Do NOT add a deterministic pre-LLM classifier — LLM tool-choice IS the trigger; modal is the gate
- Do NOT extend modal scope to update paths in 1.0
- Do NOT extend modal scope to disambiguation in 1.0
- Do NOT block on Data Integrity TP queue — that's parallel cleanup work
- Do NOT skip Spike C — it's the architecture gate
- Do NOT ship Wave 7 prompt-only — code-level termination fail-safe required
- Do NOT skip preflight or canary on the runway-targeted PR
- Do NOT push directly — cross-fork PR against `runway`
- Do NOT attempt to override Slack's modal styling beyond Block Kit's bounds — visual personality is emoji language (📋 ✏️ ⚡ 👤 ⚠️) + Civ brand voice + clean section/divider hierarchy
- Do NOT skip the manual `pnpm runway:push` gate after Wave 1 schema migration

## Stop conditions (CC returns to operator)

- Spike C finds AI SDK v6 doesn't support clean termination AND no fast-path → operator decides architecture (per-conversation flag / scope-cut to slash-only / drop bot-intercept)
- Spike A finds `createWeekItem` cascades on insert AND no clean refactor path → operator decides cascade-safe recipe vs refactor vs scope cut
- Spike B finds `addProject` rejects dates on insert → operator confirms 2-step Modal 3 flow
- Status/category matrix expansion surfaces a 5th+ rule from review that needs decision
- `view_submission` async write pattern requires more than 3 hours of work → return for re-scope
- Holdout QA finds a critical bug not in the wave spec — fix or escalate
- Multi-panel blind audit returns FAIL on any panel — fix before commit
- Any wave finishes (always stop and report; CC continues autonomously after report unless told to halt)
- Turso connection issue, env var problem, or anything that blocks reading data
- ngrok testing reveals modal renders incorrectly in real Slack
- Latency exceeds 2.5s p95 in real testing AND fast-path doesn't recover

## On re-engagement after compaction

1. Read this pre-plan v4
2. Read `~/.claude/projects/-Users-jasonburks-Documents--AI---R1/memory/project_slack_modal_spec.md` (field design)
3. Read `docs/tmp/slack-modal-data-tp-brief.md` (architecture grep)
4. Read `docs/tmp/slack-modal-cc-handoff.md` (execution contract / methodology)
5. Read `CLAUDE.md` and `.claude/MEMORY.md` (project conventions)
6. Read existing Slack handlers + operations layer + bot tools (per CC handoff read-stack)
7. Resume at the next unfinished wave from progress markers in commits or `docs/tmp/slack-modal-progress.md`
