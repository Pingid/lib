import type { Node, Unsub } from '../../node/index.ts'
import type { Frame, Message } from './frame.ts'

// ------------------------------------------------------------------
// Sink
// ------------------------------------------------------------------

export type Sink = (payload: unknown, meta: Message) => void

// ------------------------------------------------------------------
// Topic
// ------------------------------------------------------------------

/** One channel, typed */
export interface Topic<T> {
  /** Publishes to everyone listening, or to one sender when to is given */
  send(payload: T, to?: string): boolean
  /** Subscribes to this channel. The first listener declares the interest. */
  listen(fn: (payload: T, meta: Message) => void): Unsub
}

// ------------------------------------------------------------------
// ChannelTopic
// ------------------------------------------------------------------

/** A Topic over a Wire's own node. Interest is declared on the first listener and dropped with the last. */
export class ChannelTopic<T> implements Topic<T> {
  readonly #channel: string
  readonly #node: Node<Frame>
  readonly #sinks: Map<string, Set<Sink>>
  constructor(channel: string, node: Node<Frame>, sinks: Map<string, Set<Sink>>) {
    this.#channel = channel
    this.#node = node
    this.#sinks = sinks
  }
  public send(payload: T, to?: string): boolean {
    const frame: Frame = to === undefined ? { t: 'pub', c: this.#channel, d: payload } : { t: 'pub', c: this.#channel, d: payload, to }
    return this.#node.send(frame)
  }
  public listen(fn: (payload: T, meta: Message) => void): Unsub {
    const set = this.#sinks.get(this.#channel) ?? new Set<Sink>()
    this.#sinks.set(this.#channel, set)
    const sink = fn as Sink
    set.add(sink)
    if (set.size === 1) this.#node.send({ t: 'want', c: this.#channel, on: true })
    return () => {
      if (!set.delete(sink) || set.size > 0) return
      this.#sinks.delete(this.#channel)
      this.#node.send({ t: 'want', c: this.#channel, on: false })
    }
  }
}
