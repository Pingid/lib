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

import { Directory } from '../../directory/index.ts'
import { Hub, plugin, type HubOptions, type Meta, type Peer } from '../../hub/index.ts'
import { Interest } from '../../interest/index.ts'
import { participant, tagged, type Node, type Unsub } from '../../node/index.ts'
import type { Channels, Frame } from './frame.ts'
import { ChannelTopic, type Sink, type Topic } from './topic.ts'

// ------------------------------------------------------------------
// WireOptions
// ------------------------------------------------------------------
export interface WireOptions<C extends Channels> extends HubOptions<Frame> {
  /** The tag this protocol's frames ride under, so one transport can carry several */
  name: string
  /** Channels whose last payload is replayed to whoever asks for them next */
  retain?: readonly (keyof C & string)[] | undefined
}

// ------------------------------------------------------------------
// Wire
// ------------------------------------------------------------------
/**
 * Channels keyed by a name: Interest for the table, Directory for replies, twenty lines for
 * the rest. One end, and the same call whether it hosts the others or joins them.
 *
 * @example
 * ```ts
 * const page = new Wire<{ tick: number }>({ name: 'app', retain: ['tick'] })
 * page.add(worker)
 * page.topic('tick').listen((n, meta) => console.log(n, meta.from))
 * page.topic('tick').send(1)
 * ```
 */
export class Wire<C extends Channels> {
  readonly #name: string
  readonly #retains: Set<string>
  readonly #held: Map<string, unknown>
  readonly #hub: Hub<Frame>
  readonly #here: Node<Frame>
  readonly #who: Directory<Frame>
  readonly #wants: Interest<Frame, string>
  readonly #sinks: Map<string, Set<Sink>>
  constructor(options: WireOptions<C>) {
    this.#name = options.name
    this.#retains = new Set<string>(options.retain ?? [])
    this.#held = new Map<string, unknown>()
    this.#sinks = new Map<string, Set<Sink>>()

    this.#who = new Directory<Frame>({
      from: (msg) => (msg.t === 'pub' ? (msg.from ?? null) : ''),
      stamp: (msg, id) => ({ ...msg, from: id }),
    })

    this.#wants = new Interest<Frame, string>({
      read: (msg) => (msg.t === 'want' ? { key: msg.c, on: msg.on } : null),
      write: ({ key, on }) => ({ t: 'want', c: key, on }),
    })

    this.#wants.onWant((peer, channel) => {
      if (this.#held.has(channel)) peer.send({ t: 'pub', c: channel, d: this.#held.get(channel), r: true })
    })

    const hello = plugin<Frame>(() => ({ open: (peer) => void peer.send({ t: 'hello' }) }))

    const routes = plugin<Frame>(() => ({
      data: (peer, msg, next) => {
        if (msg.t === 'hello') return void this.#wants.announce(peer)
        if (msg.t !== 'pub') return next(msg)
        if (msg.to !== undefined) return void this.#who.peer(msg.to)?.send(msg)
        if (this.#retains.has(msg.c)) this.#held.set(msg.c, msg.d)
        for (const to of this.#wants.match(msg.c, peer)) to.send(msg)
      },
    }))

    this.#hub = new Hub<Frame>([hello, this.#who, this.#wants, routes], options)
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
  /** The ends joined to this one, its own participation excluded */
  public get peers(): readonly Peer<Frame>[] {
    return this.#hub.peers.filter((peer) => peer.meta['local'] !== true)
  }
  // ----------------------------------------------------------------
  // Topics
  // ----------------------------------------------------------------
  /** One channel, typed by C */
  public topic<K extends keyof C & string>(channel: K): Topic<C[K]> {
    return new ChannelTopic<C[K]>(channel, this.#here, this.#sinks)
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
    if (msg.t !== 'pub') return
    const set = this.#sinks.get(msg.c)
    if (!set) return
    const meta = { channel: msg.c, from: msg.from ?? null, retained: msg.r === true }
    for (const fn of [...set]) fn(msg.d, meta)
  }
}
