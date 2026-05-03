# Modal CC — memory-only file inventory (post-wipe validation)

Reconstructed from in-context memory only. No disk reads. Paths are relative to slack-modal worktree root unless noted.

Notation: `(unsure: …)` flags items I'm not fully certain about.

---

## Phase -1 — pre-plan v7 update + state files (Modal CC orchestrator, no subagent)

- `docs/tmp/slack-modal-pre-plan.md` — v6 → v7 in-place edit, 16 deltas (A1-A6, B1-B7, C1-C8, D1-D7, E1-E5, H1-H3, I)
- `docs/tmp/slack-modal-orchestrator-state.md` — initialized, then updated after each phase + each Phase 3 builder + fix-builder
- `docs/tmp/slack-modal-progress.md` — initialized, then updated continuously
- `docs/tmp/slack-modal-brain-2026-04-30.md` — post-Phase-2 snapshot
- `docs/tmp/operator-greenlight-2026-04-30.md` — operator's Hybrid architecture decision (saved by operator, may have been pre-existing)
- `docs/tmp/spikes-result.md` — consolidated A+B+C spike findings
- `docs/tmp/slack-modal-data-tp-brief.md` (unsure: whether I created or operator/TP did)
- `docs/tmp/slack-modal-cc-handoff.md` (unsure: whether I created or pre-existing)

## Spike A — createWeekItem cascade behavior (no source code; investigation only)

- (unsure: spike findings folded into `docs/tmp/spikes-result.md`; no standalone files written that I recall)

## Spike B — addProject dates behavior (no source code; investigation only)

- (unsure: same as Spike A — folded into `docs/tmp/spikes-result.md`)

## Spike C — LLM termination / stopOnModalOpened

- `src/lib/slack/spike-c-termination.test.ts` — disposable spike test; integrated/renamed by Builder 7 to `intercept.test.ts`. Original file removed before Phase 2 cherry-picks.

## Explore — Slack infra

- (No files written — read-only investigation of `src/lib/slack/verify.ts`, `src/app/api/slack/events/route.ts`, `proxy.ts`, `@slack/web-api` v7.15.0 capabilities.)

## Explore — Inngest + bot context

- (No files written — investigation of `src/lib/inngest/client.ts` Events union, `src/lib/runway/bot-context.ts:37-102`, `bot-context-behaviors.ts`, `bot-context-sections.ts`, `src/lib/slack/bot.ts:204-210` loop.)

## Explore — ops + validators

- (No files written — investigation of `src/lib/runway/operations-utils.ts`, `operations-add.ts`, `operations-writes-week.ts`, `operations-writes-project.ts`, `operations-writes-team.ts`, status/category compatibility rules.)

## Builder 0a — bot-tools + bot-context (commit a145692)

- `src/lib/slack/bot-tools.ts` — extended `create_project` zod schema with `engagementType`, `parentProjectId`, `contractStart`, `contractEnd`, `startDate`, `endDate`, `isRetainer`; extended `update_project_field` field enum to include `engagementType`
- `src/lib/runway/bot-context-behaviors.ts` — added `buildModalInteractionRules()` exporter
- `src/lib/runway/bot-context.ts` — injected new section into sections array
- `src/lib/slack/bot-tools.test.ts` — extended (+11 cases)
- `src/lib/runway/bot-context.test.ts` — new

## Builder 0b — operations layer hardening (commit a75bc8d)

