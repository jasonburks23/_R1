# _R1#117: secret-compare census

Measurement only. No sweep changed, no route fixed, no option chosen. This
document is the count the operator's env-var heuristic decision turns on.

## Method

`scripts/secret-compare-census.ts`, a one-shot script, not a permanent
guard, walked every `.ts`/`.tsx` file under `src/` and `scripts/`, parsed
each with the TypeScript compiler API, and found every `==`, `===`, `!=`,
or `!==` binary expression where either operand traces to a `process.env`
read.

Tracing rule, deliberately strict: an operand counts only if it is a
`process.env` access directly, or a same-file variable whose declared
value is, at its own top level, a bare identifier, a `process.env` access,
or a member access rooted at either, optionally wrapped in `??`, `||`, an
optional chain, a type assertion, or parentheses. Resolved to a fixed
point so a multi-hop chain such as `apiKey` to `expected`, the exact shape
of the #106 bypass, resolves fully. A value that is merely COMPUTED from
an env read, such as a filtered array length or a call result, does not
propagate the trace. The first draft of this script did propagate through
any computation and produced 51 hits, 38 of them plain false positives
such as `row.notes == null` and `idx === value.length - 1` that shared no
real relationship to any env value. Tightening the rule to a real alias
chain, not incidental reuse of a name, dropped the count to 18 and removed
every one of those false hits.

Exact command: `node --experimental-strip-types scripts/secret-compare-census.ts`

## 1. Count

**18** comparisons, across **15** files, out of **789** source files
scanned.

## 2 and 3. Classification and the false-positive number

| Category | Count |
|---|---|
| secret compare | 1 |
| NODE_ENV check | 3 |
| feature flag | 3 |
| URL variable presence or type check | 2 |
| other, mostly a CLI DRY_RUN flag | 9 |

Total: 18. Matches the raw script output exactly.

**The false-positive number, stated plainly: 17 of 18.** A heuristic that
flags any comparison where either side traces to `process.env`, with no
further name-based filter, is wrong 17 times out of 18 on this tree today.

Breakdown of the 17 non-secret hits:

- **3 NODE_ENV checks.** `process.env.NODE_ENV === "production"` in
  `src/app/api/runway/gantt-embed/route.ts:47`, `src/app/login/route.ts:14`,
  and `src/app/runway/auth/actions.ts:37`. Environment-mode branching, not
  a secret compare.
- **3 feature-flag checks.** `src/lib/feature-flags.ts:17`,
  `process.env.MODAL_INTERCEPT_ENABLED === "true"`, is the live flag read.
  The other two, `src/lib/feature-flags.test.ts:12` and
  `src/lib/slack/modals/intercept-miss-alert.test.ts:112`, are both
  `original === undefined` and `originalFlag === undefined`, a test
  saving and restoring the flag's prior value around a mock. Same shape
  as a secret compare structurally, since the variable IS a copy of an
  env value, but it is test scaffolding, not production auth logic.
- **2 URL variable checks**, both presence or type checks rather than a
  value comparison: `typeof process.env.RUNWAY_DATABASE_URL === "string"`
  in `scripts/runway-migrations/retainer-v4-cleanup-2026-04-21.test.ts:26`,
  and `original !== undefined` in
  `scripts/runway-schema-parity-check.test.ts:251`, the same save-and-restore
  shape as the feature-flag tests above, this time around
  `RUNWAY_DATABASE_URL`. Neither compares one URL's VALUE against another;
  both ask whether the variable is set at all.
- **9 in the other bucket.** 8 are `process.env.DRY_RUN === "1"` or
  `"true"`, a CLI flag pattern, spread across six one-shot migration
  scripts under `scripts/runway-migrations/`, some checking both string
  forms in the same file. The ninth is `originalTz === undefined` in
  `src/app/runway/components/today-section.test.tsx:89`, the same
  save-and-restore pattern as the feature-flag tests, around
  `process.env.TZ`.
- **1 secret compare, real.** `src/app/api/runway/gantt-embed/route.ts:59`:
  `auth !== embedSecret`, where `embedSecret` traces to
  `process.env.RUNWAY_EMBED_SECRET`. This is the finding the rest of this
  document is about.

## 4. Files the current sweep still misses on vocabulary grounds

**One file, confirmed two ways, not inferred from either alone.**

`src/app/api/runway/gantt-embed/route.ts` still contains a raw `!==`
compare of a shared secret against a caller-supplied header value, after
#116. Confirmed two ways. First, by reading the shipped source, quoted
above. Second, by running the actual `hasTokenEqualityShape` function from
`src/lib/runway/token-compare-guard.test.ts` on runway today against this
exact file's real content: it returns `false`. Command:
`node /tmp/check-sweep-blind.mjs`, a two-line harness that imports the
literal function body and calls it against the file's real source, not a
fixture.

Two independent, compounding reasons it is missed, not one:

1. **Vocabulary.** `hasTokenEqualityShape`'s window text test requires a
   `token` mention and an `apiKey` mention, or `process.env`, within 200
   characters of the operator. `git show d1c65ff -- ...gantt-embed/route.ts`
   contains zero occurrences of the word "token" anywhere in the file. The
   variables are `auth` and `embedSecret`.
