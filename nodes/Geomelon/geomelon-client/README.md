# Vendored geomelon client

This started as a copy of `lib/typescript/src/{client,errors,types,version}.ts`, not a dependency on the published `geomelon` npm package — n8n's community node verification guidelines require zero runtime dependencies, so this package cannot `require('geomelon')` even though it's conceptually a thin wrapper around exactly that client.

**`types.ts` and `version.ts` are still a straight copy** (only `.js` import extensions stripped, since this package compiles with `module: commonjs` unlike the dual ESM/CJS build in `lib/typescript`).

**`client.ts` has diverged on purpose** and is no longer a 1:1 port. n8n's `@n8n/community-nodes/no-restricted-globals` lint rule bans `setTimeout`/`clearTimeout`/`process`/even `globalThis` outright — there's no alias that dodges it — so the original fetch-based `Transport` (manual `AbortController` timeout + retry-with-backoff) cannot exist in a verified node. Instead:

- `Transport` no longer calls `fetch` directly. It takes an injected `HttpRequestFn`, which `Geomelon.node.ts` builds from `this.helpers.httpRequest` — n8n's own HTTP helper owns timeout/abort handling internally, so this file never touches a timer.
- Retry-with-backoff is gone entirely; there's no lint-compliant way to `sleep()` in a community node. Retries are now the workflow-level "Retry on Fail" toggle n8n gives every node — a user setting, not code here.
- `errors.ts` / `GeomelonError` is gone. n8n's `require-node-api-error` rule forbids throwing anything except `NodeApiError`/`NodeOperationError`, even from internal library code — so `Transport` throws `NodeApiError` directly, which means it needs an `INode` reference (threaded through `GeomelonClient`'s constructor) to construct one.

**`types.ts`/`version.ts`**: when `lib/typescript/src/types.ts` changes, port the change here by hand and bump `version.ts` to match.

**`client.ts`**: when `lib/typescript/src/client.ts` changes, only port changes to the sub-client classes (`CitiesClient`, `CountriesClient`, `RegionsClient`, `LanguagesClient`, `OneshotClient`) and their endpoint paths/params — the `Transport`/error-handling layer is intentionally different here and should not be re-synced from the TS client. `client.test.ts` in `lib/typescript` is the closest thing to a regression check for the sub-client shape; there's no equivalent test for this file's `Transport` since it depends on n8n's execution context.
