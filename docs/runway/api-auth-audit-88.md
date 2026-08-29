# _R1#88 API auth census

Measurement only. Read from the code at `upstream/runway` @ `d1c65ff`, not
inferred from filenames or imports. Every `route.ts` under `src/app/api/**`
is one row. Total: **30 route files**, reconciled below against a mechanical
`find` count so a missed file would be visible.

`proxy.ts`'s `unauthenticatedPaths` (the only middleware-level gate list):

```
/callback
/login
/api/mcp/runway
/api/slack/events
/api/slack/interactivity
/api/slack/commands
/api/slack/options
/api/runway/gantt-share/:token
```

## Method

For each route, read the handler body (not just its imports) to determine
what actually runs before any sensitive work, and — where the handler calls
into an action/lib function rather than gating itself — followed that call
one level down to check whether the gate lives there instead. "Deliberate"
means the code makes an explicit auth decision. "Assumed" means the route
relies on the authkit middleware alone, with no code-level check of its own.

## Classification

| path | in `unauthenticatedPaths` | what auth is actually enforced | deliberate or assumed | JSON, no session, reaches handler body |
|---|---|---|---|---|
| `api/ai/send` | no | none in the route itself. The action it calls, `markSentToAI`, calls `requireWorkspaceAccess` **only if** the issue's column resolves a `workspaceId` (`getColumnWorkspaceId` can return `null` for a column with no workspace) | assumed at the route; conditionally deliberate one layer down, with a real gap when the column has no workspace | yes — reaches `markSentToAI`; whether it reaches the DB write depends on that one column's `workspaceId` |
| `api/attachments/confirm` | no | `getCurrentUserId()`, checked first, 401 on null | deliberate | no |
| `api/attachments/upload` | no | `getCurrentUserId()`, checked first, 401 on null | deliberate | no |
| `api/audience/[memberId]` | no | `getCurrentUserId()`, checked first, 401 on null | deliberate | no |
| `api/audience/suggest` | no | `getCurrentUserId()`, checked first, 401 on null | deliberate | no |
| `api/brand/research` | no | `getCurrentUserId()`, checked first, 401 on null | deliberate | no |
| `api/brand/summary` | no | `getCurrentUserId()`, checked first, 401 on null | deliberate | no |
| `api/chat/issue` | no | **none** | assumed | **yes** — demonstrated below is the sibling `api/chat` route; this one is the same shape (no auth-related import at all) |
| `api/chat/planning` | no | **none** | assumed | **yes** — same shape as `api/chat` |
| `api/chat` | no | **none** | assumed | **yes — demonstrated, see below** |
| `api/chat/workspace` | no | **none** | assumed | **yes** — same shape as `api/chat` |
| `api/dashboard/summary` | no | `getCurrentUser()`, checked first, 401 on null | deliberate | no |
| `api/inngest` | no | Inngest's `serve()` handler verifies its own signing key on every request before invoking any function; not an app-level `if` check, but a real gate enforced by the library, not skippable from route code | deliberate (library-level, not visible as app code) | no for triggering a registered function; the dispatcher endpoint itself responds to unsigned requests per Inngest's own protocol, which this audit did not re-verify independently |
| `api/knowledge/assets/[assetId]` | no | `getCurrentUserId()`, checked first, 401 on null | deliberate | no |
| `api/knowledge/sync` | no | `requireWorkspaceAccess(workspaceId, "member")`, which calls `requireAuth()` → `redirect("/login")` on no user. The route wraps this in try/catch, so an unauthenticated JSON caller gets a generic 500, not a redirect or a 401 | deliberate in effect, but the mechanism is a page-auth convention (`redirect()`) borrowed into an API route, so the status code is misleading | no — the sensitive call (`syncWorkspaceKnowledge`) is never reached, but the caller cannot tell why from the response |
| `api/mcp/runway` | **yes** | Bearer token via `timingSafeTokenMatch` | deliberate | no |
| `api/runway/gantt-embed` | no | shared secret via `timingSafeTokenMatch` (fixed under #112 in a sibling thread; was plain `!==` before that) | deliberate | no |
| `api/runway/gantt-generate` | no | Bearer token via `timingSafeTokenMatch` | deliberate | no |
| `api/runway/gantt-share/[token]` | **yes** | HMAC token via `verifyToken` | deliberate | no |
| `api/runway/version` | no | `getCurrentUser()`, checked first, 401 on null (the #52 fix) | deliberate | no |
| `api/skills/[skillId]/assets` | no | `getCurrentUserId()`, checked first, 401 on null | deliberate | no |
| `api/skills/generate` | no | `getCurrentUserId()`, checked first, 401 on null | deliberate | no |
| `api/skills/import/markdown` | no | `getCurrentUserId()`, checked first, 401 on null | deliberate | no |
| `api/skills/import` | no | `getCurrentUserId()`, checked first, 401 on null | deliberate | no |
| `api/slack/commands` | **yes** | HMAC via `verifySlackSignature` | deliberate | no |
| `api/slack/events` | **yes** | HMAC via `verifySlackSignature` | deliberate | no |
| `api/slack/interactivity` | **yes** | HMAC via `verifySlackSignature` | deliberate | no |
| `api/slack/options` | **yes** | HMAC via `verifySlackSignature` | deliberate | no |
| `api/workspace/configure` | no | `getCurrentUserId()`, checked first, 401 on null | deliberate | no |
| `api/workspace/soul` | no | `getCurrentUserId()`, checked first, 401 on null | deliberate | no |

## The count

- **30** route files total (`find src/app/api -name "route.ts" | wc -l` = 30, matches the table row count).
- **24** deliberately gate before any sensitive work (own check or a downstream helper that always runs): the 18 `getCurrentUserId`/`getCurrentUser` routes, the 5 Slack/MCP/gantt/HMAC routes with their own crypto or signature check, and `api/inngest` (library-level).
- **1** conditionally gated with a real gap: `api/ai/send` — deliberate one layer down, but only when the issue's column resolves a `workspaceId`.
- **1** deliberate but misleading in its failure mode: `api/knowledge/sync` — real auth enforcement via `redirect()`-based `requireAuth()`, but an unauthenticated JSON caller sees a generic 500 instead of 401.
- **4** have no auth check anywhere in the route and are not in `unauthenticatedPaths`: `api/chat`, `api/chat/issue`, `api/chat/planning`, `api/chat/workspace`. These four are the same shape as the #52 finding: JSON requests bypass authkit's redirect and there is nothing else in the file to stop them. All four read/write workspace-scoped chat context (soul, brand, memory, skills, and their respective AI tool sets) keyed on a caller-supplied `workspaceId` with no ownership check.
- **0** unclassified. Every file under `src/app/api/**/route.ts` was read and appears in the table above.

## Demonstrated bypass (item B)

`src/app/api/chat/route.test.ts` calls the real exported `POST` handler with
a plain `Request` carrying no `Authorization` header, no session cookie, and
no other auth material — the same shape #52 showed authkit lets through for
a JSON `Accept` header. The test mocks only the downstream data/AI-SDK calls
(`loadWorkspaceContext`, `createChatResponse`, tool factories), not the auth
path, because there is no auth path in this file to mock around. The
handler runs to completion and `loadWorkspaceContext` is called with the
attacker-supplied `workspaceId`, unchecked against any session or
membership — proof the handler body executes real business logic, not just
that it would in theory.

This test does not exercise the actual Next.js middleware layer — that only
runs in the real request pipeline, not under a direct handler import — so it
does not re-prove the #52 finding about authkit itself. It proves the
narrower, sufficient fact: nothing in this file's own code would stop the
request if middleware lets it through, which #52 already showed it does for
JSON.

`api/chat/issue`, `api/chat/planning`, and `api/chat/workspace` were read
and confirmed to have the identical shape (no auth-related import, no check
before calling workspace-scoped business logic) but were not each given
their own demonstration test, since the ticket asked for one demonstrated
instance and this repo already has three more of the same shape available
if a second one is wanted.

## Not this ticket's decision

This ticket does not choose between middleware-level JSON gating and
per-route gates — that decision belongs to the operator and Runway-TP. This
document is the input to that decision, not the decision.
