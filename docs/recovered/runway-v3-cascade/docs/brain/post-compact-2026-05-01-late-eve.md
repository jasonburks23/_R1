# Post-compact resume — 2026-05-01 late-late eve (Modal Gate 4 fix-pending, Gantt Track 1 + Track 2 round-3 closing)

## TL;DR

- **Modal CC:** Phases 0-3 ✅ (20 commits on `feature/slack-modal`, 2707 tests, 0 lint errors). Gate 4 ngrok manual test caught **2 integration bugs** in Phase 1 modal view builders (title >25 chars + empty dropdown options). Fix-builder paste-block already sent to operator. After fix lands, resume Gate 4 manual test from Test 1.
- **Gantt CC:** Phase A/B/C ✅. Track 1 (#29) audit-clean — pending dead-code delete + MCP curl smoke to close. Track 2 (#30) round-3 micro-fix dispatched (statusClass for completed/canceled returning wrong class — bars rendered blue instead of green/gray). Phase D (#32) + Phase Z (#31) pending sequential.
- **ngrok manual test setup is LIVE** — preserve through compaction: port 3001 dev server, ngrok URL `https://raina-procephalic-lawerence.ngrok-free.dev`, Inngest dev with `--no-discovery -u :3001` flag.
- **3 queued workstreams unchanged:** Dashboard cleanup PR (3 items), MCP B/C, client-facing branded Gantt.

## Modal CC — Gate 4 bugs (in flight)

Manual test reproduction: `/runway-new-task my new task` → Slack "did not respond" → dev server logs:

```
[ERROR] web-api:WebClient:0 must be less than 25 characters [json-pointer:/view/title/text]
[ERROR] web-api:WebClient:0 must provide at least 1 items [json-pointer:/view/blocks/9/accessory/options]
Error: An API error occurred: invalid_arguments
    at async handleCreate (src/app/api/slack/commands/route.ts:402:3)
```

**Bug 1 — title >25 chars:** `buildTaskModal` (and likely `buildProjectModal` + `buildTeamMemberModal`) generate titles exceeding Slack's hard 25-char limit on `view.title.text`. Static prefix "Review and save - " is 18 chars, leaving impossibly little for dynamic title.

**Bug 2 — empty dropdown options:** `blocks[9].accessory.options` is an empty array. Some static_select dropdown in task modal renders with zero options. Block 9 by structure is likely the resources row repeater accessory or owner/category dropdown.

Both bugs are integration-level — Phase 1 unit tests verified view shape but not Slack's API contract. Holdout audit + curl smokes wouldn't catch (they're external-API contract issues).

**Fix-builder paste-block sent to operator** with reproduction + scope. Operator pastes when ready. After fix lands clean: operator resumes Gate 4 manual test from Test 1.

## Gate 4 setup state (preserve through compaction)

- Terminal 1: `pnpm dev` in `slack-modal` worktree → port **3001** (port 3000 busy from gantt-cli)
- Terminal 2: `NPM_CONFIG_CACHE=$(mktemp -d) npx --yes --ignore-scripts=false inngest-cli@latest dev --no-discovery -u http://localhost:3001/api/inngest` → port 8288
- Terminal 3: `ngrok http 3001` → `https://raina-procephalic-lawerence.ngrok-free.dev`
- Slack app manifest already updated: Interactivity URL + 6 slash commands all point at the ngrok URL
- App reinstalled to workspace (Slack token did NOT rotate)
- `.env.local` has `MODAL_INTERCEPT_ENABLED=true` (added late-eve), `RUNWAY_SHARE_SECRET` (gantt-cli only)
- ngrok free-tier: URL may rotate if tunnel disconnects; Slack manifest needs re-pointing if so

## Gantt CC pending closures

- **Track 1 (#29)**: dead-code delete (`gantt-generate/route.ts`, ~70 lines) + MCP curl-smoke against `/api/mcp/runway` with `tools/call` for `render_gantt`. After both: close #29.
- **Track 2 (#30)**: round-3 micro-fix in flight (2-line statusClass fix in `gantt-section-dark.tsx` for completed/canceled). After fix lands: operator re-eyeballs `/runway` By Account tab visual, close #30.
- **Phase D (#32)**: theme-style triple-truth unification (STYLES + STYLES_BRANDED + `gantt-dark-embed.module.css` → single source) plus shim cleanup. Sequential after #29 + #30.
- **Phase Z (#31)**: holdout QA + 5-panel blind audit + preflight. Sequential after #30 + #32.

## Carryover items / pre-existing issues

- **`background_jobs` error in dev server logs:** `job-tracker.ts` Inngest function tries to write to missing `background_jobs` table. Pre-existing, not Modal's bug. Note for future debugging.
- **gantt-cli worktree has stale `@inngest@3.50.0`** (CVE-2026-42047). Package.json declares `^3.54.0` but lockfile/node_modules pre-date the upgrade. `pnpm install` in gantt-cli worktree fixes. Defer to Phase D or post-merge cleanup.
- **Track 1 Slack DM smoke deferred to Phase Z** — full bot-DM-to-shareUrl smoke happens at integration phase when both Modal + Gantt branches converge (ngrok repointing not worth doing twice).
- **`RUNWAY_SHARE_SECRET` ship-time sync:** gantt-cli `.env.local` has it; main repo `.env.local` + Vercel prod env need it before merging Phase C to runway. Tracked in Phase C PR description note.

## What not to repeat

- **Don't run `pnpm runway:push` from a worktree without `.env.local` symlinked to main repo first.** Drizzle-kit silently falls through to local SQLite when `RUNWAY_DATABASE_URL` unset. Already burned this once tonight; symlink + verify before any mutation.
- **Don't trust unit test pass = Slack API accept.** Phase 1 view builder tests passed; Slack rejected at Gate 4 with title-length + empty-options errors. Live API integration is the only catch.
- **Don't hold operator's bandwidth on serial gates when they don't share dependencies.** Manifest gate (Gate 3) and ngrok test gate (Gate 4) were originally separate; folded together once it became clear Phase 2/3 didn't need manifest live.

## On re-engagement

1. Read MEMORY.md (auto-loaded)
2. Read `project_runway_post_pr95.md` (current state)
3. Read this brain doc
4. Read `handoff-prompt-2026-05-01-late-eve.md`
5. Ask operator:
   - Did Modal CC fix-builder land? Manual test resumed?
   - Did Gantt Track 1 (#29) close (dead-code + MCP smoke)?
   - Did Gantt Track 2 (#30) round-3 land + visual sign-off pass?
   - Phase D (#32) + Phase Z (#31) dispatched?
   - Anything else moved?

## Worktrees in flight

| Worktree | Branch | Purpose | Status |
|---|---|---|---|
| runway-v3-cascade | feat/canary-skill | TP coordination | Active; brain docs + handoff |
| gantt-cli | feature/gantt-cli | Tracks 1 + 2 + Phase D + Phase Z | Active; multiple agents in flight |
| slack-modal | feature/slack-modal | Modal Phase 0-3 done, Gate 4 fix pending | Active; ngrok setup live |
| dashboard-polish | fix/runway-dashboard-polish | PR #96 merged | Disposable |
| data-tp-runway | (Data TP's) | Hopdoddy done, TAP next | Continuing |
| pr88-v4-hardening | feature/runway-pr88-v4-hardening | Historical | Disposable |
| wave1-polish | feature/wave1-polish | Historical | Disposable |
