# Spec: `get_retainer_team` helper + MCP tool

**Author:** Data Integrity TP (2026-04-23). Drop-in spec for a CC branch that's already touching bot tools. Small enough to ride along without becoming its own PR.

## Why this exists

The Runway bot can already answer:
- "What retainers do we have?" via `get_projects({ engagementType: "retainer" })`
- "What projects are under Convergix Retainer?" via `get_projects({ parentProjectId: "<wrapper-id>" })`

It CANNOT cleanly answer:
- "Who is on the Convergix Retainer team?"

Today the LLM would have to call `get_projects({ parentProjectId })`, then parse the `resources` string on each child, dedupe, and present. That's multi-step reasoning for a direct question, and the `resources` field is a free-text string so dedup is fuzzy.

This spec adds a single MCP tool + one helper function that returns a clean team list for any retainer wrapper.

## Scope

One new helper function. One new MCP tool. One new system-prompt recipe. Estimated ~50 LOC + ~30 LOC of tests.

## New helper

**Location:** new file `src/lib/runway/operations-reads-retainers.ts` (co-located with other reads modules).

**Signature:**

```ts
export interface RetainerTeamMember {
  name: string;
  roles: string[];       // e.g. ["Owner (Brand Guide v2)", "CD (Fanuc Article)"]
  childProjectIds: string[]; // which child L1s this person appears on
}

export interface RetainerTeamResult {
  wrapperId: string;
  wrapperName: string;
  clientName: string;
  childProjectCount: number;
  team: RetainerTeamMember[];
  owner: string | null; // wrapper's own owner field (Kathy for Convergix)
}

export async function getRetainerTeam(
  wrapperId: string,
): Promise<RetainerTeamResult | { error: string }>;
```

**Dedup logic:**

1. Fetch the wrapper row. If not found or `engagementType !== "retainer"`, return `{ error: "Not a retainer wrapper" }`.
2. Fetch all children via `getProjectsFiltered({ parentProjectId: wrapperId })`.
3. For each child, parse:
   - `owner` — a single name (e.g., "Kathy")
   - `resources` — comma-or-newline-delimited role-prefixed names (e.g., "CD: Lane, CW: Kathy, Dev: Leslie")
4. Build a `Map<normalizedName, RetainerTeamMember>` where:
   - `normalizedName` = lowercase trim (handles "kathy " / "Kathy" / "KATHY")
   - `roles` accumulates each appearance with the child project name appended in parens
   - `childProjectIds` accumulates the child ids
5. Return sorted by `roles.length DESC` (most-present person first) with tiebreaker `name ASC`.

**Parsing `resources` field:**

- Split on `,` or `;` or newline
- Trim each entry
- If entry matches pattern `/^([A-Za-z]+):\s*(.+)$/`, role = `match[1]`, name = `match[2].trim()`
- Otherwise role = `"Resource"`, name = whole entry
- Skip empty entries

**Edge cases:**

- Wrapper with zero children → return `{ team: [], childProjectCount: 0, ... }` (not an error)
- Child with NULL owner AND NULL resources → skip it from team contribution (but still count toward `childProjectCount`)
- Wrapper's own `owner` is surfaced separately (not merged into team) so the caller can distinguish "who manages the retainer" vs "who does the work"

## New MCP tool

**Location:** add to `src/lib/slack/bot-tools.ts` after `get_projects`.

**Tool definition** (matching the established pattern):

```ts
get_retainer_team: tool({
  description:
    "Return the deduplicated team across all deliverable L1s under a retainer wrapper. Input is the wrapper's id (get it from get_projects with engagementType='retainer'). Returns { wrapperId, wrapperName, clientName, childProjectCount, owner, team: [{ name, roles[], childProjectIds[] }] }. Use for questions like 'who's on the Convergix Retainer team' or 'who's doing work under this retainer.' Do NOT use for non-retainer projects — for those, read the project's resources field directly.",
  inputSchema: z.object({
    wrapperId: z.string().describe("The retainer wrapper's project id (get it from get_projects with engagementType='retainer')."),
  }),
  execute: async ({ wrapperId }) => {
    return getRetainerTeam(wrapperId);
  },
}),
```

## System prompt recipe (add to `bot-context-sections.ts`)

Add a short block under the existing retainer-wrapper section:

```
Team questions on a retainer:
- "Who's on the Convergix Retainer team" → call get_retainer_team with the
  wrapper's id. Returns deduplicated roster across all child L1s with per-
  person role + which projects they show up on.
- Do NOT use get_retainer_team for non-retainer projects. For those, read
  the resources field on the project directly.
- The wrapper's own owner is returned separately (field: `owner`). Present
  it as "Retainer managed by <name>" to distinguish from the working team.
```

## Tests to add (`operations-reads-retainers.test.ts`)

1. Wrapper with 0 children → returns empty team, no error
2. Wrapper with 3 children sharing 2 of 3 team members → dedup correct, `childProjectIds` and `roles` accumulate
3. Child with NULL owner + NULL resources → contributes nothing but counts toward `childProjectCount`
4. Mixed role prefixes in `resources` ("CD: Lane", "CW: Kathy", bare "Leslie") → parsed correctly, bare entries get role="Resource"
5. Wrapper with `engagementType !== "retainer"` → returns error (guards against calling on a regular project)
6. Wrapper id that doesn't exist → returns error

## Changes to existing files

- `src/lib/runway/operations-reads-retainers.ts` — NEW
- `src/lib/runway/operations-reads-retainers.test.ts` — NEW
- `src/lib/slack/bot-tools.ts` — add tool registration (~10 lines)
- `src/lib/runway/bot-context-sections.ts` — add system-prompt recipe (~8 lines)
- `src/lib/mcp/runway-tools.ts` — if MCP side has a separate tool list, mirror there too (check this file exists + pattern)

**Rough LOC estimate:** ~85 new lines of implementation + tests. No schema changes. No data migrations.

## Why safe to ride on any CC branch

- Zero schema changes.
- Zero data-writes. Read-only helper.
- Additive to MCP surface — doesn't break existing tools.
- No cross-cutting dependency on other CC work. Can merge independently; won't conflict.

## When the data-integrity TP will need this

When the Convergix wrapper exists in prod and the team starts asking "who's on it" in Slack. Until the wrapper exists (still blocked on CC #1 merge + wrapper filter gap), the tool has nothing to query, but it's also harmless to ship ahead of the wrapper.

## Out of scope for this spec

- Cross-retainer team lookup ("show me everyone on ALL retainers") — separate tool if needed.
- Team member workload aggregation at retainer level — belongs in a separate `getRetainerWorkload` helper.
- Writable retainer-level resources field on the wrapper itself — operator's CQ3 answer is that team stays on client; wrapper pulls from children via this helper.
