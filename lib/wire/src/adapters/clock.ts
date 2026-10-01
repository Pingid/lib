// ------------------------------------------------------------------
// Clock
// ------------------------------------------------------------------

/** Injected time, so backoff and heartbeats are testable without fake globals */
export interface Clock {
  now(): number
  /** Arms a timer. The returned function cancels it. */
  timer(fn: () => void, ms: number): () => void
}

// ------------------------------------------------------------------
// SystemClock
// ------------------------------------------------------------------

/** Real time, over Date.now and setTimeout */
export class SystemClock implements Clock {
  public now(): number {
    return Date.now()
  }
  public timer(fn: () => void, ms: number): () => void {
    const id = setTimeout(fn, ms)
    return () => clearTimeout(id)
  }
}

/** The shared SystemClock, used by anything given no clock of its own */
export const systemClock: Clock = new SystemClock()

// ------------------------------------------------------------------
// FakeTimer
// ------------------------------------------------------------------

interface FakeTimer {
  readonly at: number
  readonly seq: number
  readonly fn: () => void
}

// ------------------------------------------------------------------
// FakeClock
// ------------------------------------------------------------------

/**
 * Time that only moves when told. Timers fire in due order, ties in arming order.
 *
 * @example
 * ```ts
 * const clock = new FakeClock()
 * let fired = false
 * clock.timer(() => (fired = true), 500)
 * clock.advance(499) // fired === false
 * clock.advance(1) //   fired === true
 * ```
 */
export class FakeClock implements Clock {
  readonly #timers: FakeTimer[]
  #now: number
  #seq: number
  constructor(start = 0) {
    this.#timers = []
    this.#now = start
    this.#seq = 0
  }
  public now(): number {
    return this.#now
  }
  public timer(fn: () => void, ms: number): () => void {
    const timer: FakeTimer = { at: this.#now + Math.max(0, ms), seq: ++this.#seq, fn }
    this.#timers.push(timer)
    return () => {
      const index = this.#timers.indexOf(timer)
      if (index >= 0) this.#timers.splice(index, 1)
    }
  }
  /** Moves time forward, firing everything that comes due on the way */
  public advance(ms: number): void {
    const until = this.#now + Math.max(0, ms)
    for (;;) {
      const next = this.#due(until)
      if (!next) break
      this.#timers.splice(this.#timers.indexOf(next), 1)
      this.#now = Math.max(this.#now, next.at)
      next.fn()
    }
    this.#now = until
  }
  /** Timers still armed */
  public get pending(): number {
    return this.#timers.length
  }
  #due(until: number): FakeTimer | null {
    let next: FakeTimer | null = null
    for (const timer of this.#timers) {
      if (timer.at > until) continue
      if (!next || timer.at < next.at || (timer.at === next.at && timer.seq < next.seq)) next = timer
    }
    return next
  }
}
