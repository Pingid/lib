import { Node, Unsub } from './node.cjs';
/** The inbound half of a transport, handed to open before there is a node */
export interface TransportHost<T> {
    /** False once shut has run */
    readonly alive: boolean;
    /** Hands an inbound message on, holding it while nobody is listening */
    deliver(msg: T): void;
    /** Terminal and idempotent, whoever calls it. Runs release, then fires closed. */
    shut(): void;
    /** A fault the node survives: an unclonable payload, a frame that would not parse. */
    fail(err: unknown): void;
}
/** The outbound half, returned by open so release closes over what it attached */
export interface Transport<T> {
    /** Never throws. False when the message was dropped. */
    send(msg: T): boolean;
    /** The consumer called close(). Say goodbye here if the protocol has one. */
    close?(): void;
    /** Runs once, on the first shut, whatever caused it. Detach here. */
    release?(): void;
}
export interface TransportOptions<T> {
    /** Inbound held before the first listen. 0 disables. Default 64. */
    pending?: number | undefined;
    onError?: ((err: unknown) => void) | undefined;
    onDrop?: ((msg: T) => void) | undefined;
}
/**
 * The bookkeeping every adapter repeats: hold inbound until someone listens, fire closed
 * once, go inert afterwards. `open` runs inside this constructor and may shut synchronously,
 * so a transport handed over already dead yields a node whose `closed` fires on subscribe.
 *
 * @example
 * ```ts
 * const node = new TransportNode<Frame>((host) => {
 *   const on = (event: MessageEvent) => host.deliver(event.data as Frame)
 *   port.addEventListener('message', on)
 *   port.start()
 *   return {
 *     send: (msg) => (port.postMessage(msg), true),
 *     close: () => port.close(),
 *     release: () => port.removeEventListener('message', on),
 *   }
 * })
 * hub.add(node, { name: 'worker' })
 * ```
 */
export declare class TransportNode<T> implements Node<T> {
    #private;
    constructor(open: (host: TransportHost<T>) => Transport<T>, options?: TransportOptions<T>);
    send(msg: T): boolean;
    listen(fn: (msg: T) => void): Unsub;
    closed(fn: () => void): Unsub;
    close(): void;
}
