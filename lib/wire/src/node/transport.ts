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
// TransportHost
// ------------------------------------------------------------------
/** The inbound half of a transport, handed to open before there is a node */
export interface TransportHost<T> {
  /** False once shut has run */
  readonly alive: boolean
  /** Hands an inbound message on, holding it while nobody is listening */
  deliver(msg: T): void
  /** Terminal and idempotent, whoever calls it. Runs release, then fires closed. */
  shut(): void
  /** A fault the node survives: an unclonable payload, a frame that would not parse. */
  fail(err: unknown): void
}

// ------------------------------------------------------------------
// Transport
// ------------------------------------------------------------------
/** The outbound half, returned by open so release closes over what it attached */
export interface Transport<T> {
  /** Never throws. False when the message was dropped. */
  send(msg: T): boolean
  /** The consumer called close(). Say goodbye here if the protocol has one. */
  close?(): void
  /** Runs once, on the first shut, whatever caused it. Detach here. */
  release?(): void
}

// ------------------------------------------------------------------
// TransportOptions
// ------------------------------------------------------------------
export interface TransportOptions<T> {
  /** Inbound held before the first listen. 0 disables. Default 64. */
  pending?: number | undefined
  onError?: ((err: unknown) => void) | undefined
  onDrop?: ((msg: T) => void) | undefined
}

// ------------------------------------------------------------------
// TransportNode
// ------------------------------------------------------------------
/**
 * The bookkeeping every adapter repeats: hold inbound until someone listens, fire closed
 * once, go inert afterwards. `open` runs inside this constructor and may shut synchronously,
 * so a transport handed over already dead yields a node whose `closed` fires on subscribe.
 *
 * @example
 * ```ts
 * const node = new TransportNode<Frame>((host) => {
 *   const on = (event: MessageEvent) => host.deliver(event.data as Frame)
 *   port.addEventListener('message', on)
 *   port.start()
 *   return {
 *     send: (msg) => (port.postMessage(msg), true),
 *     close: () => port.close(),
 *     release: () => port.removeEventListener('message', on),
 *   }
 * })
 * hub.add(node, { name: 'worker' })
 * ```
 */
export class TransportNode<T> implements Node<T> {
  readonly #options: TransportOptions<T>
  readonly #pending: number
  readonly #sinks: Set<(msg: T) => void>
  readonly #gone: Set<() => void>
  readonly #held: T[]
  readonly #host: TransportHost<T>
  #transport: Transport<T> | undefined
  #released: boolean
  #alive: boolean
  constructor(open: (host: TransportHost<T>) => Transport<T>, options: TransportOptions<T> = {}) {
    const self = this
    this.#options = options
    this.#pending = options.pending ?? 64
    this.#sinks = new Set<(msg: T) => void>()
    this.#gone = new Set<() => void>()
    this.#held = []
    this.#transport = undefined
    this.#released = false
    this.#alive = true
    this.#host = {
      get alive() {
        return self.#alive
      },
      deliver: (msg) => this.#deliver(msg),
      shut: () => this.#shut(),
      fail: (err) => this.#report(err),
    }
    this.#transport = open(this.#host)
    // open shut the node before handing anything back. Release what it built.
    if (!this.#alive) this.#release()
  }
  // ----------------------------------------------------------------
  // Node<T>
  // ----------------------------------------------------------------
  public send(msg: T): boolean {
    return this.#alive && this.#transport !== undefined ? this.#transport.send(msg) : false
  }
  public listen(fn: (msg: T) => void): Unsub {
    if (!this.#alive) return noop
    this.#sinks.add(fn)
    for (const msg of this.#held.splice(0)) fn(msg)
    return () => void this.#sinks.delete(fn)
  }
  public closed(fn: () => void): Unsub {
    if (!this.#alive) return (fn(), noop)
    this.#gone.add(fn)
    return () => void this.#gone.delete(fn)
  }
  public close(): void {
    if (!this.#alive) return
    if (this.#transport?.close) {
      try {
        this.#transport.close()
      } catch (err) {
        this.#report(err)
      }
    }
    this.#shut()
  }
  // ----------------------------------------------------------------
  // Deliver
  // ----------------------------------------------------------------
  #deliver(msg: T): void {
    if (!this.#alive) return
    if (this.#sinks.size > 0) {
      for (const fn of [...this.#sinks]) fn(msg)
      return
    }
    if (this.#pending <= 0) return void this.#options.onDrop?.(msg)
    while (this.#held.length >= this.#pending) this.#options.onDrop?.(this.#held.shift() as T)
    this.#held.push(msg)
  }
  // ----------------------------------------------------------------
  // Shut
  // ----------------------------------------------------------------
  #shut(): void {
    if (!this.#alive) return
    this.#alive = false
    this.#release()
    for (const fn of [...this.#gone]) fn()
    this.#gone.clear()
    this.#sinks.clear()
    this.#held.length = 0
  }
  #release(): void {
    // Nothing to release until open has handed the transport back, and the
    // constructor releases again once it has.
    if (this.#released || this.#transport === undefined) return
    this.#released = true
    if (!this.#transport.release) return
    try {
      this.#transport.release()
    } catch (err) {
      this.#report(err)
    }
  }
  // ----------------------------------------------------------------
  // Faults
  // ----------------------------------------------------------------
  #report(err: unknown): void {
    if (this.#options.onError) return this.#options.onError(err)
    queueMicrotask(() => {
      throw err
    })
  }
}
