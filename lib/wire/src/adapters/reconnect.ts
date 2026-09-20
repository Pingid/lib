import type { Node, Unsub } from '../core.ts'
import { systemClock, type Clock } from './clock.ts'
import { defineNode, type Host } from './define.ts'

/**
 * A node that outlives its transport.
 *
 * @example
 * ```ts
 * const node = reconnect<Frame>(() => fromWebSocket(new WebSocket(url)), { buffer: 32 })
 * hub.add(node, { name: 'server' })
 * ```
 */

/**
 * Produces a fresh node. Called again on every attempt.
 *
 * @example
 * ```ts
 * const connect: Connector<Frame> = () => fromWebSocket(new WebSocket(url))
 * ```
 */
export type Connector<T> = () => Node<T>

/**
 * @example
 * ```ts
 * reconnect(connect, { onState: (state) => console.log(state) }) // 'connecting' | 'open' | ...
 * ```
 */
export type State = 'connecting' | 'open' | 'retrying' | 'closed'

/**
 * @example
 * ```ts
 * reconnect(connect, {
 *   backoff: { base: 250, max: 30_000 },
 *   jitter: 0.2,
 *   timeout: 10_000,
 *   buffer: 64,
 * })
 * ```
 */
export interface ReconnectOptions<T> {
  backoff?: { base?: number; max?: number } | undefined
  /**
   * 0..1 randomisation of each wait, applied symmetrically around it.
   *
   * @example
   * ```ts
   * reconnect(connect, { jitter: 0.2 }) // a thousand tabs do not retry in lockstep
   * ```
   */
  jitter?: number | undefined
  /**
   * ms a fresh node has to say anything before the attempt is abandoned. 0 disables.
   * This is why a protocol greets: silence is otherwise indistinguishable from death.
   *
   * @example
   * ```ts
   * reconnect(connect, { timeout: 0 }) // the transport reports death on its own
   * ```
   */
  timeout?: number | undefined
  /**
   * Consecutive failures before giving up for good. 0 is forever.
   *
   * @example
   * ```ts
   * reconnect(connect, { maxAttempts: 5 }) // then `closed` fires and nothing recovers
   * ```
   */
  maxAttempts?: number | undefined
  /**
   * Outbound held while down. Overflow is refused at the call site. 0 never buffers.
   *
   * @example
   * ```ts
   * if (!node.send(msg)) console.warn('buffer full, not sent')
   * ```
   */
  buffer?: number | undefined
  pending?: number | undefined
  clock?: Clock | undefined
  onState?: ((state: State) => void) | undefined
  onError?: ((err: unknown) => void) | undefined
  onDrop?: ((msg: T) => void) | undefined
}

/**
 * @example
 * ```ts
 * if (node.state === 'retrying') node.retryNow() // the user pressed "reconnect"
 * ```
 */
export interface Reconnect<T> extends Node<T> {
  readonly state: State
  /**
   * Consecutive failures since the last success.
   *
   * @example
   * ```ts
   * if (node.attempts > 3) show('having trouble reaching the server')
   * ```
   */
  readonly attempts: number
  /**
   * Abandon the wait and try now, resetting backoff.
   *
   * @example
   * ```ts
   * addEventListener('online', () => node.retryNow())
   * ```
   */
  retryNow(): void
}

/**
 * An attempt counts as successful once the transport delivers its first message,
 * so the far end's greeting is what tells this it worked.
 *
 * @example
 * ```ts
 * const clock = fakeClock()
 * const node = reconnect<Frame>(connect, { clock, backoff: { base: 100 }, buffer: 8 })
 *
 * node.send(frame) // held while down
 * clock.advance(100) // retry
 * ```
 */
