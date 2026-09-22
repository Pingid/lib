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
import type { Declaration } from './declaration.ts'

// ------------------------------------------------------------------
// InterestOptions
// ------------------------------------------------------------------
/** How declarations ride your wire, and what a key is */
export interface InterestOptions<T, K> {
  /** Null when the message is not a declaration */
  read(msg: T): Declaration<K> | null
  /** Writes a declaration as a message of your own */
  write(decl: Declaration<K>): T
  /** Stable identity for a key. Default String(key). */
  hash?: ((key: K) => string) | undefined
  /** Interest keys a published key reaches. Default [key]. Wildcards live here. */
  expand?: ((key: K) => Iterable<K>) | undefined
}

// ------------------------------------------------------------------
// Interest
// ------------------------------------------------------------------
/**
 * Who wants what, and keeping the neighbours told. Owns the index, the diff that tells
 * each peer what the others want, and the cleanup. No wire, no key type.
 *
 * @example
 * ```ts
 * const wants = new Interest<Frame, string>({
 *   read: (msg) => (msg.t === 'want' ? { key: msg.c, on: msg.on } : null),
 *   write: ({ key, on }) => ({ t: 'want', c: key, on }),
 * })
 * const routes = plugin<Frame>(() => ({
 *   data: (peer, msg, next) => {
 *     if (msg.t !== 'pub') return next(msg)
 *     for (const to of wants.match(msg.c, peer)) to.send(msg)
 *   },
 * }))
 * new Hub<Frame>([wants, routes])
 * ```
 */
export class Interest<T, K> implements Plugin<T> {
  readonly #options: InterestOptions<T, K>
  readonly #hash: (key: K) => string
  readonly #expand: (key: K) => Iterable<K>
  readonly #byPeer: Map<Peer<T>, Map<string, K>>
  readonly #byKey: Map<string, Set<Peer<T>>>
  readonly #told: Map<Peer<T>, Map<string, K>>
  readonly #wants: Set<(peer: Peer<T>, key: K) => void>
  readonly #changes: Set<() => void>
  #hub: Hub<T> | null
  constructor(options: InterestOptions<T, K>) {
    this.#options = options
    this.#hash = options.hash ?? ((key: K) => String(key))
    this.#expand = options.expand ?? ((key: K) => [key])
    this.#byPeer = new Map<Peer<T>, Map<string, K>>()
    this.#byKey = new Map<string, Set<Peer<T>>>()
    this.#told = new Map<Peer<T>, Map<string, K>>()
    this.#wants = new Set<(peer: Peer<T>, key: K) => void>()
    this.#changes = new Set<() => void>()
    this.#hub = null
  }
  // ----------------------------------------------------------------
  // Plugin<T>
  // ----------------------------------------------------------------
  public bind(hub: Hub<T>): Hooks<T> {
    this.#hub = hub
    return {
      open: (peer) => this.announce(peer),
      close: (peer) => {
        this.#forget(peer)
        this.#changed()
      },
      data: (peer, msg, next) => {
        const decl = this.#options.read(msg)
        if (!decl) return next(msg)
        this.set(peer, decl.key, decl.on)
      },
    }
  }
  // ----------------------------------------------------------------
  // Queries
  // ----------------------------------------------------------------
  /** Peers wanting key, from excluded, deduplicated across expansions */
  public match(key: K, from?: Peer<T>): readonly Peer<T>[] {
    const out: Peer<T>[] = []
    const seen = new Set<Peer<T>>()
    for (const one of this.#expand(key)) {
      const peers = this.#byKey.get(this.#hash(one))
      if (!peers) continue
      for (const peer of peers) {
        if (peer === from || seen.has(peer)) continue
        seen.add(peer)
        out.push(peer)
      }
    }
    return out
  }
  /** Everything wanted by someone other than except */
  public wanted(except?: Peer<T>): readonly K[] {
    const out = new Map<string, K>()
    for (const [peer, keys] of this.#byPeer) {
      if (peer === except) continue
      for (const [id, key] of keys) out.set(id, key)
    }
    return [...out.values()]
  }
  /** Everything this one peer wants */
  public of(peer: Peer<T>): readonly K[] {
    return [...(this.#byPeer.get(peer)?.values() ?? [])]
  }
  // ----------------------------------------------------------------
  // Mutation
  // ----------------------------------------------------------------
  /** Declares on a peer's behalf, for interest that never crossed a wire */
  public set(peer: Peer<T>, key: K, on: boolean): void {
    const id = this.#hash(key)
    const keys = this.#byPeer.get(peer) ?? new Map<string, K>()
    this.#byPeer.set(peer, keys)
    if (on) {
      if (keys.has(id)) return
      keys.set(id, key)
      const peers = this.#byKey.get(id) ?? new Set<Peer<T>>()
      this.#byKey.set(id, peers)
      peers.add(peer)
      for (const fn of [...this.#wants]) fn(peer, key)
    } else {
      if (!keys.delete(id)) return
      const peers = this.#byKey.get(id)
      peers?.delete(peer)
      if (peers?.size === 0) this.#byKey.delete(id)
      if (keys.size === 0) this.#byPeer.delete(peer)
    }
    this.#changed()
  }
  /** Re-sends the whole set to a peer. Call it when the peer says hello again. */
  public announce(peer: Peer<T>): void {
    this.#told.delete(peer)
    this.#sync()
  }
  // ----------------------------------------------------------------
  // Events
  // ----------------------------------------------------------------
  /** A peer newly wants a key. Where replaying retained state belongs. */
  public onWant(fn: (peer: Peer<T>, key: K) => void): Unsub {
    this.#wants.add(fn)
    return () => void this.#wants.delete(fn)
  }
  /** The table moved */
  public onChange(fn: () => void): Unsub {
    this.#changes.add(fn)
    return () => void this.#changes.delete(fn)
  }
  // ----------------------------------------------------------------
  // Sync
  // ----------------------------------------------------------------
  /** Tells every peer the union of what the others want, as a diff */
  #sync(): void {
    if (this.#hub === null) return
    for (const peer of this.#hub.peers) {
      const want = new Map<string, K>()
      for (const [other, keys] of this.#byPeer) {
        if (other === peer) continue
        for (const [id, key] of keys) want.set(id, key)
      }
      const have = this.#told.get(peer) ?? new Map<string, K>()
      for (const [id, key] of want) if (!have.has(id)) peer.send(this.#options.write({ key, on: true }))
      for (const [id, key] of have) if (!want.has(id)) peer.send(this.#options.write({ key, on: false }))
      this.#told.set(peer, want)
    }
  }
  #changed(): void {
    this.#sync()
    for (const fn of [...this.#changes]) fn()
  }
  #forget(peer: Peer<T>): void {
    const keys = this.#byPeer.get(peer)
    this.#byPeer.delete(peer)
    this.#told.delete(peer)
    if (!keys) return
    for (const id of keys.keys()) {
      const peers = this.#byKey.get(id)
      peers?.delete(peer)
      if (peers?.size === 0) this.#byKey.delete(id)
    }
  }
}