- `src/lib/runway/operations-utils.ts` — added validators (`normalizeEmptyToNull`, `validateStatusCategoryCompatibility`, `validateRoleTagOnResources`, `validateStartEndDateOrder`, `validatePastDateNonTerminal`, `validateNotesMaxLength`); `AuditSource` union; `AuditEvent` interface; `formatModalUpdatedBy`; `INTERCEPT_ALLOWLIST`/`INTERCEPT_EXCLUDED` constants
- `src/lib/runway/operations-add.ts` — wired validators inside `addProject`; added `auditObserver?` + `source?` params
- `src/lib/runway/operations-writes-week.ts` — wired in `createWeekItem` + `updateWeekItemField`; added `auditObserver?`/`source?`
- `src/lib/runway/operations-writes-project.ts` — wired in `updateProjectField`; added params
- `src/lib/runway/operations-writes-team.ts` — wired in `createTeamMember`; added params
- `src/lib/feature-flags.ts` — NEW; exports `isModalInterceptEnabled()` reading `MODAL_INTERCEPT_ENABLED`
- `src/lib/feature-flags.test.ts` — NEW
- `src/lib/runway/fuzzy-match.ts` — NEW; exports `sorensenDice(a, b): number`, `fuzzyMatchCandidates<T>(name, candidates, getName, threshold=0.6): T[]`
- `src/lib/runway/fuzzy-match.test.ts` — NEW
- `src/lib/runway/operations-utils.test.ts` — extended
- `src/lib/runway/operations-add.test.ts` — extended (unsure: exact path)
- Per-write-helper test files extended for observer/source assertions
- `src/lib/runway/intercept-allowlist.test.ts` — NEW lint-guard (asserts every `bot-tools.ts` `^create_` tool is in INTERCEPT_ALLOWLIST or INTERCEPT_EXCLUDED)

## Builder 0c — Slack fixtures + test helpers (commit dd32d2c)

- `tests/fixtures/slack/block-actions-button-click.json`
- `tests/fixtures/slack/block-actions-checkbox-toggle.json`
- `tests/fixtures/slack/block-actions-multi-detect-chain.json`
- `tests/fixtures/slack/view-submission-task.json`
- `tests/fixtures/slack/view-submission-project.json`
- `tests/fixtures/slack/view-submission-retainer.json`
- `tests/fixtures/slack/view-submission-team-member.json`
- `tests/fixtures/slack/view-closed.json`
- `tests/fixtures/slack/slash-command-create.json`
- `tests/fixtures/slack/slash-command-edit-multimatch.json`
- `tests/fixtures/slack/event-callback-message.json`
- `src/lib/slack/test-helpers.ts` — extended with `loadFixture(name)` + `mutateFixture(fixture, overrides)`
- `src/lib/slack/test-helpers.test.ts` (unsure: may be co-located OR fixture-sanitization regex test in a separate file)

## Builder 1 — schema + Inngest event (commit 692d3e2)

- `src/lib/db/runway-schema.ts` — added `botModalProposals` table (20 cols, 4 indexes); added `updates.source` nullable column
- `drizzle-runway/0006_little_punisher.sql` — generated migration
- `drizzle-runway/meta/0006_snapshot.json` — generated snapshot
- `src/lib/inngest/client.ts` — Events union added `slack-modal/submit` event with locked schema (proposalId, userId, teamId, channelId, threadTs, modalCallbackId, triggerId, stateValues, submittedAt)
- `src/lib/db/runway-schema.test.ts` — DB-level integration tests (6 gated on RUNWAY_DATABASE_URL)
- `src/lib/db/test-db.ts` — DDL patched for in-memory tests (added `source` column + `bot_modal_proposals` table)
- `docs/tmp/wave-1-runway-push-needed.md` — operator gate doc

## Builder 13 — Civ-voice copy module (commit 36ada9f)

- `src/lib/slack/modals/copy.ts` — NEW; 18 exports including `BASELINE_PARENT_PICKER_HINT`, `formatMultiMatchHint(n, name, kind)`, `MODAL_HEADERS`, expired/cancelled/disabled-task ephemeral strings, civ-voice confirmations
- `src/lib/slack/modals/copy.test.ts` — NEW; em-dash + en-dash + L1/L2 grep-guard tests; exact string assertions

## Builder 0d — source-tagging sweep (Phase 1; commit unknown — was after Phase 0 wave-end)