export const reconnect = <T>(connect: Connector<T>, opts: ReconnectOptions<T> = {}): Reconnect<T> => {
  const { base = 250, max = 30_000 } = opts.backoff ?? {}
  const clock = opts.clock ?? systemClock
  const jitter = Math.min(Math.max(opts.jitter ?? 0, 0), 1)
  const timeout = opts.timeout ?? 10_000
  const limit = opts.maxAttempts ?? 0
  const cap = opts.buffer ?? 64

  const held: T[] = []
  let inner: Node<T> | null = null
  let state: State = 'connecting'
  let fails = 0
  let epoch = 0
  let wait: Unsub | null = null
  let detach: Unsub | null = null
  let host!: Host<T>

  const report = (err: unknown) => {
    if (opts.onError) return opts.onError(err)
    queueMicrotask(() => {
      throw err
    })
  }

  const setState = (next: State) => {
    if (next === state) return
    state = next
    try {
      opts.onState?.(next)
    } catch (err) {
      report(err)
    }
  }

  const flush = () => {
    const live = inner
    if (!live) return
    for (const msg of held.splice(0)) live.send(msg)
  }

  const schedule = () => {
    if (state === 'closed') return
    fails += 1
    if (limit > 0 && fails >= limit) {
      report(new Error(`giving up after ${fails} attempts`))
      return close()
    }
    setState('retrying')
    const delay = Math.min(base * 2 ** (fails - 1), max)
    const spread = delay * jitter
    wait = clock.timer(attempt, Math.max(0, delay - spread + Math.random() * spread * 2))
  }

  function attempt() {
    if (state === 'closed') return
    wait?.()
    wait = null

    const token = ++epoch
    let node: Node<T>
    try {
      node = connect()
    } catch (err) {
      report(err)
      return schedule()
    }

    inner = node
    setState('connecting')

    let expiry: Unsub | null = null
    const stops: Unsub[] = []
    const stop = () => {
      for (const off of stops.splice(0)) off()
      expiry?.()
      expiry = null
    }

    const dropped = () => {
      if (token !== epoch) return
      epoch += 1
      stop()
      inner = null
      schedule()
    }

    stops.push(
      node.listen((msg) => {
        if (token !== epoch) return
        if (state !== 'open') {
          expiry?.()
          expiry = null
          fails = 0
          setState('open')
          flush()
        }
        host.deliver(msg)
      }),
    )
    // Fires synchronously when the connector handed back a dead node.
    stops.push(node.closed(dropped))

    if (timeout > 0) {
      expiry = clock.timer(() => {
        if (token !== epoch || state === 'open') return
        epoch += 1
        stop()
        const dead = inner
        inner = null
        dead?.close()
        report(new Error(`nothing heard within ${timeout}ms`))
        schedule()
      }, timeout)
    }

    if (token !== epoch) return stop()
    detach = stop
  }

  function close() {
    if (state === 'closed') return
    epoch += 1
    wait?.()
    wait = null
    detach?.()
    detach = null
    inner?.close()
    inner = null
    held.length = 0
    setState('closed')
    host.shut()
  }

  const node = defineNode<T>(
    (h) => {
      host = h
      // The first attempt runs here rather than before the node exists, so a
      // connector that throws has somewhere to report it.
      attempt()
      return {
        send: (msg) => {
          if (state === 'closed') return false
          if (state === 'open' && inner) return inner.send(msg)
          if (cap <= 0 || held.length >= cap) {
            opts.onDrop?.(msg)
            return false
          }
          held.push(msg)
          return true
        },
        close,
      }
    },
    { pending: opts.pending, onError: opts.onError, onDrop: opts.onDrop },
  )

  return {
    send: (msg) => node.send(msg),
    listen: (fn) => node.listen(fn),
    closed: (fn) => node.closed(fn),
    close: () => node.close(),
    get state() {
      return state
    },
    get attempts() {
      return fails
    },
    retryNow() {
      if (state === 'closed' || state === 'open') return
      wait?.()
      wait = null
      detach?.()
      detach = null
      inner?.close()
      inner = null
      fails = 0
      attempt()
    },
  }
}
