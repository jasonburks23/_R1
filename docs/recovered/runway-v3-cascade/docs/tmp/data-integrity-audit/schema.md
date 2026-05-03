# Schema (v4 convention, 2026-04-21)

Source of truth: `src/lib/db/runway-schema.ts` (flags-consolidation branch).

## Tables

### `clients`
`id, name, slug (unique), nicknames (JSON), contract_value, contract_term, contract_status, team, client_contacts (JSON), created_at, updated_at`

### `projects` — the L1s
```
id (PK)
client_id → clients.id (NOT NULL)
name (NOT NULL)
status         -- in-production, awaiting-client, not-started, blocked, on-hold, completed
category       -- active, awaiting-client, pipeline, on-hold, completed
owner, resources, waiting_on
due_date       -- LEGACY, replaced by start_date/end_date
-- v4 timing (2026-04-21)
start_date     -- ISO; computed from children, recomputed on L2 write
end_date       -- ISO; computed from children
contract_start -- ISO; manual (retainer boundary)
contract_end   -- ISO; manual
engagement_type   -- 'project' | 'retainer' | 'break-fix' | NULL
-- v4 wrapper (PR #88 Chunk F)
parent_project_id -- nullable self-ref, app-level only (no FK on SQLite)
notes, stale_days, sort_order, created_at, updated_at
```

**Invariants (app-enforced, not DB-enforced):**
- `parent_project_id` creates at most a 2-tier hierarchy (wrapper → children). No grandparents. Enforced in `src/app/runway/unified-view.ts` step 2.
- When `engagement_type = 'retainer'` AND there is at least one child row with `parent_project_id = this.id`, this row is a **wrapper**. Wrappers should have contract_start/contract_end set; children inherit context but have their own computed start/end.
- Retainer L1s without children are standalone retainers (e.g. Hopdoddy Digital Retainer, Dave Asprey Wind Down).
- Explicit manual L1 `end_date` overrides get clobbered by L2 recompute today — memo `project_pr88_shipped.md` flags this as a deferred PR 89+ item.

### `week_items` — the L2s
```
id (PK)
project_id → projects.id
client_id → clients.id
day_of_week, week_of
date           -- LEGACY (single day), replaced by start_date
-- v4 (2026-04-21)
start_date     -- ISO; required post-backfill
end_date       -- ISO; nullable for single-day
blocked_by     -- JSON array of week_item ids
title (NOT NULL)
status         -- completed | in-progress | blocked | at-risk | scheduled | canceled | NULL
category       -- delivery, review, kickoff, deadline, approval, launch
owner, resources, notes, sort_order, created_at, updated_at
```

**Invariants:**
- `status = 'scheduled'` is the intended explicit default for new rows. NULL is a legacy value the backfill migration (`scripts/runway-migrations/2026-04-21-backfill-scheduled-status.ts`) flips to `'scheduled'`.
- Bucket + filter paths treat NULL as equivalent to `'scheduled'` during rollout.
- `blocked_by` must reference existing week_item ids. Malformed JSON or unknown ids are integrity failures.

### `pipeline_items`
```
id, client_id → clients.id, name, owner
status -- scoping | drafting | sow-sent | verbal | signed | at-risk
estimated_value (text), waiting_on, notes, sort_order, timestamps
```

### `updates` — audit log
```
id, idempotency_key (unique)
project_id → projects.id (nullable)
client_id → clients.id (nullable)
updated_by, update_type, previous_value, new_value, summary, metadata
batch_id
triggered_by_update_id -- cascade audit linkage, self-ref (no FK)
slack_message_ts
created_at (integer, "timestamp" mode — expects SECONDS)
```

### `team_members`
```
id, name, first_name, full_name, nicknames (JSON), title
slack_user_id (unique), role_category
accounts_led (JSON array of client slugs), channel_purpose, is_active, updated_at (text)
```

### `view_preferences`
```
scope (PK) -- e.g. "global"
preferences (JSON)
updated_at
```

## Enum universes (authoritative per schema comments)
- **project.status**: in-production, awaiting-client, not-started, blocked, on-hold, completed
- **project.category**: active, awaiting-client, pipeline, on-hold, completed
- **project.engagement_type**: project, retainer, break-fix (NULL present but legacy)
- **week_item.status**: completed, in-progress, blocked, at-risk, scheduled, canceled (NULL = legacy, treated as scheduled)
- **week_item.category**: delivery, review, kickoff, deadline, approval, launch
- **pipeline_item.status**: scoping, drafting, sow-sent, verbal, signed, at-risk

## Whitelisted write fields (per `feedback_migration_field_whitelist.md`)
Before approving any migration, grep its `field:` strings against `PROJECT_FIELDS` / `WEEK_ITEM_FIELDS` constants in the ops layer. If a field isn't whitelisted, the migration silently skips — that caused the retainer-v4-cleanup `endDate` bug that required a revert + retry.
