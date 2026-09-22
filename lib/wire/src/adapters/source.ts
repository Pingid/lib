/*--------------------------------------------------------------------------

@pingid/lib-wire/adapters

The MIT License (MIT)

Copyright (c) 2026 Dan Beaven <dm.beaven@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/

import type { Adder, Meta } from '../hub/index.ts'
import type { Node, Unsub } from '../node/node.ts'

const noop: Unsub = () => {}

// ------------------------------------------------------------------
// Source
// ------------------------------------------------------------------
/** Something that feeds an Adder peers until you stop it */
export type Source<T> = (into: Adder<T>) => Unsub

// ------------------------------------------------------------------
// SourceHost
// ------------------------------------------------------------------
/** The half handed to source's open */
export interface SourceHost<T> {
  /** Closed rather than added once the source has stopped, so nothing is orphaned */
  offer(node: Node<T>, meta?: Meta): void
  fail(err: unknown): void
  /** Aborts when the source stops. Hand it to anything that takes one. */
  readonly signal: AbortSignal
}

// ------------------------------------------------------------------
// SourceOptions
// ------------------------------------------------------------------
export interface SourceOptions {
  onError?: ((err: unknown) => void) | undefined
}

// ------------------------------------------------------------------
// Source
// ------------------------------------------------------------------
/**
 * Creates a Source that owns what it produced: the teardown stops accepting, then closes
 * every node it offered.
 *
 * @example
 * ```ts
 * const spawned = source<Frame>((host) => {
 *   const worker = new Worker(url)
 *   host.offer(fromPostMessage(worker), { name: 'worker' })
 *   host.signal.addEventListener('abort', () => worker.terminate())
 * })
 *
 * const stop = spawned(hub)
 * stop()
 * ```
 */
export function source<T>(open: (host: SourceHost<T>) => Unsub | void, options: SourceOptions = {}): Source<T> {
  return (into) => {
    const offs = new Set<Unsub>()
    const controller = new AbortController()
    let attached: Unsub | null = null
    let stopped = false

    const host: SourceHost<T> = {
      signal: controller.signal,
      fail: (err) => {
        if (options.onError) return options.onError(err)
        queueMicrotask(() => {
          throw err
        })
      },
      offer: (node, meta) => {
        // An event already in flight when the source stopped. Closing it is
        // the only honest answer: nobody is left to serve it.
        if (stopped) return node.close()
        const off = into.add(node, meta)
        offs.add(off)
        node.closed(() => offs.delete(off))
      },
    }

    const stop: Unsub = () => {
      if (stopped) return
      stopped = true
      controller.abort()
      attached?.()
      for (const off of [...offs]) off()
      offs.clear()
    }

    // Assigned after, because open may stop the source from inside itself.
    const off = open(host)
    if (off) {
      if (stopped) off()
      else attached = off
    }
    return stopped ? noop : stop
  }
}

// ------------------------------------------------------------------
// Adders
// ------------------------------------------------------------------
/** Creates an Adder that hands every node to each of the given adders */
export function adders<T>(...into: readonly Adder<T>[]): Adder<T> {
  return {
    add: (node, meta) => {
      const offs = into.map((one) => one.add(node, meta))
      return () => offs.forEach((off) => off())
    },
  }
}
