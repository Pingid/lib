/*--------------------------------------------------------------------------

@pingid/lib-wire/protocols

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

import { Hub, plugin, type HubOptions, type Meta } from '../../hub/index.ts'
import { Interest } from '../../interest/index.ts'
import { participant, tagged, type Node, type Unsub } from '../../node/index.ts'
import type { Frame, Key, Watch } from './frame.ts'

// ------------------------------------------------------------------
// Keys
// ------------------------------------------------------------------
function hash([collection, id]: Key): string {
  return `${collection}/${id}`
}

/** A patch reaches the record's watchers and the collection's alike */
function expand([collection, id]: Key): Key[] {
  return id === '*'
    ? [[collection, '*']]
    : [
        [collection, id],
        [collection, '*'],
      ]
}

// ------------------------------------------------------------------
// StoreOptions
// ------------------------------------------------------------------
export interface StoreOptions extends HubOptions<Frame> {
  /** The tag this protocol's frames ride under, so one transport can carry several */
  name: string
}

// ------------------------------------------------------------------
// Sink
// ------------------------------------------------------------------
type Sink = (patch: unknown, at: Watch) => void

// ------------------------------------------------------------------
// Store
// ------------------------------------------------------------------
/**
 * The same machinery as Topics under a compound key, with expand doing the wildcard. Shares
 * nothing with topics except Interest, which never learns what a collection is. One end: the
 * same call whether it hosts the others or joins them.
 *
 * @example
 * ```ts
 * const viewer = new Store({ name: 'store' })
 * viewer.add(server)
 * viewer.watch('users', '42', (patch) => apply(patch))
 * viewer.watch('users', '*', (patch, at) => log(at.id, patch))
 * viewer.patch('users', '42', { name: 'ada' })
 * ```
 */
export class Store {
  readonly #name: string
  readonly #hub: Hub<Frame>
  readonly #here: Node<Frame>
  readonly #wants: Interest<Frame, Key>
  readonly #sinks: Map<string, Set<Sink>>
  constructor(options: StoreOptions) {
    this.#name = options.name
    this.#sinks = new Map<string, Set<Sink>>()
    this.#wants = new Interest<Frame, Key>({
      read: (msg) => (msg.t === 'watch' ? { key: [msg.k[0], msg.k[1]] as Key, on: msg.on } : null),
      write: ({ key, on }) => ({ t: 'watch', k: [key[0], key[1]], on }),
      hash,
      expand,
    })

    const hello = plugin<Frame>(() => ({ open: (peer) => void peer.send({ t: 'hello' }) }))

    const routes = plugin<Frame>(() => ({
      data: (peer, msg, next) => {
        if (msg.t === 'hello') return void this.#wants.announce(peer)
        if (msg.t !== 'patch') return next(msg)
        for (const to of this.#wants.match([msg.c, msg.id], peer)) to.send(msg)
      },
    }))

    this.#hub = new Hub<Frame>([hello, this.#wants, routes], options)
    this.#here = participant(this.#hub)
    this.#here.listen((msg) => this.#inbound(msg))
  }
  // ----------------------------------------------------------------
  // Peers
  // ----------------------------------------------------------------
  /** Joins another end over any node. The returned Unsub removes and closes it. */
  public add(node: Node<unknown>, meta?: Meta): Unsub {
    return this.#hub.add(tagged<Frame>(node, this.#name), meta)
  }
  // ----------------------------------------------------------------
  // Records
  // ----------------------------------------------------------------
  /** Watches one record, or every record in the collection when id is '*' */
  public watch(collection: string, id: string, fn: Sink): Unsub {
    const key = hash([collection, id])
    const set = this.#sinks.get(key) ?? new Set<Sink>()
    this.#sinks.set(key, set)
    set.add(fn)
    if (set.size === 1) this.#here.send({ t: 'watch', k: [collection, id], on: true })
    return () => {
      if (!set.delete(fn) || set.size > 0) return
      this.#sinks.delete(key)
      this.#here.send({ t: 'watch', k: [collection, id], on: false })
    }
  }
  /** Publishes a patch to everyone watching the record or its collection */
  public patch(collection: string, id: string, patch: unknown): boolean {
    return this.#here.send({ t: 'patch', c: collection, id, d: patch })
  }
  /** Keys anyone on this hub is watching, its own peers included */
  public watched(): readonly Key[] {
    return this.#wants.wanted()
  }
  // ----------------------------------------------------------------
  // Lifetime
  // ----------------------------------------------------------------
  public close(): void {
    this.#hub.close()
  }
  // ----------------------------------------------------------------
  // Inbound
  // ----------------------------------------------------------------
  #inbound(msg: Frame): void {
    if (msg.t !== 'patch') return
    for (const key of expand([msg.c, msg.id])) {
      const set = this.#sinks.get(hash(key))
      if (!set) continue
      for (const fn of [...set]) fn(msg.d, { collection: msg.c, id: msg.id })
    }
  }
}
