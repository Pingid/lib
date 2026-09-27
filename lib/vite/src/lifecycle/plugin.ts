import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import path from 'node:path'

export type MaybePromise<T> = T | Promise<T>

/** Undoes whatever `start` set up. Runs once, when the dev server closes. */
export type Cleanup = () => MaybePromise<void>

export interface DevCtx {
  config: ResolvedConfig
  server: ViteDevServer
  /** Re-run `cb` whenever `file` changes. Relative paths resolve against vite root. */
  watch: (file: string | string[], cb: (file: string) => any) => () => void
}

export interface BuildCtx {
  config: ResolvedConfig
}

export type Lifecycle = (c: DevCtx) => MaybePromise<Cleanup | void>
export type Trigger = (c: BuildCtx) => MaybePromise<void>

export interface Hooks {
  /** Suffix for the plugin name and log prefix, e.g. `openapi`. */
  name?: string
  /** Runs once per dev server. Anything it returns is called on close. */
  start?: Lifecycle
  /** Runs once per `vite build`, before the bundle. */
  build: Trigger
}

/**
 * Runs side effects — codegen, a child process, a watcher — alongside vite.
 *
 * `start` owns the dev server's lifetime and `build` owns a one-shot build,
 * which is the only difference between the two modes worth writing twice.
 */
export const lifecycle = (hooks: Hooks): Plugin => {
  const label = hooks.name ? `pingid:lifecycle:${hooks.name}` : 'pingid:lifecycle'
  let config: ResolvedConfig
  let cleanup: Promise<Cleanup | void> | null = null

  return {
    name: label,

    configResolved: (config_) => void (config = config_),

    // A `function` expression so `this` is the rollup plugin context: `this.error`
    // names the plugin and stops the build, rather than leaving a rejection behind.
    buildStart: async function () {
      if (config.command !== 'build') return
      // Vite 6+ builds once per environment, re-resolving the config and handing
      // each one its own plugin instance — so the dedupe has to outlive the closure.
      const done = pass(config.root)
      if (this.meta.watchMode) done.clear()
      if (done.has(label)) return
      done.add(label)

      try {
        await hooks.build({ config })
      } catch (error) {
        this.error(`[${label}] ${message(error)}`)
      }
    },

    configureServer(server) {
      if (!hooks.start) return
      const em = emitter<[string]>()

      const watch = (file: string | string[], cb: (file: string) => void) => {
        const files = Array.isArray(file) ? file : [file]
        for (const file of files) server.watcher.add(path.resolve(config.root, file))
        return em.on((changed) => {
          const target = files.find((file) => path.resolve(changed).includes(file))
          if (!target) return
          cb(target)
        })
      }
      server.watcher.on('all', (_event, changed) => em.emit(changed))
      cleanup = Promise.resolve(hooks.start({ config, server, watch }))
      cleanup.catch((e: unknown) => config.logger.error(`[${label}] ${message(e)}`))
    },

    // Vite fires this on `server.close()` too, which is what makes one hook cover
    // both a dev server shutting down and a build finishing.
    closeBundle: async () => {
      const pending = cleanup
      if (!pending) return
      cleanup = null
      await pending.then((fn) => fn?.()).catch((e: unknown) => config.logger.error(`[${label}] ${message(e)}`))
    },
  }
}

/** What a single `vite build` has already run, keyed by project root. */
const passes = new Map<string, Set<string>>()

const pass = (root: string) => {
  const found = passes.get(root)
  if (found) return found
  const next = new Set<string>()
  passes.set(root, next)
  return next
}

const message = (error: unknown) => {
  const e = error instanceof Error ? error : new Error(String(error))
  return e.stack ?? e.message
}

const emitter = <A extends any[]>() => {
  const listeners = new Set<(...args: A) => void>()
  return {
    on: (listener: (...args: A) => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    off: (listener: (...args: A) => void) => listeners.delete(listener),
    emit: (...args: A) => Array.from(listeners).forEach((listener) => listener(...args)),
  }
}
