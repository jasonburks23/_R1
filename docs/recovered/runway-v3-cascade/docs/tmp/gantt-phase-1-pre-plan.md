# Gantt Phase 1 — pre-plan

Captured 2026-04-28. Phase 1A is a local **HTML-only** Gantt generator (no Slack, no PNG yet). Template designed around **AG1 as the worst-case** — lots of nulls, especially at L2 — so the gaps are visually obvious. Goal: Jason can ask for a Gantt for any project, see what's missing, drive cleanup.

- **Phase 1A** (this doc): local CLI, HTML output, AG1-driven template, data quality surfacing
- **Phase 1B** (later): wire same render function into Slack handler + bot intent detection
- **Phase 2** (later): PNG rendering via Playwright, brand polish, hosted live URL, format selection up front. Output destination revisits Google Drive vs filesystem at that time.

## Phase 1A scope

### In
- CLI script: `pnpm runway:gantt --project "<name or id>"`
- Resolves entity (fuzzy match on project name; disambiguation if multi-match)
- Detects wrapper vs normal L1 (rule below)
- Pulls project + appropriate children
- Renders deterministic HTML template (built once, reused every call)
- Writes HTML file to `~/runway-gantts/`
- Surfaces data-quality gaps inline per row + alert sections at the top + console mirror

### Out (deferred)
- PNG rendering (Phase 2)
- Slack triggering (Phase 1B)
- Hosted live URL, brand polish, format selection (Phase 2)
- Caching, multi-format bundle, AI-generated summary text (later)

## Why local CLI first
- Smallest blast radius — no auth, no Slack endpoint, no routing
- Lets us iterate on the template + data-quality logic without PR overhead
- AG1-style records are bleeding now — we don't need Slack to start exposing gaps; we need to *see* them
- Long-running local feature branch — push only when stable + we're ready to share

---

## Locked decisions

### 1. Template language: **React** (rendered server-side via `renderToStaticMarkup`)
Same paradigm as the rest of the app. Script file is `.tsx`. No new deps. Leaves the door open for Phase 2 web view to reuse the same component. Slight precedent break (other scripts in `scripts/` are plain `.ts`) but the consistency benefit outweighs.

### 2. Output path: **`~/runway-gantts/[client-slug]-[project-slug]-[YYYY-MM-DD].html`**
Outside the repo, persistent across worktrees, no git noise. Phase 2 may move this to Google Drive once we're ready for shareable artifacts.

### 3. Wrapper detection rule: **all three must hold**
1. `parentProjectId === null`
2. `engagementType === "retainer"`
3. Has at least one child project pointing via `parentProjectId`

If any fail → treated as a normal L1 project. If user passes an L2 (a project with `parentProjectId !== null`), error out: *"'X' is a child project. Did you mean its parent 'Y'?"*

