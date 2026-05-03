# Slack-modal "Add Project / Add Task" flow — handoff to Data Integrity TP

Captured 2026-04-28. This doc proposes pairing your PR #96 (Slack-add hygiene + field validators) with a Slack modal UI so users physically cannot submit incomplete data. The validators are the engine; the modal is the UX that exposes them at input time.

## Problem we're solving

Right now when someone uses Slack to add a new project or task to Runway, they often:

- Provide a start date but no end date
- Skip required fields they don't realize are required (owner, resources, category, parent project)
- Leave nullable fields null when they actually have the info
- Type free-text values that don't match canonical client/team-member names

The result: the bot writes incomplete records, and we discover the gaps later during cleanup arcs (Bonterra, Convergix, HDL, LPPC, AG1+S+B). PR #96 is shoring up the validators on the write side. The modal is the input-side mirror — required fields can't be left blank, dropdowns force canonical values, and validation errors surface inline before the record is written.

## What a Slack modal is (one paragraph)

A modal is a popup form that floats over the Slack channel, looks native (same fonts, same buttons), and supports text inputs, single/multi-select dropdowns (static or dynamic-populated from your DB), date pickers, radios, checkboxes, file uploads, multi-line inputs. Required fields can be marked at the schema level — Slack itself blocks submit if any are blank. On submit, your backend receives a structured JSON payload with every field's value, can return validation errors that Slack displays inline next to the bad field, and either confirms success or pushes a second modal view onto the stack.

**Reference URLs:**

- **Block Kit Builder (visual designer):** `https://app.slack.com/block-kit-builder` — opens a fake Slack with a modal you can edit live. Switch the top-left dropdown to "Modal Preview" and click "Templates" to load a working starting point.
- **Slack modals docs:** `https://api.slack.com/surfaces/modals` — covers the lifecycle, payload shapes, and trigger requirements. (If that URL has migrated, search "Slack Block Kit modals" — same content under `docs.slack.dev`.)

## Proposed "Add Project" modal — concrete fields

| Field | Type | Required | Source / behavior |
|-------|------|----------|-------------------|
| Client | Dynamic dropdown | Yes | Populated from clients table at modal-open time |
| Project name | Plain text input | Yes | Free text |
| Start date | Datepicker | Yes | — |
| End date | Datepicker | Yes | Server validates: must be ≥ start date |
| Owner | Static dropdown | Yes | Populated from active team members |
| Resources | Multi-select | No | Populated from active team members |
| Category | Static dropdown | Yes | Use the canonical category list (kickoff/build/launch/retainer/etc.) |
| Parent wrapper | Dynamic dropdown | No | Optional; populated from existing wrappers for the chosen client |
| Level | Radio (L1 / L2) | Yes | Drives whether parent wrapper is required |
| Notes | Multi-line text | No | Free text |

**Add Task** is the same pattern with task-specific fields (parent project required, week-of, status, etc.).

## How natural-language triggers work (the key UX win)

Modals require a `trigger_id` from a user action. Bare `@mention` events from the bot do NOT include one. So the bot can't directly pop a modal from free-text. Use this pattern instead:

1. User types `@Civilization Runway add a project for HDL website refresh, starting May 1`.
2. Bot's LLM parses intent + extracts whatever fields it can (`client=HDL`, `name=website refresh`, `startDate=May 1`).
3. Bot replies in thread: *"Got it — I have HDL, website refresh, May 1 start. I need a few more fields. [Open form]"* with an "Open form" button.
4. User clicks the button → the button click carries a valid `trigger_id`.
5. Bot opens the modal, **pre-filled with the parsed fields**, blanks for what's missing, required fields marked.
6. User fills the gaps and submits.
7. Backend (PR #96 validators) validates server-side; if anything's wrong, Slack displays inline errors next to the bad field.
8. On success, bot writes via the standard create path and confirms in the thread.

This is actually a UX win, not a workaround:

- Free-text intent feels conversational (low friction)
- The button confirms the bot's interpretation before a popup hijacks the screen
- Pre-filling means the user doesn't re-type what they already said
- The form makes it physically impossible to submit incomplete data

For users who prefer direct invocation, also support a slash command (`/runway add project`) — slash commands carry `trigger_id` natively, so the modal pops immediately without the button hop.

## How this dovetails with PR #96

PR #96 builds the field-completeness and value-canonicality validators in `operations-writes-*.ts`. Those same validators run on:

1. The legacy free-text bot-mention path (current state, with PR #96 hardening)
2. The new modal-submit path (this proposal)
3. Any other write surface (MCP `create_project`, `create_week_item`, future API)

**Shared validators, multiple input surfaces.** The modal isn't a parallel implementation — it's a different UI for the same write rails. If PR #96's validators reject a payload, the modal returns the error to Slack inline, exactly the way the bot would today reject the free-text input.

## What the Data Integrity TP should think through

These are the open design decisions before specing implementation:

1. **Modal vs slash command vs button as the primary trigger.** I recommend supporting all three but defaulting users to the natural-language → button hop because that's where they already are. Slash command is power-user territory.
2. **What fields are required at the schema level vs validated server-side.** Slack-required = user can't submit blank. Server-validated = runs after submit, returns inline errors. Cross-field rules (end ≥ start, parent matches client) must be server-side because Slack doesn't support cross-field validation in the schema.
3. **Edit vs create.** The same modal, pre-filled with current values, becomes an "Edit project" form. Cheap to add once the create version exists. Worth scoping into v1 or deferring?
4. **Wrapper / parent project handling.** If user selects "L2" radio, the parent-wrapper dropdown becomes required and must be a wrapper belonging to the chosen client. This is the kind of cross-field rule that lives server-side.
5. **Where the validators are imported from.** PR #96's validators should be importable from a path that both the bot's free-text handler and the modal's submit handler can use. Same module, two callers.
6. **What happens when the user provides a value the bot can't resolve.** Free-text says "for HDL" but the user means "Hudson Design + Light." Modal's dynamic client dropdown forces canonical values, so this resolves itself — but only if the modal pre-fill skips the field when the parsed value doesn't match a canonical entry, and lets the user pick the right one.

## What's NOT in scope here

- Gantt rendering — separate feature, separate PR. The HTML→PNG render pipeline doc (`docs/brain/html-to-image-render-pipeline.md` in `runway-v3-cascade`) covers that side.
- New Slack app — same Civilization Runway app, just adding modal-handling endpoints to it.
- Migrations — modal is purely a new input surface. Validators are PR #96's territory.

## Suggested next step for the Data Integrity TP

Before specing implementation:

1. Read both reference URLs above; play with the Block Kit Builder for 10 minutes against the "Approval" template (closest analog to the Add Project shape).
2. Confirm scope: is the Add Project modal in PR #96 itself, or a follow-on PR that imports PR #96's validators?
3. Decide whether v1 ships only the natural-language → button path, or also includes the slash command and/or shortcut triggers from day one.
4. Identify which Runway codebase paths the modal endpoints would live in (Slack event handler is already wired; need to add `views.open` and `view_submission` handlers).

This is paired-feature territory — PR #96 (validators) makes the modal possible, the modal (UI) makes PR #96's validators visible at input time. Worth deciding whether to ship them together or sequentially.
