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

import type { Node, Unsub } from '../node/node.ts'
import type { Adder } from './adder.ts'
import type { Hooks } from './hooks.ts'
import type { Meta } from './meta.ts'
import type { Plugin } from './plugin.ts'
import { HubPeer, type Peer } from './peer.ts'

// ------------------------------------------------------------------
// HubOptions
// ------------------------------------------------------------------
/** Faults, and messages nothing consumed */
export interface HubOptions<T = unknown> {
  /** Called for anything a hook threw. Rethrown on a microtask when unset. */
  onError?: ((err: unknown) => void) | undefined
  /** Called for an inbound message that ran the whole chain without being consumed */
  onUnhandled?: ((peer: Peer<T>, msg: T) => void) | undefined
}

// ------------------------------------------------------------------
// Chain
// ------------------------------------------------------------------
type Chain<T> = (peer: Peer<T>, msg: T, end: (msg: T) => void) => void

/** The identity chain, used until the plugins have been bound */
function passthrough<T>(): Chain<T> {
  return (_peer, msg, end) => end(msg)
}

/** Folds one hook of every plugin into a single call chain */
function chain<T>(hooks: readonly Hooks<T>[], key: 'data' | 'send'): Chain<T> {
  const fns = hooks.flatMap((hook) => (hook[key] ? [hook[key]!] : []))
  if (key === 'send') fns.reverse()
  return fns.reduceRight<Chain<T>>((down, fn) => (peer, msg, end) => fn(peer, msg, (out) => down(peer, out, end)), passthrough<T>())
}

const noop: Unsub = () => {}

// ------------------------------------------------------------------
// Hub
// ------------------------------------------------------------------
/**
 * A set of peers and a hook chain. Nothing else. Admission is a hook closing the peer;
 * participation is a node you add.
 *
 * @example
 * ```ts
 * const gate = plugin<Frame>(() => ({ open: (peer) => void (peer.meta['token'] === 'ok' || peer.close()) }))
 * const hub = new Hub<Frame>([gate, routes])
 * const here = participant(hub)
 * hub.add(node, { name: 'worker' })
 * ```
 */
export class Hub<T = unknown> implements Adder<T> {
  readonly #options: HubOptions<T>
  readonly #peers: Set<Peer<T>>
  readonly #ended: Set<() => void>
  #hooks: readonly Hooks<T>[]
  #inward: Chain<T>
  #outward: Chain<T>
  #list: readonly Peer<T>[] | null
  #closed: boolean
  constructor(plugins: readonly Plugin<T>[] = [], options: HubOptions<T> = {}) {
    this.#options = options
    this.#peers = new Set<Peer<T>>()
    this.#ended = new Set<() => void>()
    this.#list = null
    this.#closed = false
    // Bound last, and against an already usable hub, so a plugin may call back
    // into it from inside its own bind.
    this.#hooks = []
    this.#inward = passthrough<T>()
    this.#outward = passthrough<T>()
    this.#hooks = plugins.map((plugin) => plugin.bind(this))
    this.#inward = chain(this.#hooks, 'data')
    this.#outward = chain(this.#hooks, 'send')
  }
  // ----------------------------------------------------------------
  // Peers
  // ----------------------------------------------------------------
  /** Takes a node as a peer. The returned Unsub removes it and closes it. */
  public add(node: Node<T>, meta: Meta = {}): Unsub {
    if (this.#closed) return (node.close(), noop)
    const peer = new HubPeer<T>(node, meta, (self, msg) => this.#outbound(node, self, msg))
    this.#peers.add(peer)
    this.#list = null
    const off = node.listen((msg) => this.#guard(() => this.#inward(peer, msg, (out) => this.#options.onUnhandled?.(peer, out))))
    // Fires synchronously when the node is already dead, so only a peer that
    // survived being subscribed to ever reaches open.
    node.closed(() => this.#drop(peer))
    if (!this.#peers.has(peer)) return (off(), noop)
    for (const hook of this.#hooks) if (hook.open) this.#guard(() => hook.open!(peer))
    return () => {
      this.#drop(peer)
      off()
      node.close()
    }
  }
  /** The peers this hub is holding */
  public get peers(): readonly Peer<T>[] {
    return this.#list ?? (this.#list = [...this.#peers])
  }
  // ----------------------------------------------------------------
  // Lifetime
  // ----------------------------------------------------------------
  /** Subscribes to this hub closing. Fires immediately if it already has. */
  public closed(fn: () => void): Unsub {
    if (this.#closed) return (fn(), noop)
    this.#ended.add(fn)
    return () => void this.#ended.delete(fn)
  }
  /** Closes this hub and every peer it holds */
  public close(): void {
    if (this.#closed) return
    this.#closed = true
    for (const peer of [...this.#peers]) {
      this.#drop(peer)
      peer.close()
    }
    this.#list = null
    for (const fn of [...this.#ended]) this.#guard(fn)
    this.#ended.clear()
  }
  // ----------------------------------------------------------------
  // Outbound
  // ----------------------------------------------------------------
  #outbound(node: Node<T>, peer: Peer<T>, msg: T): boolean {
    if (this.#closed) return false
    let sent = false
    this.#guard(() => this.#outward(peer, msg, (out) => void (sent = node.send(out))))
    return sent
  }
  // ----------------------------------------------------------------
  // Drop
  // ----------------------------------------------------------------
  #drop(peer: Peer<T>): void {
    if (!this.#peers.delete(peer)) return
    this.#list = null
    for (const hook of this.#hooks) if (hook.close) this.#guard(() => hook.close!(peer))
  }
  // ----------------------------------------------------------------
  // Faults
  // ----------------------------------------------------------------
  #guard(fn: () => void): void {
    try {
      fn()
    } catch (err) {
      this.#fail(err)
    }
  }
  #fail(err: unknown): void {
    if (this.#options.onError) return this.#options.onError(err)
    queueMicrotask(() => {
      throw err
    })
  }
}
