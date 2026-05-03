# Runway Slack Modal Spec — L1/L2/Retainer Creation

Drafted 2026-04-29 to prevent data integrity issues at create time. Maps to issues caught during HDL / AG1 / Bonterra / LPPC / Dave Asprey cleanup arc.

## What we've been fixing → maps to required modal fields

| Issue | Root cause | Modal prevents by |
|---|---|---|
| `endDate=null` on single-day rows | Field optional at create | Auto-compute endDate from date |
| `date=startDate` on range rows | No range/single-day distinction at create | Radio toggle: Single-day vs Range |
| `weekOf != Monday(date)` | Manually entered | Auto-compute server-side |
| `dayOfWeek` mismatched | Manually entered | Auto-compute server-side |
| L1 status/category contradictions | No validation | Compatibility check |
| Wrong role labels (AM: Kathy when no AM at client) | Free-text resources | Role-prefix dropdown |
| Resources missing role prefix | Free-text | Same |
| L1 notes recap full schedule | No prompting | Help text + char limit |
| Generic titles ("Concept Writeups") | No specificity check | Pattern warning |
| Sub-projects jammed into L1 notes | No parent-child UI | Retainer modal asks "wrapper or child?" |
| Wrong category=deadline | No warning | Cascade explainer block |
| Empty-string date fields | Allowed by Drizzle | Server normalize: empty → NULL |
| Soundly NaN/NaN today | Required fields not enforced | All-or-nothing submit |

---

## Modal 1: New L2 (Week Item)

### Required
- **Client** (dropdown of existing clients)
- **Parent project (L1)** (dropdown, filtered by client)
- **Title** (text, min 5 chars)
- **Category** (dropdown): `delivery` / `kickoff` / `review` / `approval` / `deadline` / `launch`
  - Help text per option, especially: ⚠️ `deadline` cascades to parent project's dueDate on date changes
- **Date type** (radio): Single-day / Range
- **Date** (date picker) — single-day = the date; range = endDate
- **Start date** (date picker) — only if Range selected
- **Owner** (dropdown of client team members)
- **Resources** (multi-add row picker: Role dropdown + Name dropdown, comma-joined server-side)
  - Roles: `AM` / `CD` / `Dev` / `CW` / `PM` / `CM` / `Strat` / `Vendor`

### Auto-computed (server-side)
- `endDate` = single-day → same as date; range → same as date (date is end per convention)
- `dayOfWeek` = derived from date
- `weekOf` = Monday(date)
- `status` = default `scheduled`

### Optional
- **Notes** (textarea, help: "Terse — what this row IS. One sentence. Names actor + deliverable.")
- **Blocked by** (dropdown of other rows in same project)

### Validation guards
- If category=`deadline` AND parent project exists → confirmation: *"This will overwrite parent project's dueDate on any future date change. Continue?"*
- If title matches existing title under same client → warning to disambiguate
- Reject submit if any required field empty

---

## Modal 2: New L1 (Project)

### Required
- **Client**
- **Project name** (text, min 5 chars)
- **Engagement type**: `project` / `retainer` / `pipeline`
- **Status** (L1 enum, distinct from L2): `not-started` / `in-production` / `awaiting-client` / `blocked` / `on-hold` / `completed` / `canceled`
- **Category** (L1 enum, distinct from L2): `active` / `awaiting-client` / `pipeline` / `on-hold` / `completed`
- **Owner** (dropdown of client team)
- **Resources** (multi-add as L2 modal)
- **Notes** (textarea — help: "Highlights only. Project identity + shape constraint + terminal date. NOT a schedule recap.")

### Conditional required
- **Start date / End date** — if status = `in-production` or `awaiting-client`
- **Due date** — if engagement_type = `project` AND known launch date
- **Contract start / Contract end** — if engagement_type = `retainer`
- **Parent project** — if this is a wrapped child (modal asks "child of a retainer wrapper?")

### Validation guards (status/category compatibility matrix)
- `not-started` + `on-hold` → reject
- `completed` + `active` → reject
- `in-production` + `on-hold` → reject
- Engagement=`retainer` + no parent → must be a wrapper (route to Modal 3)

---

## Modal 3: New Retainer Wrapper

Special-cased because wrappers have children and date-derivation quirks.

### Required
- **Client**
- **Wrapper name** (e.g., "Social Retainer", "Content Retainer")
- **Engagement type** = `retainer` (locked, hidden)
- **Status** (L1 enum, default `in-production`)
- **Category** (L1 enum, default `active`)
- **Owner**
- **Resources** (full retainer team)
- **Contract start** (date picker)
- **Contract end** (date picker)
- **Notes** (highlights)

### Auto-set / locked
- `parentProjectId` = null (wrappers have no parent)
- `engagement_type` = retainer

### Post-create flow
- Modal closes, second action button: *"Add wrapped child project →"* (opens Modal 2 with engagement=retainer + parent pre-filled)

---

## Cross-cutting implementation rules

1. **Server-side validation mirrors `operations-utils.ts` whitelists** — don't trust client. Reject + re-render modal with error block.
2. **Empty-string normalization** — date-shaped fields: empty → NULL at write boundary. Closes the cross-client gap.
3. **Smart defaults driven by client selection:**
   - Owner dropdown filtered to client's team
   - Resources name picker filtered to client's team
   - Parent project dropdown filtered to client's L1s
4. **Auto-compute fields are server-only** — `dayOfWeek`, `weekOf`, computed `endDate`. User never types these.
5. **All-or-nothing submit** — no partial saves. NaN/null/empty pollution is the Soundly-today problem.
6. **Audit row tagged with `source=slack-modal`** for downstream identification.
7. **Required-field UI cue** — red asterisk + "Required" label; submit disabled until all required filled.
8. **Slash commands:** `/runway-new-project` (Modal 2), `/runway-new-task` (Modal 1), `/runway-new-retainer` (Modal 3).

---

## Cascade-warning UX example (category=deadline)

When user selects `deadline` in Modal 1's category dropdown, expand a help block:

> ⚠️ **Heads up:** Tasks with category "deadline" automatically update the parent project's due date when this task's date moves. This is intentional for hard gates (LAUNCH, contract end). For internal milestones that shouldn't drag the project around, use "delivery" instead.

That alone would have caught the LPPC Phase3 batch overshoot we spent two cards reverting on Pencils Down.

---

## Confirmed safe (per Dave Asprey + LPPC verification 2026-04-29)

`endDate` writes on `category=deadline` rows do NOT cascade. Only `date` writes do. Modal can safely write endDate without warning. Already patched into `~/.claude/skills/data-integrity-tp/data-conventions.md`.

---

## Recommended R1 TP scope

A session covering:
1. Slack modal specs (above)
2. Server-side validators in `operations-utils.ts` extended to enforce cross-field rules (status/category compat matrix, empty-string normalize)
3. Audit log `source` tagging
4. The three slash commands
