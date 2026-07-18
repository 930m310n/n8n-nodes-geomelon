# Vendored geomelon client

This is a copy of `lib/typescript/src/{client,errors,types,version}.ts`, not a dependency on the published `geomelon` npm package.

n8n's community node verification guidelines require zero runtime dependencies, so this package cannot `require('geomelon')` even though it's a thin wrapper around exactly that client. Only the `.js` import extensions were stripped (this package compiles with `module: commonjs`, unlike the dual ESM/CJS build in `lib/typescript`); the code is otherwise unchanged.

When `lib/typescript/src/client.ts` (or `errors.ts`/`types.ts`) changes, port the change here by hand and bump `version.ts` to match. `client.test.ts` in `lib/typescript` is the closest thing to a regression check — run it there before and after porting.
