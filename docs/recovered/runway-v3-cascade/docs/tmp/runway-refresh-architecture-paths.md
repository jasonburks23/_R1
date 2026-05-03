# Runway refresh architecture paths

## LOE comparison

These are CC-execution hours, not your time:

| Path | Hours | PRs | New infra |
|---|---|---|---|
| Path 1 (full SWR + Upstash + SSE + per-slice endpoints) | ~35-55 hrs | 2-3 | Upstash, 5+ REST endpoints, SWR |
| Path 2 (cached page + Upstash + SSE + `router.refresh()`) | ~14-22 hrs | 1 | Upstash, 1 SSE endpoint |
| Path 3 (smart band-aid, see below) | ~4-6 hrs | 1 | None |

The big lift in Path 1 is the SWR migration of `runway-board.tsx` and getting every child component reading from per-data-slice keys. That's the largest single chunk. Path 2 keeps the server-rendered shape and just adds the broker + stream. Path 3 keeps everything we have and just gets smarter about what we ask for.

---

## Path 1 — Full pattern (Upstash pub/sub + SSE + SWR + per-slice endpoints)

**Concept.** Canonical realtime architecture. Each data slice has its own SWR cache key on the client. The server publishes events to Upstash when that slice changes. The client subscribes via SSE, receives the event, and SWR re-fetches only the affected slice via a per-domain REST endpoint.

**Implementation:**

- Provision Upstash via the Vercel marketplace integration; add an Upstash client wrapper module.
- Modify `src/lib/runway/operations-writes-*.ts` to publish events to Upstash after each write. Event payloads describe what changed (e.g., `{ kind: "weeks", clientId: "..." }`).
- New SSE endpoint at `/api/runway/stream` with WorkOS authkit auth; subscribes to Upstash on the server side and forwards events to the client over SSE.
- Five or more new REST endpoints — clients, weeks, pipeline, flags, prefs — each with auth, response shape, and tests.
- Add SWR (or React Query) to the dependency tree.
- Refactor `src/app/runway/runway-board.tsx` from server-component-data-prop to SWR-keyed client component.
- Refactor `src/app/runway/page.tsx` to skeleton or initial-data injection pattern.
- Migrate every child that consumes data (DayColumn, AccountSection, PipelineRow, FlagsPanel, NeedsUpdateSection, InFlightSection) to read from SWR keys.
- Reconnect/resync handling on the client (handle SSE drops, replay missed events).
- Tests across the stream endpoint, each REST endpoint, and cache invalidation behavior.

**LOE:** ~35-55 CC hours, 2-3 PRs.

**New infra:** Upstash, 5+ REST endpoints, SWR/React Query.

**Lag:** Near-instant per data slice.

**Cost effect:** Largest reduction in Vercel polling cost. Sustained SSE connection cost becomes the new floor. SWR REST endpoint hits replace full-page renders during data updates.

### Summary

Path 1 is the canonical "true realtime" pattern. Best fit if multiple people are editing the same dashboard concurrently and need per-field updates without stepping on each other. Largest code surface to maintain long-term — SWR keys, stream auth, reconnect logic, and per-slice endpoints all become permanent parts of the system. Probably overkill for the current use case (TV plus occasional editor), but it is the right shape if multi-user concurrent editing becomes a real product requirement.

---

## Path 2 — Cached page + Upstash + SSE + `router.refresh()`

**Concept.** Same backend broker pattern as Path 1, but the client stays a server-rendered component. When the operations layer writes, it both invalidates the page cache and publishes an Upstash event. The client subscribes via SSE; on event, it calls `router.refresh()`. Because the page is now cached, the refresh hits the warm cache and is cheap.

**Implementation:**

- Provision Upstash via the Vercel marketplace; add an Upstash client wrapper.
- Wrap server queries with `unstable_cache` and tag them `revalidateTag("runway-board")`.
- Modify `src/lib/runway/operations-writes-*.ts` to call `revalidateTag("runway-board")` and publish a single "data changed" event to Upstash.
- One SSE endpoint at `/api/runway/stream` with WorkOS authkit auth; subscribes to Upstash and forwards a single channel.
- Client `useEffect` subscribes to the stream; on receiving an event, calls `router.refresh()`.
- Remove the existing `setInterval(router.refresh, 60_000)` polling loop.
- Add a `document.visibilityState !== "visible"` pause for the SSE subscription on hidden tabs.
- Tests for SSE auth, reconnect, and cache invalidation.

**LOE:** ~14-22 CC hours, 1 PR.

