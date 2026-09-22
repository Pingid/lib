/*--------------------------------------------------------------------------

@pingid/lib-wire

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

import type { Hooks, Hub, Peer, Plugin } from '../hub/index.ts'
import type { Unsub } from '../node/node.ts'

// ------------------------------------------------------------------
// DirectoryOptions
// ------------------------------------------------------------------
/** Where a sender id lives on your message, and how to put one there */
export interface DirectoryOptions<T> {
  /** Null for an unstamped message, which gets stamped. Any string for one to leave alone. */
  from(msg: T): string | null
  /** Writes an id onto a message */
  stamp(msg: T, id: string): T
  /** Mints an id for a peer. Default is a random tag plus a counter. */
  mint?: (() => string) | undefined
}

// ------------------------------------------------------------------
// Directory
// ------------------------------------------------------------------
/**
 * Where a talker lives, learned from hearing it talk. Stamps unstamped messages, and
 * remembers which peer each sender was last heard through. No wire, no id scheme.
 *
 * @example
 * ```ts
 * const who = new Directory<Frame>({
 *   from: (msg) => (msg.t === 'pub' ? (msg.from ?? null) : ''),
 *   stamp: (msg, id) => ({ ...msg, from: id }),
 * })
 * const routes = plugin<Frame>(() => ({
 *   data: (peer, msg, next) => (msg.to ? void who.peer(msg.to)?.send(msg) : next(msg)),
 * }))
 * new Hub<Frame>([who, routes]) // who first: it stamps before routes reads
 * ```
 */
export class Directory<T> implements Plugin<T> {
  readonly #options: DirectoryOptions<T>
  readonly #mint: () => string
  readonly #ids: WeakMap<Peer<T>, string>
  readonly #routes: Map<string, Peer<T>>
  readonly #changes: Set<() => void>
  #seq: number
  constructor(options: DirectoryOptions<T>) {
    const tag = Math.random().toString(36).slice(2, 6)
    this.#options = options
    this.#seq = 0
    this.#mint = options.mint ?? (() => `${tag}-${++this.#seq}`)
    this.#ids = new WeakMap<Peer<T>, string>()
    this.#routes = new Map<string, Peer<T>>()
    this.#changes = new Set<() => void>()
  }
  // ----------------------------------------------------------------
  // Plugin<T>
  // ----------------------------------------------------------------
  public bind(_hub: Hub<T>): Hooks<T> {
    return {
      data: (peer, msg, next) => {
        const from = this.#options.from(msg)
        if (from === null) return next(this.#options.stamp(msg, this.id(peer)))
        // Heard from `from` via `peer`, so that is the way back to it.
        if (this.#routes.get(from) !== peer) {
          this.#routes.set(from, peer)
          this.#changed()
        }
        next(msg)
      },
      close: (peer) => {
        for (const [id, via] of this.#routes) if (via === peer) this.#routes.delete(id)
        this.#changed()
      },
    }
  }
  // ----------------------------------------------------------------
  // Routes
  // ----------------------------------------------------------------
  /** This hub's id for a peer, minted on first use */
  public id(peer: Peer<T>): string {
    const known = this.#ids.get(peer)
    if (known) return known
    const id = this.#mint()
    this.#ids.set(peer, id)
    this.#routes.set(id, peer)
    return id
  }
  /** Who to hand something addressed to id, or null if never heard of */
  public peer(id: string): Peer<T> | null {
    return this.#routes.get(id) ?? null
  }
  // ----------------------------------------------------------------
  // Events
  // ----------------------------------------------------------------
  /** The route table moved */
  public onChange(fn: () => void): Unsub {
    this.#changes.add(fn)
    return () => void this.#changes.delete(fn)
  }
  #changed(): void {
    for (const fn of [...this.#changes]) fn()
  }
}