2. **Operator polarity.** The sweep's own operator pattern,
   `(?<![=!])={2,3}(?!=)`, matches only `==` and `===`. Line 59's compare
   is `auth !== embedSecret`, a negated comparison the pattern cannot
   match at all, independent of the vocabulary gap. Even a file that DID
   say "token" and "apiKey" in a `!==` shape would slip past this specific
   regex on the operator alone. This is a second, real, live gap beyond
   the one #117 was filed to measure, not a synthetic one: it is sitting
   in shipped code today.

I looked for other files with the same shape and found none. Every other
env-traced comparison in the 18-hit set is either the known-safe
`NODE_ENV`/`DRY_RUN`/feature-flag/test-snapshot pattern above, or is
already inside the two `KNOWN_AUTH_ROUTES` files, both of which call
`timingSafeTokenMatch` correctly, `src/app/api/mcp/runway/route.ts` and
`src/app/api/runway/gantt-generate/route.ts`, verified by reading both
files directly, not just grepping.

### Holds against 8d286197 too, not just today's regex sweep

Per the operator's premise-recheck standing rule: this finding was
re-checked against `_R1#108`'s gated tip, `8d286197`, which replaces the
whole guard file with an AST implementation rather than editing it.

`findCoOccurrenceViolations` in that version seeds its taint sets from the
literal strings `"token"` and `"apiKey"` at
`src/lib/runway/token-compare-guard.test.ts:607-608` on that tip:
`resolveAliasNames(sourceFile, "token")` and
`resolveAliasNames(sourceFile, "apiKey")`. `resolveAliasNames` starts its
tainted set as `{seedName}` and only grows it by chasing same-file
variable declarations whose initializer is already in the set. Since
`gantt-embed/route.ts` never declares anything named `token` or `apiKey`,
and never assigns `auth` or `embedSecret` from a variable that is, the
chain never starts. No amount of taint-propagation sophistication reaches
a name the seed never touches. Confirmed by reading the implementation,
not by running it, since the seed-string mismatch is a sufficient,
directly verifiable reason on its own: `"auth" !== "token"` and
`"embedSecret" !== "apiKey"`, and nothing in the file bridges them.

**This finding survives the #108 rewrite. #117 is the ticket that
outlives it, per the operator's own framing.**

## The honest unknowns

- **Cross-function-boundary aliasing is out of scope for this census.**
  The trace only follows same-file variable declarations, per the
  ticket's own wording. `src/app/api/slack/options/route.ts` and
  `src/app/api/slack/interactivity/route.ts` both read
  `process.env.SLACK_SIGNING_SECRET` into a local `signingSecret`, then
  pass it as a function ARGUMENT to `verifySlackSignature` in
  `src/lib/slack/verify.ts`, which is a separate file. The census cannot
  see across that call. I checked it by hand: `verify.ts` computes an
  HMAC and compares with `timingSafeEqual` after a length check, the same
  safe shape as `src/lib/runway/auth-cookie.ts`. Manually verified safe,
  not swept.
- **No exported top-level `process.env` constants exist in this tree.**
  `grep -rn "^export const .* = process\.env"` returned nothing, so
  there is no cross-file variable-aliasing risk of the kind that would
  need a broader trace than this census attempted.
- **Switch statements were not walked separately.** Two files combine
  `switch` and `process.env`,
  `src/app/api/slack/options/route.ts` and
  `src/app/api/slack/interactivity/route.ts`,
  but in both the switch discriminant is `payload.action_id`,
  `payload.type`, or `actionId`, none of them env-derived. Checked by
  hand, not swept, since a `case` label is not a `BinaryExpression` and
  this script only visits those.
- **Mechanical reconciliation.** An independent, cruder count, every file
  under `src/` and `scripts/` containing BOTH `process.env` and any of
  `===`, `!==`, or a bare `==`/`!=`, returned 65 files. All 15 files with
  an actual AST-confirmed hit are inside that 65. The other 50 were spot
  checked in the files most likely to matter,
  `src/lib/runway/auth-cookie.ts`, `src/lib/runway/gantt/share-token.ts`,
  `src/app/api/runway/gantt-generate/route.ts`,
  `src/app/api/mcp/runway/route.test.ts`, `src/lib/storage/r2-client.ts`,
  `src/lib/storage/logo-processor.ts`, `src/lib/document-conversion.ts`,
  and every equality operator in them compares something unrelated to the
  env values in the same file: buffer lengths, string indices, HTTP error
  names, content types. No missed file surfaced.

## My read on the env-var heuristic, with the number attached

**Not viable as a standalone name-based replacement, on this evidence.**
17 of 18 comparisons that trace to `process.env` are not a secret compare.
An env-var-origin check alone would need to be paired with a second,
independent filter, such as the env var's own name against a
SECRET/TOKEN/KEY/PASSWORD/AUTH pattern, the same kind of vocabulary
dependency #117 exists to move away from, or it drowns the one real
finding in seventeen NODE_ENV, DRY_RUN, feature-flag, and test-snapshot
matches.

What it IS good for, and why it still beat the vocabulary approach today:
it caught `gantt-embed`'s real gap on the first pass, using a structural
fact, where the vocabulary comes ORIGINATES a value rather than what
anyone named it, and it does not depend on the word "token" appearing
anywhere in the file. The vocabulary sweep cannot say that about itself.