- `src/lib/slack/bot-tools.ts` — 6 call sites tagged `source: "bot-direct"`
- `src/lib/mcp/runway-tools.ts` — 6 MCP wrappers tagged `source: "mcp"` via `{...params, source: "mcp"}`
- `src/lib/mcp/runway-tools.test.ts` — 13 wrapper tests updated
- `scripts/runway-migrations/*.ts` — 55 call sites tagged `source: "migration"` (multiple files; unsure: exact list)
- `src/lib/runway/operations-writes-project.ts` — `updateProjectStatus` extended with `auditObserver?` + `source?` (Builder 0b open follow-up)
- `src/lib/runway/source-coverage.test.ts` — NEW lint guard

## Builder 2 — /api/slack/interactivity scaffold (commit baac936)

- `src/app/api/slack/interactivity/route.ts` — NEW; HMAC verify + 5-min replay + payload type routing (block_actions / view_submission / view_closed / shortcut) with NotImplementedError markers
- `src/app/api/slack/interactivity/route.test.ts` — NEW; 25 tests
- `proxy.ts` — appended `/api/slack/interactivity` to `unauthenticatedPaths`

## Builder 3 — /api/slack/commands slash dispatcher (commit 07ff165)

- `src/app/api/slack/commands/route.ts` — NEW; 6 commands (3 create + 3 edit); HMAC verify; URLSearchParams parsing; caller-side fuzzy match for parent hints; edit-flow lookup
- `src/app/api/slack/commands/route.test.ts` — NEW; 21 tests including multi-match hint matrix
- `src/lib/slack/modals/proposal.ts` — NEW; shared `insertProposal()` helper
- `src/lib/slack/modals/proposal.test.ts` — NEW
- `proxy.ts` — appended `/api/slack/commands` to `unauthenticatedPaths` (unsure: whether B2 or B3 made this edit; possibly B2 added both at once)

## Builder 4 — Task modal view builder (commit unknown)

- `src/lib/slack/modals/task.ts` — NEW; `buildTaskModal({args, proposalId, mode, currentValues?, baselineHint?, multiMatchHint?, errorBlock?})`; truncates entity name in edit mode; 39 tests
- `src/lib/slack/modals/task.test.ts` — NEW; source-level grep guard (em-dash, en-dash, L1/L2)

## Builder 5 — Project modal view builder (commit f9fdd19)

- `src/lib/slack/modals/project.ts` — NEW (~853 LOC); `buildProjectModal({...retainerMode...})`; `buildEphemeralRetainerToggle()` exporter; engagementType radio; contractStart/contractEnd datepickers in retainer mode
- `src/lib/slack/modals/project.test.ts` — NEW (~855 LOC, 59 tests)

## Builder 6 — Team Member modal view builder (commit unknown)

- `src/lib/slack/modals/team-member.ts` — NEW; `buildTeamMemberModal({args, proposalId, mode, currentValues?})`; client + full name + role_category (7 schema-truth values) + email
- `src/lib/slack/modals/team-member.test.ts` — NEW; 27 tests

## Builder 12 — Inngest cron expiry sweeper (commit 8d21f13)

- `src/lib/inngest/functions/proposal-expiry-sweep.ts` — NEW (~78 LOC); cron `*/15 * * * *`; mark-expired + delete-stale-terminal steps
- `src/lib/inngest/functions/proposal-expiry-sweep.test.ts` — NEW (~247 LOC, 8 tests)
- `src/lib/inngest/functions/index.ts` — barrel export added

## Builder 7 — Bot LLM intercept (commit b709f5d → cherry-picked 06407ce)

- `src/lib/slack/modals/intercept.ts` — NEW (~421 LOC); `interceptCreateForModal()`, `stopOnModalOpened` StopCondition, `extractInterceptedProposals()`, `composeButtonBearingReply()`, exported `BotReply`/`ReplyBlock` types
- `src/lib/slack/intercept.test.ts` — NEW (~473 LOC, 25 tests; replaces spike-c-termination.test.ts)
- `src/lib/slack/bot-tools.ts` — `createBotTools(userName, now, options?)` accepts `{convoState, context}`; INTERCEPT_ALLOWLIST tools route via interceptCreateForModal first; bot-direct fallback path; added `create_team_member` to MUTATION_TOOLS
- `src/lib/slack/bot.ts` — generates per-call `intentGroupId`; builds convoState; `prepareStep` callback; `stopWhen: [stepCountIs(MAX_STEPS), stopOnModalOpened]`; post-loop branches on extractInterceptedProposals; single button-bearing chat.postMessage path
- `src/lib/slack/bot.test.ts` — extended (unsure: count)

