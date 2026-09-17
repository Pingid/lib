import { Node } from '../core.js';
import { Clock } from './clock.js';
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
export type Connector<T> = () => Node<T>;
/**
 * @example
 * ```ts
 * reconnect(connect, { onState: (state) => console.log(state) }) // 'connecting' | 'open' | ...
 * ```
 */
export type State = 'connecting' | 'open' | 'retrying' | 'closed';
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
    backoff?: {
        base?: number;
        max?: number;
    } | undefined;
    /**
     * 0..1 randomisation of each wait, applied symmetrically around it.
     *
     * @example
     * ```ts
     * reconnect(connect, { jitter: 0.2 }) // a thousand tabs do not retry in lockstep
     * ```
     */
    jitter?: number | undefined;
    /**
     * ms a fresh node has to say anything before the attempt is abandoned. 0 disables.
     * This is why a protocol greets: silence is otherwise indistinguishable from death.
     *
     * @example
     * ```ts
     * reconnect(connect, { timeout: 0 }) // the transport reports death on its own
     * ```
     */
    timeout?: number | undefined;
    /**
     * Consecutive failures before giving up for good. 0 is forever.
     *
     * @example
     * ```ts
     * reconnect(connect, { maxAttempts: 5 }) // then `closed` fires and nothing recovers
     * ```
     */
    maxAttempts?: number | undefined;
    /**
     * Outbound held while down. Overflow is refused at the call site. 0 never buffers.
     *
     * @example
     * ```ts
     * if (!node.send(msg)) console.warn('buffer full, not sent')
     * ```
     */
    buffer?: number | undefined;
    pending?: number | undefined;
    clock?: Clock | undefined;
    onState?: ((state: State) => void) | undefined;
    onError?: ((err: unknown) => void) | undefined;
    onDrop?: ((msg: T) => void) | undefined;
}
/**
 * @example
 * ```ts
 * if (node.state === 'retrying') node.retryNow() // the user pressed "reconnect"
 * ```
 */
export interface Reconnect<T> extends Node<T> {
    readonly state: State;
    /**
     * Consecutive failures since the last success.
     *
     * @example
     * ```ts
     * if (node.attempts > 3) show('having trouble reaching the server')
     * ```
     */
    readonly attempts: number;
    /**
     * Abandon the wait and try now, resetting backoff.
     *
     * @example
     * ```ts
     * addEventListener('online', () => node.retryNow())
     * ```
     */
    retryNow(): void;
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
export declare const reconnect: <T>(connect: Connector<T>, opts?: ReconnectOptions<T>) => Reconnect<T>;
