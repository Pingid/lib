/**
 * Injected time, so backoff and heartbeats are testable without fake globals.
 *
 * @example
 * ```ts
 * const cancel = clock.timer(() => console.log('late'), 1000)
 * cancel()
 * ```
 */
export interface Clock {
  now(): number
  timer(fn: () => void, ms: number): () => void
}

/**
 * @example
 * ```ts
 * reconnect(connect, { clock: systemClock })
 * ```
 */
export const systemClock: Clock = {
  now: () => Date.now(),
  timer: (fn, ms) => {
    const id = setTimeout(fn, ms)
    return () => clearTimeout(id)
  },
}

/**
 * @example
 * ```ts
 * const clock = fakeClock()
 * const node = reconnect(connect, { clock, backoff: { base: 100 } })
 * clock.advance(100) // first retry, now
 * ```
 */
export interface FakeClock extends Clock {
  advance(ms: number): void
  readonly pending: number
}

/**
 * Time that only moves when told. Timers fire in due order, ties in arming order.
 *
 * @example
 * ```ts
 * const clock = fakeClock()
 * let fired = false
 * clock.timer(() => (fired = true), 500)
 * clock.advance(499) // fired === false
 * clock.advance(1) //   fired === true
 * ```
 */
export const fakeClock = (start = 0): FakeClock => {
  type Timer = { at: number; seq: number; fn: () => void }
  const timers: Timer[] = []
  let now = start
  let seq = 0

  return {
    now: () => now,
    timer(fn, ms) {
      const timer: Timer = { at: now + Math.max(0, ms), seq: ++seq, fn }
      timers.push(timer)
      return () => {
        const i = timers.indexOf(timer)
        if (i >= 0) timers.splice(i, 1)
      }
    },
    advance(ms) {
      const until = now + Math.max(0, ms)
      for (;;) {
        let next: Timer | null = null
        for (const timer of timers) {
          if (timer.at > until) continue
          if (!next || timer.at < next.at || (timer.at === next.at && timer.seq < next.seq)) next = timer
        }
        if (!next) break
        timers.splice(timers.indexOf(next), 1)
        now = Math.max(now, next.at)
        next.fn()
      }
      now = until
    },
    get pending() {
      return timers.length
    },
  }
}
