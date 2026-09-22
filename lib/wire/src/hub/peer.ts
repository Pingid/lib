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
