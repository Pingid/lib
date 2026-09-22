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

import type { Node, Unsub } from './node.ts'

const noop: Unsub = () => {}

// ------------------------------------------------------------------
// PairSide
// ------------------------------------------------------------------
interface PairSide<T> {
  readonly sinks: Set<(msg: T) => void>
  readonly gone: Set<() => void>
  readonly held: T[]
}

function side<T>(): PairSide<T> {
  return { sinks: new Set<(msg: T) => void>(), gone: new Set<() => void>(), held: [] }
}

// ------------------------------------------------------------------
// PairChannel
// ------------------------------------------------------------------
/** The state the two ends of a pair share. Closing either closes both. */
class PairChannel<T> {
  readonly #sides: readonly [PairSide<T>, PairSide<T>]
  #open: boolean
  constructor() {
    this.#sides = [side<T>(), side<T>()]
    this.#open = true
  }
  public get open(): boolean {
    return this.#open
  }
  public near(index: 0 | 1): PairSide<T> {
    return this.#sides[index]
  }
  public far(index: 0 | 1): PairSide<T> {
    return this.#sides[index === 0 ? 1 : 0]
  }
  public shut(): void {
    if (!this.#open) return
    this.#open = false
    for (const one of this.#sides) {
      for (const fn of [...one.gone]) fn()
      one.gone.clear()
      one.sinks.clear()
      one.held.length = 0
    }
  }
}

// ------------------------------------------------------------------
// PairNode
// ------------------------------------------------------------------
/** One end of a PairChannel. Delivery is deferred to a microtask, as a real transport would be. */
class PairNode<T> implements Node<T> {
  readonly #channel: PairChannel<T>
  readonly #index: 0 | 1
  constructor(channel: PairChannel<T>, index: 0 | 1) {
    this.#channel = channel
    this.#index = index
  }
  public send(msg: T): boolean {
    if (!this.#channel.open) return false
    queueMicrotask(() => {
      if (!this.#channel.open) return
      const far = this.#channel.far(this.#index)
      if (far.sinks.size === 0) return void far.held.push(msg)
      for (const fn of [...far.sinks]) fn(msg)
    })
    return true
  }
  public listen(fn: (msg: T) => void): Unsub {
    const near = this.#channel.near(this.#index)
    near.sinks.add(fn)
    for (const msg of near.held.splice(0)) fn(msg)
    return () => void near.sinks.delete(fn)
  }
  public closed(fn: () => void): Unsub {
    if (!this.#channel.open) return (fn(), noop)
    const near = this.#channel.near(this.#index)
    near.gone.add(fn)
    return () => void near.gone.delete(fn)
  }
  public close(): void {
    this.#channel.shut()
  }
}

// ------------------------------------------------------------------
// Pair
// ------------------------------------------------------------------
/**
 * Creates two cross-wired nodes in one process.
 *
 * @example
 * ```ts
 * const [mine, theirs] = pair<Frame>()
 * hub.add(theirs)
 * mine.send({ t: 'hello' })
 * ```
 */
export function pair<T>(): readonly [Node<T>, Node<T>] {
  const channel = new PairChannel<T>()
  return [new PairNode<T>(channel, 0), new PairNode<T>(channel, 1)] as const
}
