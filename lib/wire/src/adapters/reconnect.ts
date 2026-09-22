/*--------------------------------------------------------------------------

@pingid/lib-wire/adapters

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
import { TransportNode, type TransportHost } from '../node/transport.ts'
import { systemClock, type Clock } from './clock.ts'

// ------------------------------------------------------------------
// Connector
// ------------------------------------------------------------------
/** Produces a fresh node. Called again on every attempt. */
export type Connector<T> = () => Node<T>

// ------------------------------------------------------------------
// ReconnectState
// ------------------------------------------------------------------
export type ReconnectState = 'connecting' | 'open' | 'retrying' | 'closed'

// ------------------------------------------------------------------
// ReconnectOptions
// ------------------------------------------------------------------
export interface ReconnectOptions<T> {
  backoff?: { base?: number; max?: number } | undefined
  /** 0..1 randomisation of each wait, applied symmetrically around it */
  jitter?: number | undefined
  /**
   * ms a fresh node has to say anything before the attempt is abandoned. 0 disables.
   * This is why a protocol greets: silence is otherwise indistinguishable from death.
   */
  timeout?: number | undefined
  /** Consecutive failures before giving up for good. 0 is forever. */
  maxAttempts?: number | undefined
  /** Outbound held while down. Overflow is refused at the call site. 0 never buffers. */
  buffer?: number | undefined
  pending?: number | undefined
  clock?: Clock | undefined
  onState?: ((state: ReconnectState) => void) | undefined
  onError?: ((err: unknown) => void) | undefined
  onDrop?: ((msg: T) => void) | undefined
}

// ------------------------------------------------------------------
// ReconnectNode
// ------------------------------------------------------------------
/**
 * A node that outlives its transport. An attempt counts as successful once the transport
 * delivers its first message, so the far end's greeting is what tells this it worked.
 *
 * @example
 * ```ts
 * const clock = new FakeClock()
 * const node = new ReconnectNode<Frame>(connect, { clock, backoff: { base: 100 }, buffer: 8 })
 *
 * node.send(frame) // held while down
 * clock.advance(100) // retry
 * hub.add(node, { name: 'server' })
 * ```
 */