## Builder 9 — view_submission validator + stub view-builder swap-in (commits 10033af + 3e0489c)

- `src/lib/slack/modals/validate-submission.ts` — NEW (~1001 LOC); validator chain (status/category, role-tag, date-order, contract-order, past-date soft-warn, notes max length, parent-must-be-retainer, lazy parent resolution, edit-flow changed-field diff, target-still-exists, title-collision soft-warn)
- `src/lib/slack/modals/validate-submission.test.ts` — NEW (~1132 LOC, 38 tests)
- `src/app/api/slack/commands/route.ts` — stub view builders removed; real `buildTaskModal`/`buildProjectModal`/`buildTeamMemberModal` wired through `buildModalView` dispatcher
- `src/app/api/slack/commands/route.test.ts` — 20 tests updated with `vi.doMock` of three builders

## Builder 14 — observability + intercept-miss alert (commits 2acb425 + 8f5b3b7)

- `src/lib/slack/modals/observability.ts` — NEW; in-memory counters + structured `[modal-metrics]` console.log; `recordProposalLifecycleTransition`, `recordValidatorRejection`, `recordMultiDetectFanOut`
- `src/lib/slack/modals/observability.test.ts` — NEW (15 tests)
- `src/lib/slack/modals/intercept-miss-alert.ts` — NEW; `createInterceptMissObserver` factory returning AuditObserver; warns on bot-direct creates with no recent submitted modal proposal in last 5 min
- `src/lib/slack/modals/intercept-miss-alert.test.ts` — NEW (14 tests)
- `src/app/api/inngest/route.ts` — registered `sweepExpiredProposals` (Builder 12 carryover)
- `src/app/api/inngest/route.test.ts` — updated count assertion (11 → 12)
- `src/lib/inngest/functions/index.ts` (unsure: whether 14 also touched, or just 12)
- `src/lib/inngest/functions/index.test.ts` — count updated

## Builder 8 — interactivity action handlers + multi-detect (commit 63c380c)

- `src/app/api/slack/interactivity/route.ts` — wired open_create_modal / is_retainer_checkbox / task_button_disabled / target_entity_picker; view_submission Inngest dispatch (uses locked client.ts schema field names: userId, stateValues, modalCallbackId, etc); 252 → 681 LOC
- `src/app/api/slack/interactivity/route.test.ts` — extended 316 → 914 LOC, +34 tests including hint computation matrix
- `src/lib/slack/modals/multi-detect.ts` — NEW (~261 LOC); `reEmitButtonsAfterParentSave(parentProposalId, resolvedProjectId, savedProjectName, slack, db)`; chat.update with chat.postMessage fallback on cant_update_message / message_not_found / edit_window_closed; bails gracefully when parent has no postedMessageTs
- `src/lib/slack/modals/multi-detect.test.ts` — NEW (~472 LOC, 9 tests)

## Builder 10 — slack-modal/submit Inngest function + carryovers (commit 14cbc9b)