### 4. Branch: `feature/gantt-cli`
Worktree already cut at `.worktrees/gantt-cli/`, based on `upstream/runway` (post-PR-#95-merge).

### 5. Template structure & data quality taxonomy

**No invented groupings.** Drop the HDL prototype's "Design + Dev / Production + Launch / Parallel Infra" sections. Just list children as they are.

**Header (top of chart)**
- Project / wrapper name
- Top-level date range as raw data (e.g. `Apr 17 – May 11`, or `null – null` if both are null — honest, not derived from children)
- "Generated YYYY-MM-DD"
- Legend: bar style (active/setup), milestone glyph, alert badges

**Alert section above the Gantt body — populated only if applicable**

For an **L1** view, flag at top:
- L1 has null start/end
- L1 is retainer but has null contractStart/contractEnd
- L1 has null engagementType
- L1 has null category or status
- L1 has status="awaiting-client" but waitingOn is null
- L1 has dueDate but null endDate (or vice versa)
- L1 has no children AND no owner

For a **wrapper** view, flag at top:
- Wrapper has null contractStart/contractEnd
- Wrapper has no children
- Wrapper's date range doesn't cover all child L1 date ranges
- Wrapper's engagementType isn't "retainer" (misuse)
- Wrapper has children with mismatched contract dates

**Gantt body — child rows**

Children rendered as rows. **Sort order: by `startDate`, nulls last.** Title displayed verbatim from DB (no rewording).

Each row layout (left to right):
1. **Title** — exact DB value
2. **Owner + resources** — compact, format `O: <owner> · <resources>`. Owner prefixed with `O:`. Resources as comma-list of role abbreviations (per the existing `CD: Lane, CW: Kathy` pattern).
3. **Inline dates** — actual data:
   - Both null → `null – null` (both literally) and **no bar**
   - Only start null → `null – May 11` and no bar
   - Only end null → `Apr 17 – null` and no bar
   - end < start → display the bad pair, no bar, AND alert sub-row appears
   - start === end (milestone) → `May 11` (single date) and **diamond marker on the timeline at that date**
   - Normal → `Apr 17 – May 11` and a bar spanning that range
4. **Bar / marker on the timeline** per the rules above

**L2 alert sub-row** — appears beneath the row only if the child has issues BEYOND date issues (date issues are visualized in the row itself):
- Active status + null owner
- Orphan (looks like an L2 but `parentProjectId` is null)
- Parent-child date mismatch (L2 dates outside L1's range)
- end < start
- Status / category inconsistency (e.g. status="completed" but category="active")
- Status="awaiting-client" but waitingOn is null
- engagementType is null when L1's is set

Sub-row is styled distinctly — small, alert-colored, indented.

**Time axis**
- Auto-scale: weekly columns if span < 16 weeks, monthly if longer
- "Today" line: vertical indicator
- If all dates are null and no axis can be computed, render the body without a timeline and let the inline `null – null` text carry the message

**Top-of-chart counter (above alert sections)**
- "X of Y rows have data gaps" headline
- Itemized list grouped by issue type (e.g. "3 children missing end date: A, B, C")

**Console mirror**
- Same counter + alert items printed to stdout when CLI runs

---

## Wave decomposition

**Pre-work** — add `pnpm runway:gantt` npm script wired through `dotenv -e .env.local` so env vars load (drizzle-kit and tsx don't auto-load `.env.local` per project memory).

1. **Entity resolution** — fuzzy-match input → project; apply wrapper-detection rule; handle L2-input error case; disambiguate if multiple name matches
2. **Data extraction** — pull entity + appropriate children (L2s for normal L1, L1s for wrapper); gather all fields (status, owner, resources, dates, engagementType, contractStart/End, category, waitingOn, parentProjectId, dueDate)
3. **Row transformation** — map children to `{ title, owner, resources, startDate, endDate, status, category, engagementType, parentProjectId, issues[] }`; sort by startDate (nulls last); compute time-axis params
4. **Issue detection logic** — implement L1, wrapper, and L2 rule lists from §5 above; deterministic, no LLM
5. **React template** (`.tsx`) — header + alert sections + body table with the row layout from §5; renders to static HTML string
6. **Top-of-chart counter + console mirror** — chart-level summary grouped by issue type
7. **CLI wrapper** — args parsing, output path resolution (`~/runway-gantts/`), helpful error messages
8. **Cross-project validation** — run on AG1 (worst-case primary), HDL (good data), Convergix wrapper (large), Soundly (medium), one degenerate case (L1 with no children); adjust template + thresholds based on what we see; tests woven in throughout

Each wave builds on the previous. Tests live alongside each module's source file (`*.test.ts`/`.test.tsx`) per project convention.

---

## LOE
~10-12 hrs agent + ~2 hrs TP. R2 brand pass + Phase 2 PNG sit outside this estimate.

## What runs locally vs needs a PR

**Phase 1A — entirely local.** Reads from `RUNWAY_DATABASE_URL` (Jason has it). HTML writes to `~/runway-gantts/`. Iterate freely without pushing.

**Phase 1B — needs a PR + deploy.** Slack events go to a deployed endpoint.

**R2 template polish — local.** Just a different `.tsx` file. No PR until shipped.

---

## After Phase 1A — what unlocks
- **Phase 1B:** wire same render function into a Slack handler + bot intent detection. ~5-8 hrs.
- **R2 template (brand pass):** zero engineering — Lane briefs, AI helps draft polished CSS/JSX, swap one component. The deterministic-template choice means the template is one file we can rewrite without touching the rest of the pipeline.

---

## Ranking vs MCP work

| | Cost | Risk | Strategic value |
|---|---|---|---|
| **Gantt Phase 1A** | ~10 hrs | Low | **High** — surfaces data integrity issues immediately; runs entirely locally; no PR needed until shareable |
| **PR B (MCP read)** | ~15 hrs | Low | Medium — better bot answers |
| **PR C (MCP write)** | ~25 hrs | Medium-high | Medium — depends on PR #96 settling |

**Recommended order:**

1. **Gantt Phase 1A first** — data-integrity concern is bubbling up; this is the surface that exposes the problem and gives you the cleanup ammunition
2. **PR B second** — once Phase 1A is stable
3. **Phase 1B (Slack wiring)** — slot in after PR B
4. **PR C last**
