# Slack Modal — Data Integrity TP architecture brief (verbatim)

Pasted 2026-04-29. Result of Data TP's grep agent (~17 tool uses, 84.9k tokens, ~2 min) mapping the bot's create-vs-update intent flow. This is the architectural ground truth that displaces the slash-command-as-primary design in the original pre-plan.

## What the operator wants

When someone in Slack DM-converses with the Runway bot in natural language and the bot decides this input means "create a NEW retainer wrapper, NEW L1 project, or NEW L2 week_item," surface a Slack modal first. User confirms / fills missing fields / cancels in the modal; the write only fires after submit.

Modal scope: net-new creates only (not updates). Three target entities: wrapper, L1, L2.

## Current pipeline (verified from code, file:line refs included)

### Intent classification
- Pure LLM tool-calling via Vercel AI SDK's `generateText`, model `claude-haiku-4-5-20251001`.
- `src/lib/slack/bot.ts:204-210` — `generateText({ model, messages, tools, stopWhen: stepCountIs(MAX_STEPS=12), maxRetries: 1 })`.
- Slack DM → `/api/slack/events/route.ts:115-125` enqueues Inngest → `inngest/functions/runway-slack-message.ts:48` calls `handleDirectMessage` → spawns the LLM tool loop.
- No regex, no rules-based router, no separate classifier. The model emits `toolCalls` and the dispatch happens inside the AI-SDK loop.

### Create-vs-update decision
- Lives entirely in the LLM's prompt-driven choice between `create_*` and `update_*` tool names.
- The "policy" is text in `src/lib/runway/bot-context-behaviors.ts:67-85,96-125` — confirmation rules, ambiguity guidance, "Sound right?" prompt before creating a project — purely instruction to the model, NOT enforced anywhere in code.
- `src/lib/slack/bot.ts:223-238` only LOGS tool calls AFTER they execute. There's no pre-write hook today.

### Tool surface (bot-tools.ts)

| Create-side | Update-side |
|---|---|
| `create_project` (line 261) | `update_project_status`, `update_project_field` |
| `create_week_item` (line 369) | `update_week_item` |
| `create_pipeline_item` (line 527) | `update_pipeline_item` |
| `create_team_member` (line 611) | `update_team_member`, `update_client_field` |

Plus `add_update` (note-only, not a write), `undo_last_change`, three `delete_*`.

### Wrapper creation is broken at the bot layer
- A "wrapper" needs `engagementType="retainer"` + `parentProjectId=null` + child L1s linked.
- Bot's `create_project` (`bot-tools.ts:264-273`) does NOT expose `engagementType`, `parentProjectId`, `contractStart`, or `contractEnd`. It only takes `clientSlug, name, status, owner, resources, dueDate, waitingOn, notes`.
- `update_project_field`'s field enum (`bot-tools.ts:315-323`) excludes `engagementType` entirely.
- MCP's `add_project` (`runway-tools.ts:512-527`) and the underlying `addProject` operation (`operations-add.ts:36-49`) DO expose all the wrapper fields. The bot is the bottleneck.
- Net effect: the bot literally cannot create a retainer wrapper today. Modal work needs to either fix this gap first or accept that "wrapper" is an MCP/data-tp-only path.

### Modal scaffolding state
- ZERO. Grep for `views.open|modal|interactivity|block_actions|view_submission` across `src/` returns no Slack-modal hits.
- No `/api/slack/interactivity` route. Slack signature verification exists in `src/lib/slack/verify.ts` (reusable). Slack client at `src/lib/slack/client.ts` is currently used for `chat.postMessage` only.

### The hard architectural problem
- `generateText`'s `execute:` callback inside each `tool({ ... })` definition runs inside the LLM loop. It must resolve a result before `generateText` proceeds.
- A modal-gated flow can't just "pause" the loop and wait for user submit — Vercel AI SDK doesn't support resumable tool calls in this shape.
- Realistic shape: when an `execute` callback for a `create_*` tool fires, it stores the proposed args server-side, opens a Slack modal, returns a "modal opened, awaiting confirmation" result to the LLM (which will likely respond to user "I've opened a confirmation modal"), and TERMINATES the run. On modal submit, a new `/api/slack/interactivity` handler picks up the stored args and invokes the underlying `addProject` / `createWeekItem` directly (bypassing the LLM round-trip).

