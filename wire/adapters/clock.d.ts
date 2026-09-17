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
    now(): number;
    timer(fn: () => void, ms: number): () => void;
}
/**
 * @example
 * ```ts
 * reconnect(connect, { clock: systemClock })
 * ```
 */
export declare const systemClock: Clock;
/**
 * @example
 * ```ts
 * const clock = fakeClock()
 * const node = reconnect(connect, { clock, backoff: { base: 100 } })
 * clock.advance(100) // first retry, now
 * ```
 */
export interface FakeClock extends Clock {
    advance(ms: number): void;
    readonly pending: number;
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
export declare const fakeClock: (start?: number) => FakeClock;