- `src/lib/inngest/functions/slack-modal-submit.ts` — NEW (~754 LOC); idempotency-check / submitter-check / validate / write (kind branch) / mark-submitted (separate tx) / multi-detect-chat-update / post-confirmation; uses `formatModalUpdatedBy(userId, surface, mode)`; `idempotencyKey: proposalId`; bridges clientId → clientSlug + projectName via `getAllClients()`/`getProjectsForClient()` reverse lookups
- `src/lib/inngest/functions/slack-modal-submit.test.ts` — NEW (~866 LOC, 18 tests)
- `src/lib/inngest/functions/index.ts` — registered `slackModalSubmit`
- `src/lib/inngest/functions/index.test.ts` — count updated
- `src/app/api/inngest/route.ts` — added to serve() functions array (count 11 → 12)
- `src/app/api/inngest/route.test.ts` — updated assertion
- `src/lib/slack/bot-tools.ts` — wired `createInterceptMissObserver()` into all 3 INTERCEPT_ALLOWLIST tools' bot-direct fallback paths (Carryover #1)
- `src/lib/slack/bot-tools.test.ts` — +50 LOC of tests
- `src/lib/slack/modals/proposal.ts` — added `updatePostedMessage(proposalId, ts, channel)` helper (Carryover #2)
- `src/lib/slack/modals/proposal.test.ts` — extended +41 LOC
- `src/lib/slack/bot.ts` — wired `updatePostedMessage` post-loop after successful intercept reply postMessage (Carryover #2)
- `src/lib/slack/bot.test.ts` — +67 LOC of tests
- `src/lib/slack/modals/copy.ts` — added `MODAL_VALIDATION_FAILED_INTRO`, `formatWriteError`, confirmation strings
- `src/lib/slack/modals/copy.test.ts` — +20 LOC

## Builder 11 — view_closed cancellation + concurrency soft-warn (commit e6e741b)

- `src/app/api/slack/interactivity/route.ts` — wired view_closed branch (parses private_metadata.proposalId, no-ops on terminal status, marks cancelled with statusReason "user-dismissed", fires recordProposalLifecycleTransition, posts Civ-voice thread reply); +127 LOC
- `src/app/api/slack/interactivity/route.test.ts` — +266 LOC of tests
- `src/lib/slack/modals/concurrency-check.ts` — NEW (~162 LOC); `checkConcurrentProposal({clientSlug, toolName, fuzzyTitle, currentUserSlackId, currentChannelId, db})` returns `{hasConcurrent, otherUser?, otherTitle?, createdAt?}`
- `src/lib/slack/modals/concurrency-check.test.ts` — NEW (~308-332 LOC, ~14 tests)
- `src/lib/slack/modals/team-member.ts` — added `notify_on_close: true`
- `src/lib/slack/modals/task.ts` — added `notify_on_close: true` (unsure: whether B11 modified, but spec said all 3)
- `src/lib/slack/modals/project.ts` — added `notify_on_close: true` (unsure: same as above)
- `src/lib/slack/modals/team-member.test.ts` — +17 LOC
- `src/lib/slack/modals/copy.ts` — added `MODAL_CANCELLED_THREAD_REPLY`, `CONCURRENT_PROPOSAL_SOFT_WARN(otherUser, otherTitle)`
- `src/lib/slack/modals/copy.test.ts` — +40 LOC

## Fix-builder (post-Builder-11, pre-Gate-4) — title length + empty options (commit 3461a3c)

- `src/lib/slack/modals/copy.ts` — shortened MODAL_HEADERS static prefixes to ≤24 chars: "New task", "New project", "New retainer", "New team member"; kept edit formatters
- `src/lib/slack/modals/copy.test.ts` — locked new strings, added `<25` length assertion
- `src/lib/slack/modals/task.ts` — switched resources_name_block_0 from static_select to external_select with min_query_length:0
- `src/lib/slack/modals/task.test.ts` — +115 LOC; recursive Slack-block-shape walker (title length + empty-options guards)
- `src/lib/slack/modals/project.ts` — same Name picker fix as task.ts
- `src/lib/slack/modals/project.test.ts` — +108 LOC; same guards (covers both project + retainer modes)
- `src/lib/slack/modals/team-member.ts` — added `truncateTitle` helper (was missing)
- `src/lib/slack/modals/team-member.test.ts` — +79 LOC; same guards + updated existing "Sam Rivera" test that now truncates

## Operator gate docs

- `docs/tmp/wave-1-runway-push-needed.md` — Builder 1 wrote (Operator Gate 2)
- `docs/tmp/slack-app-manifest-checklist.md` — Modal CC wrote at Phase 1 wave-end (Operator Gate 3)
- `docs/tmp/wave-14-complete-handoff.md` — Modal CC wrote at Phase 3 wave-end (Operator Gate 4)
