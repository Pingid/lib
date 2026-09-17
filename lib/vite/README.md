# @pingid/lib/vite

Three Vite plugins, each one thing: mount a backend in the dev server, bundle a script that can't be
an ES module, and bind a key to a file.

```bash
npm install github:Pingid/vite#pkg
```

Vite 3–9, ESM only. Every plugin is also its own entry point — `@pingid/lib/vite/plugin/server`,
`/plugin/iife`, `/plugin/virtual` — if you'd rather not pull in the barrel.

## `serve` — a backend inside the dev server

`/api/*` is handled by real application code, loaded through Vite's SSR pipeline, so it picks up
edits with no restart and gets the same transforms and aliases as the rest of the project.

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { serve } from '@pingid/lib/vite'

export default defineConfig({
  plugins: [
    serve({ '/api': { file: './src/api.ts', preview: './dist/server/api.js' } }, { build: (cx) => cx.build() }),
  ],
})
```

```ts
// src/api.ts
export default (request: Request) => Response.json({ ok: new URL(request.url).pathname })
```

A bare function or the `export default { fetch }` shape is detected on its own; a Node
`(req, res, next)` handler is mounted as-is. Anything else — Elysia, Express — is one line:
`{ handler: (m) => (r: Request) => m.default.handle(r) }`.

`preview` is where the built entry lives and `build` is what puts it there during `vite build`, so
`vite preview` serves the same routes as dev. `cx.build()` is esbuild, already aimed at that mount
and overridable.

Also: `strip` for Connect-style mount semantics, `fresh` for a cold start per request, `upgrade` for
websockets alongside Vite's own HMR socket, `onError` for failures. → [docs](src/server/README.md)

## `iife` — a self-contained classic script

For code that can't be an ES module graph served by Vite: service workers, classic `Worker`s,
injected scripts. Edit the file and the _running_ script swaps itself — no reload, no
re-registration.

```ts
// vite.config.ts
import { iife } from '@pingid/lib/vite'

export default defineConfig({ plugins: [iife({ sw: './src/sw.ts' })] })
```

```ts
// src/sw.ts — default-export setup, return teardown
export default () => {
  const onFetch = (e: FetchEvent) => {
    /* ... */
  }
  addEventListener('fetch', onFetch)
  return () => removeEventListener('fetch', onFetch)
}
```

```ts
// src/main.ts
import url from 'iife:sw'

navigator.serviceWorker.register(url, { updateViaCache: 'none' })
```

Served in dev, emitted as an asset in a build, typed through a generated `src/iife.d.ts`.
→ [docs](src/iife/README.md)

## `virtual` — a key that points at a file

Library code depends on the key; `vite.config.ts` decides which file it is. Hot updates re-run your
callback instead of reloading the page.

```ts
// vite.config.ts
import { virtual } from '@pingid/lib/vite'

export default defineConfig({ plugins: [virtual({ routes: './src/routes.ts' })] })
```

```ts
import { run } from '@pingid/lib/vite/virtual'

const routes = run('routes', (mod) => {
  const server = listen(mod.routes)
  return () => server.close() // runs before the next update
})
```

Keys and module shapes are typed from a generated `src/virtual.d.ts`, so an unknown key is a compile
error. Each key becomes its own lazy chunk in a build. → [docs](src/virtual/README.md)

## Examples

Runnable, and the quickest way to see each one working. They link the package from the repo, so
build it once first:

```bash
pnpm install && pnpm build
cd examples/server && pnpm install && pnpm dev
```

`examples/server` mounts a framework-free backend — reused module state, an ephemeral `fresh` mount,
a Node handler, a hand-rolled websocket — and `pnpm build && pnpm preview` there exercises the
`build` hook. `examples/iife` registers a service worker that hot-swaps on edit.

## License

MIT
