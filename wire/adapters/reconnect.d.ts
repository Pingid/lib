import { Node, Unsub } from '../node/node.js';
import { Clock } from './clock.js';
/** Produces a fresh node. Called again on every attempt. */
export type Connector<T> = () => Node<T>;
export type ReconnectState = 'connecting' | 'open' | 'retrying' | 'closed';
export interface ReconnectOptions<T> {
    backoff?: {
        base?: number;
        max?: number;
    } | undefined;
    /** 0..1 randomisation of each wait, applied symmetrically around it */
    jitter?: number | undefined;
    /**
     * ms a fresh node has to say anything before the attempt is abandoned. 0 disables.
     * This is why a protocol greets: silence is otherwise indistinguishable from death.
     */
    timeout?: number | undefined;
    /** Consecutive failures before giving up for good. 0 is forever. */
    maxAttempts?: number | undefined;
    /** Outbound held while down. Overflow is refused at the call site. 0 never buffers. */
    buffer?: number | undefined;
    pending?: number | undefined;
    clock?: Clock | undefined;
    onState?: ((state: ReconnectState) => void) | undefined;
    onError?: ((err: unknown) => void) | undefined;
    onDrop?: ((msg: T) => void) | undefined;
}
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
export declare class ReconnectNode<T> implements Node<T> {
    #private;
    constructor(connect: Connector<T>, options?: ReconnectOptions<T>);
    send(msg: T): boolean;
    listen(fn: (msg: T) => void): Unsub;
    closed(fn: () => void): Unsub;
    close(): void;
    get state(): ReconnectState;
    /** Consecutive failures since the last success */
    get attempts(): number;
    /** Abandons the wait and tries now, resetting backoff */
    retryNow(): void;
}