export class ReconnectNode<T> implements Node<T> {
  readonly #connect: Connector<T>
  readonly #options: ReconnectOptions<T>
  readonly #clock: Clock
  readonly #base: number
  readonly #max: number
  readonly #jitter: number
  readonly #timeout: number
  readonly #limit: number
  readonly #capacity: number
  readonly #held: T[]
  readonly #node: Node<T>
  #host: TransportHost<T> | null
  #inner: Node<T> | null
  #state: ReconnectState
  #attempts: number
  #epoch: number
  #wait: Unsub | null
  #detach: Unsub | null
  constructor(connect: Connector<T>, options: ReconnectOptions<T> = {}) {
    const { base = 250, max = 30_000 } = options.backoff ?? {}
    this.#connect = connect
    this.#options = options
    this.#clock = options.clock ?? systemClock
    this.#base = base
    this.#max = max
    this.#jitter = Math.min(Math.max(options.jitter ?? 0, 0), 1)
    this.#timeout = options.timeout ?? 10_000
    this.#limit = options.maxAttempts ?? 0
    this.#capacity = options.buffer ?? 64
    this.#held = []
    this.#host = null
    this.#inner = null
    this.#state = 'connecting'
    this.#attempts = 0
    this.#epoch = 0
    this.#wait = null
    this.#detach = null
    this.#node = new TransportNode<T>(
      (host) => {
        this.#host = host
        // The first attempt runs here rather than before the node exists, so a
        // connector that throws has somewhere to report it.
        this.#attempt()
        return { send: (msg) => this.#write(msg), close: () => this.#shutdown() }
      },
      { pending: options.pending, onError: options.onError, onDrop: options.onDrop },
    )
  }
  // ----------------------------------------------------------------
  // Node<T>
  // ----------------------------------------------------------------
  public send(msg: T): boolean {
    return this.#node.send(msg)
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
  // ----------------------------------------------------------------
  // Properties
  // ----------------------------------------------------------------
  public get state(): ReconnectState {
    return this.#state
  }
  /** Consecutive failures since the last success */
  public get attempts(): number {
    return this.#attempts
  }
  // ----------------------------------------------------------------
  // RetryNow
  // ----------------------------------------------------------------
  /** Abandons the wait and tries now, resetting backoff */
  public retryNow(): void {
    if (this.#state === 'closed' || this.#state === 'open') return
    this.#wait?.()
    this.#wait = null
    this.#detach?.()
    this.#detach = null
    this.#inner?.close()
    this.#inner = null
    this.#attempts = 0
    this.#attempt()
  }
  // ----------------------------------------------------------------
  // Write
  // ----------------------------------------------------------------
  #write(msg: T): boolean {
    if (this.#state === 'closed') return false
    if (this.#state === 'open' && this.#inner) return this.#inner.send(msg)
    if (this.#capacity <= 0 || this.#held.length >= this.#capacity) {
      this.#options.onDrop?.(msg)
      return false
    }
    this.#held.push(msg)
    return true
  }
  #flush(): void {
    const live = this.#inner
    if (!live) return
    for (const msg of this.#held.splice(0)) live.send(msg)
  }
  // ----------------------------------------------------------------
  // Attempt
  // ----------------------------------------------------------------
  #attempt(): void {
    if (this.#state === 'closed') return
    this.#wait?.()
    this.#wait = null

    const token = ++this.#epoch
    let node: Node<T>
    try {
      node = this.#connect()
    } catch (err) {
      this.#report(err)
      return this.#schedule()
    }

    this.#inner = node
    this.#setState('connecting')

    let expiry: Unsub | null = null
    const stops: Unsub[] = []
    const stop = () => {
      for (const off of stops.splice(0)) off()
      expiry?.()
      expiry = null
    }

    const dropped = () => {
      if (token !== this.#epoch) return
      this.#epoch += 1
      stop()
      this.#inner = null
      this.#schedule()
    }

    stops.push(
      node.listen((msg) => {
        if (token !== this.#epoch) return
        if (this.#state !== 'open') {
          expiry?.()
          expiry = null
          this.#attempts = 0
          this.#setState('open')
          this.#flush()
        }
        this.#host?.deliver(msg)
      }),
    )
    // Fires synchronously when the connector handed back a dead node.
    stops.push(node.closed(dropped))

    if (this.#timeout > 0) {
      expiry = this.#clock.timer(() => {
        if (token !== this.#epoch || this.#state === 'open') return
        this.#epoch += 1
        stop()
        const dead = this.#inner
        this.#inner = null
        dead?.close()
        this.#report(new Error(`nothing heard within ${this.#timeout}ms`))
        this.#schedule()
      }, this.#timeout)
    }

    if (token !== this.#epoch) return stop()
    this.#detach = stop
  }
  // ----------------------------------------------------------------
  // Schedule
  // ----------------------------------------------------------------
  #schedule(): void {
    if (this.#state === 'closed') return
    this.#attempts += 1
    if (this.#limit > 0 && this.#attempts >= this.#limit) {
      this.#report(new Error(`giving up after ${this.#attempts} attempts`))
      return this.#shutdown()
    }
    this.#setState('retrying')
    const delay = Math.min(this.#base * 2 ** (this.#attempts - 1), this.#max)
    const spread = delay * this.#jitter
    this.#wait = this.#clock.timer(() => this.#attempt(), Math.max(0, delay - spread + Math.random() * spread * 2))
  }
  // ----------------------------------------------------------------
  // Shutdown
  // ----------------------------------------------------------------
  #shutdown(): void {
    if (this.#state === 'closed') return
    this.#epoch += 1
    this.#wait?.()
    this.#wait = null
    this.#detach?.()
    this.#detach = null
    this.#inner?.close()
    this.#inner = null
    this.#held.length = 0
    this.#setState('closed')
    this.#host?.shut()
  }
  // ----------------------------------------------------------------
  // State
  // ----------------------------------------------------------------
  #setState(next: ReconnectState): void {
    if (next === this.#state) return
    this.#state = next
    try {
      this.#options.onState?.(next)
    } catch (err) {
      this.#report(err)
    }
  }
  #report(err: unknown): void {
    if (this.#options.onError) return this.#options.onError(err)
    queueMicrotask(() => {
      throw err
    })
  }
}
