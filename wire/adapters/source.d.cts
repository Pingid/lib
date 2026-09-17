import { Adder, Meta } from '../hub/index.cjs';
import { Node, Unsub } from '../node/node.cjs';
/** Something that feeds an Adder peers until you stop it */
export type Source<T> = (into: Adder<T>) => Unsub;
/** The half handed to source's open */
export interface SourceHost<T> {
    /** Closed rather than added once the source has stopped, so nothing is orphaned */
    offer(node: Node<T>, meta?: Meta): void;
    fail(err: unknown): void;
    /** Aborts when the source stops. Hand it to anything that takes one. */
    readonly signal: AbortSignal;
}
export interface SourceOptions {
    onError?: ((err: unknown) => void) | undefined;
}
/**
 * Creates a Source that owns what it produced: the teardown stops accepting, then closes
 * every node it offered.
 *
 * @example
 * ```ts
 * const spawned = source<Frame>((host) => {
 *   const worker = new Worker(url)
 *   host.offer(fromPostMessage(worker), { name: 'worker' })
 *   host.signal.addEventListener('abort', () => worker.terminate())
 * })
 *
 * const stop = spawned(hub)
 * stop()
 * ```
 */
export declare function source<T>(open: (host: SourceHost<T>) => Unsub | void, options?: SourceOptions): Source<T>;
/** Creates an Adder that hands every node to each of the given adders */
export declare function adders<T>(...into: readonly Adder<T>[]): Adder<T>;
