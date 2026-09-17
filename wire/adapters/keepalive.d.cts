import { Node } from '../core.cjs';
import { Clock } from './clock.cjs';
/**
 * Liveness for transports that cannot report it — a `MessagePort` whose far
 * side was terminated looks perfectly healthy.
 *
 * @example
 * ```ts
 * const node = keepalive(fromPostMessage<Frame>(port), {
 *   beat: (kind) => ({ t: kind }),
 *   read: (msg) => (msg.t === 'ping' || msg.t === 'pong' ? msg.t : null),
 * })
 * ```
 */
/**
 * Beats are yours, so the protocol above never sees them.
 *
 * @example
 * ```ts
 * keepalive(node, {
 *   beat: (kind) => ({ t: kind }),
 *   read: (msg) => (msg.t === 'ping' || msg.t === 'pong' ? msg.t : null),
 *   interval: 5_000,
 *   timeout: 2_000,
 * })
 * ```
 */
export interface KeepaliveOptions<T> {
    beat(kind: 'ping' | 'pong'): T;
    /**
     * Null when the message is not a beat, and so belongs to whoever is listening.
     *
     * @example
     * ```ts
     * read: (msg) => (msg.t === 'ping' || msg.t === 'pong' ? msg.t : null)
     * ```
     */
    read(msg: T): 'ping' | 'pong' | null;
    /**
     * ms between pings. Default 5000.
     *
     * @example
     * ```ts
     * keepalive(node, { beat, read, interval: 30_000 }) // a quiet link
     * ```
     */
    interval?: number | undefined;
    /**
     * ms to wait for any answer before declaring the peer gone. 0 keeps pinging. Default 2000.
     *
     * @example
     * ```ts
     * keepalive(node, { beat, read, timeout: 0 }) // ping, but never hang up
     * ```
     */
    timeout?: number | undefined;
    clock?: Clock | undefined;
}
/**
 * Symmetric: both ends ping, both answer, and any inbound message counts as a sign of life.
 *
 * @example
 * ```ts
 * const clock = fakeClock()
 * const node = keepalive(inner, { beat, read, interval: 1_000, timeout: 500, clock })
 *
 * clock.advance(1_000) // ping sent
 * clock.advance(500) //   nothing came back, so `node` closes
 * ```
 */
export declare const keepalive: <T>(node: Node<T>, opts: KeepaliveOptions<T>) => Node<T>;
