import { Node } from '../node/node.js';
import { TransportOptions } from '../node/transport.js';
/** Structural, not lib.dom: a Worker, a MessagePort, a BroadcastChannel, a worker's own global, a stub in a test. */
export interface PostTarget {
    postMessage(msg: unknown): void;
    addEventListener(type: 'message', fn: (event: {
        data: unknown;
    }) => void): void;
    removeEventListener(type: 'message', fn: (event: {
        data: unknown;
    }) => void): void;
    start?(): void;
    terminate?(): void;
    close?(): void;
}
export interface PostMessageOptions<T> extends TransportOptions<T> {
    /**
     * Terminate or close the target when the node ends. Defaults to true when the target
     * has terminate, since you only hold that handle to one you created.
     */
    own?: boolean | undefined;
}
/**
 * Creates a node over anything with postMessage and message events. A failed clone is a
 * bad payload, not a dead port, so it is reported rather than fatal.
 *
 * @example
 * ```ts
 * // in the page
 * hub.add(fromPostMessage<Frame>(new Worker('./worker.js')))
 *
 * // in the worker
 * hub.add(fromPostMessage<Frame>(self as unknown as PostTarget))
 * ```
 */
export declare function fromPostMessage<T>(target: PostTarget, options?: PostMessageOptions<T>): Node<T>;