**New infra:** Upstash, 1 SSE endpoint.

**Lag:** Near-instant (event-driven).

**Cost effect:** Large reduction. Polling cost goes to zero. Sustained SSE connection becomes the new floor cost. Each data-change refresh is a single cached server render.

### Summary

Path 2 captures most of Path 1's architectural value with significantly less code. The server-rendered first paint is preserved, no client-side data layer rewrite is required, and the maintenance burden is limited to the stream endpoint and the Upstash dependency. If concurrent multi-user editing becomes a real ask later, Path 1 is a clean upgrade and Path 2's code does not need to be undone.

---

## Path 3 — Smart band-aid (cheap version-poll)

**Concept.** Stop polling the expensive thing. Poll a tiny thing instead. Only fire the expensive refresh when something actually changed.

**Implementation:**

- Add a tiny endpoint at `/api/runway/version` that returns `max(updated_at)` (or the latest `created_at` from `runway_audit`). Sub-10ms query, ~50-byte JSON response.
- Replace the existing `setInterval(router.refresh, 60_000)` in `runway-board.tsx` with `setInterval(checkVersion, 15_000)`.
- Only call `router.refresh()` when the returned version differs from the last seen value.
- Add `document.visibilityState !== "visible"` early return so hidden tabs stop pinging.
- Tests for the version endpoint and the polling logic.

**LOE:** ~4-6 CC hours, 1 PR.

**New infra:** None.

**Lag:** Up to 15 seconds (configurable via the poll interval).

**Cost effect:** Estimated ~80-90% reduction.

- Today: ~60 full force-dynamic renders per hour per open tab. Each one runs 5 Turso queries plus middleware plus serialize plus ship.
- After Path 3: ~240 tiny pings per hour per tab plus ~1-5 full renders per hour (only when data actually changed).
- Tiny ping is ~10-50 ms vs ~200-500 ms full render. On Active CPU pricing the cost ratio per request is roughly 5-10× lower, and most requests do not trigger a render at all.

### Summary

Path 3 is a targeted fix that solves the Vercel cost problem without introducing new infrastructure. The trick is that the polled endpoint is cheap and most polls return "no change," so the expensive full render only fires when there is actually something new to display. Lag (~15s) is roughly equivalent to SSE for the current use case (TV updating when bot, MCP, or operator writes land), since the data is not truly second-level urgent. Path 3 does not paint into a corner — Path 2 is a clean upgrade later if needed, and none of Path 3's code needs to be undone.

---

## Trade-offs

- **Realtime granularity.** Path 1 is per-slice realtime. Paths 2 and 3 are full-page-refresh realtime. If two people are editing the same row at once and need to see each other's keystrokes live, Path 1 is the only fit. Today's use case does not require that.

- **Code surface and maintenance.** Path 1 introduces ongoing maintenance for SWR keys, per-slice endpoints, stream auth, reconnect logic, and Upstash. Path 2 introduces stream auth, reconnect logic, and Upstash. Path 3 introduces nothing beyond a small version endpoint and a polling tweak.

- **New vendor.** Paths 1 and 2 require an Upstash account, a marketplace integration, and an Upstash bill line item (likely small). Path 3 stays on existing infrastructure.

- **Lag.** Paths 1 and 2 are sub-second. Path 3 is up to 15 seconds (configurable).

- **Cost reduction.** All three paths cut Vercel cost substantially because all three eliminate the full-render polling pattern. Path 3 alone is estimated at ~80-90% reduction. Paths 1 and 2 reach a similar magnitude but with the sustained SSE connection as a new cost floor.

- **Upgrade path.** Path 3 → Path 2 → Path 1 is a clean progression. Each path's code does not need to be undone for the next.

- **First-paint experience on the TV.** Path 1, when implemented as skeleton-plus-hydrate, can feel slower on first load than Paths 2 and 3, which preserve the existing server-rendered first paint.

- **Failure modes.**
  - Path 1: SSE drop or Upstash outage means no realtime; SWR's stale-while-revalidate continues serving last-known data, but updates lag until reconnect.
  - Path 2: SSE drop or Upstash outage means data goes stale until reconnect logic recovers or someone manually refreshes.
  - Path 3: version endpoint failure means data goes stale until the polling client recovers. No external dependency to wait on.

- **Operational complexity if something breaks.** Path 3 has the fewest moving parts to debug. Path 2 is moderate. Path 1 has the most.

- **Vendor lock-in.** Paths 1 and 2 add Upstash to the dependency graph. Path 3 stays vendor-neutral.
