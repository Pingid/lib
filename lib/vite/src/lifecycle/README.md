# Lifecycle

Run a side effect alongside vite — codegen, a child process, a watcher — without writing the plugin hooks by hand. `start` owns the dev server's lifetime, `build` runs once per `vite build`.

## Setup

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { lifecycle } from '@pingid/lib/vite'

import { generate } from './tools/openapi.ts'

export default defineConfig({
  plugins: [
    lifecycle({
      name: 'openapi',
      build: () => generate(),
      start: async ({ watch }) => {
        await generate()
        watch('./schema.json', () => generate())
      },
    }),
  ],
})
```

## Hooks

`build` runs in `buildStart`, before the bundle, and is deduped across vite 6+'s per-environment builds so it fires once per pass. Throwing fails the build with the plugin named.

`start` runs when the dev server is created. Whatever it returns is called when the server closes:

```ts
start: async () => {
  const proc = spawn('my-daemon', [])
  return () => void proc.kill()
}
```

Its context carries the resolved `config`, the `server`, and `watch`:

- `watch(file, cb)` adds `file` to vite's watcher and runs `cb` on every change. Relative paths resolve against vite root. A rejected `cb` is logged, not fatal.

## Notes

Nothing runs `start` during a build and nothing runs `build` in dev — if a generator is needed in both, call it from both, as above. If your effect writes a file the dev server watches, write it only when the content changes or the watcher will loop.
