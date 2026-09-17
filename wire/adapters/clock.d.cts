/** Injected time, so backoff and heartbeats are testable without fake globals */
export interface Clock {
    now(): number;
    /** Arms a timer. The returned function cancels it. */
    timer(fn: () => void, ms: number): () => void;
}
/** Real time, over Date.now and setTimeout */
export declare class SystemClock implements Clock {
    now(): number;
    timer(fn: () => void, ms: number): () => void;
}
/** The shared SystemClock, used by anything given no clock of its own */
export declare const systemClock: Clock;
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
export declare class FakeClock implements Clock {
    #private;
    constructor(start?: number);
    now(): number;
    timer(fn: () => void, ms: number): () => void;
    /** Moves time forward, firing everything that comes due on the way */
    advance(ms: number): void;
    /** Timers still armed */
    get pending(): number;
}