### Disambiguation gaps that affect modal scope
- Per `bot-context-behaviors.ts:80-85`, ambiguity is resolved by prompt instruction (LLM asks). Examples don't cover create-vs-update specifically.
- "Add a follow-up for Convergix" likely defaults to `create_week_item` — no instruction to first search for existing matches.
- `addProject` blocks exact-normalized duplicate names (`operations-add.ts:106`), but close-but-not-equal names would slip through.
- A modal could also be a disambiguation surface: "We found 3 similar existing items. Update one, or create new?"

## Design questions for thought-partner

1. **Architectural shape.** Confirm or refine the proposed flow: `execute` callback for `create_*` opens a modal + terminates the LLM run + stores proposed args (where? Inngest event payload, KV, DB row?). On modal submit, a fresh handler dispatches the create. Identify the failure modes (what if user dismisses the modal? Where does the conversation thread state live? Is there a TTL on stored proposals?).

2. **Wrapper-creation gap.** Is the right move to (a) extend bot's `create_project` to accept `engagementType`/`parentProjectId`/`contractStart`/`contractEnd`, then build the modal on top of the unified tool, OR (b) leave wrapper creation as MCP/data-tp-only and skip modal-for-wrapper, OR (c) add a dedicated `create_retainer_wrapper` bot tool that is modal-gated by default? Trade-offs?

3. **Modal as disambiguation gate.** Should the modal trigger ALSO fire when input is ambiguous between create and update (e.g., proposes "Update existing X (90% match)" vs "Create new" toggles)? Or strictly net-new only?

4. **Update path.** Operator scoped this to creates. But are there high-impact UPDATES that should also gate behind a modal (status changes on multi-month projects, parent_project_id assignments, contract date changes)? Surface as a follow-on, don't fold in.

5. **Slack interactivity stack.** New route at `/api/slack/interactivity`, signature verify, modal definition format (Block Kit), state-passing between LLM proposal and modal submit. Identify reusable parts of existing `bot-tools.ts` argument validation so the modal handler shares the same write-path.

6. **What does "create signal" mean concretely.** The bot today decides `create_*` purely from prompt text. Do you want to keep that LLM-driven? Or add a deterministic pre-LLM classifier (regex / keyword / lookup) that flags "this looks like a create" before the LLM picks a tool? Implications for false-positive modal pops.

7. **Confirm the resumable-flow assumption.** I claimed `generateText` can't pause and resume. Verify against current AI SDK v6 docs — there may be a streaming-tool-result pattern that allows it. If yes, the architecture changes substantially.

## Reference files (hydration list)

- `src/lib/slack/bot.ts` — main loop, model config, MAX_STEPS, MUTATION_TOOLS list.
- `src/lib/slack/bot-tools.ts` — all tool definitions with `execute:` callbacks. Modal injection points live here.
- `src/lib/runway/bot-context-behaviors.ts` — system-prompt instructions (intent guidance lives here).
- `src/lib/runway/bot-context.ts`, `bot-context-sections.ts` — system prompt assembly.
- `src/lib/mcp/runway-tools.ts` — MCP tool registry (compare full surface vs bot's restricted surface).
- `src/lib/runway/operations-add.ts`, `operations-writes-project.ts` — underlying write helpers (modal handler will call these directly post-submit).
- `src/app/api/slack/events/route.ts` — Slack event ingress, signature verify pattern.
- `src/lib/inngest/functions/runway-slack-message.ts` — Inngest function that owns the conversation lifecycle.
- `src/lib/slack/verify.ts` — Slack signature verification helper.
- `src/lib/slack/client.ts` — Slack Web API client.
