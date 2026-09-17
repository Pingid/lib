import { Node } from '../core.js';
import { DefineOptions } from './define.js';
/**
 * Anything with `postMessage` and `message` events: a `Worker`, a `MessagePort`,
 * a `BroadcastChannel`, a worker's own global.
 *
 * @example
 * ```ts
 * hub.add(fromPostMessage<Frame>(new Worker('./worker.js')), { name: 'worker' })
 * ```
 */
/**
 * Structural, not `lib.dom`: a stub in a test satisfies it too.
 *
 * @example
 * ```ts
 * const fake: PostTarget = {
 *   postMessage: (msg) => sink.push(msg),
 *   addEventListener: (_type, fn) => listeners.add(fn),
 *   removeEventListener: (_type, fn) => listeners.delete(fn),
 * }
 * ```
 */
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
/**
 * @example
 * ```ts
 * fromPostMessage<Frame>(port, { own: false }) // a port someone else hands you
 * ```
 */
export interface PostMessageOptions<T> extends DefineOptions<T> {
    /**
     * Terminate or close the target when the node ends. Defaults to true when the
     * target has `terminate`, since you only hold that handle to one you created.
     *
     * @example
     * ```ts
     * fromPostMessage<Frame>(self as unknown as PostTarget, { own: false }) // never close yourself
     * ```
     */
    own?: boolean | undefined;
}
/**
 * A failed clone is a bad payload, not a dead port, so it is reported rather than fatal.
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
export declare const fromPostMessage: <T>(target: PostTarget, opts?: PostMessageOptions<T>) => Node<T>;
