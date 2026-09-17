import { Node } from '../node/node.cjs';
import { Clock } from './clock.cjs';
/** Beats are yours, so the protocol above never sees them */
export interface KeepaliveOptions<T> {
    /** Writes a beat as a message of your own */
    beat(kind: 'ping' | 'pong'): T;
    /** Null when the message is not a beat, and so belongs to whoever is listening */
    read(msg: T): 'ping' | 'pong' | null;
    /** ms between pings. Default 5000. */
    interval?: number | undefined;
    /** ms to wait for any answer before declaring the peer gone. 0 keeps pinging. Default 2000. */
    timeout?: number | undefined;
    clock?: Clock | undefined;
}
/**
 * Liveness for transports that cannot report it — a MessagePort whose far side was
 * terminated looks perfectly healthy. Symmetric: both ends ping, both answer, and any
 * inbound message counts as a sign of life.
 *
 * @example
 * ```ts
 * const clock = new FakeClock()
 * const node = keepalive(inner, { beat, read, interval: 1_000, timeout: 500, clock })
 *
 * clock.advance(1_000) // ping sent
 * clock.advance(500) //   nothing came back, so node closes
 * ```
 */
export declare function keepalive<T>(node: Node<T>, options: KeepaliveOptions<T>): Node<T>;
