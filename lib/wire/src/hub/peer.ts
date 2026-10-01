import type { Node, Unsub } from '../node/node.ts'
import type { Meta } from './meta.ts'

// ------------------------------------------------------------------
// Peer
// ------------------------------------------------------------------

/** A node the Hub is holding. Identity is stable for its lifetime, so it keys a map. */
export interface Peer<T = unknown> extends Node<T> {
  /** The facts this peer was added with */
  readonly meta: Meta
}

// ------------------------------------------------------------------
// HubPeer
// ------------------------------------------------------------------

/** The Peer a Hub wraps around an added node. Outbound sends run the hub's send chain. */
export class HubPeer<T = unknown> implements Peer<T> {
  readonly #node: Node<T>
  readonly #meta: Meta
  readonly #dispatch: (peer: Peer<T>, msg: T) => boolean
  constructor(node: Node<T>, meta: Meta, dispatch: (peer: Peer<T>, msg: T) => boolean) {
    this.#node = node
    this.#meta = meta
    this.#dispatch = dispatch
  }
  public get meta(): Meta {
    return this.#meta
  }
  public send(msg: T): boolean {
    return this.#dispatch(this, msg)
  }
  public listen(fn: (msg: T) => void): Unsub {
    return this.#node.listen(fn)
  }
  public closed(fn: () => void): Unsub {
    return this.#node.closed(fn)
  }
  public close(): void {
    this.#node.close()
  }
}
