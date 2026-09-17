import { Meta, Node, Unsub } from '../core.cjs';
/**
 * Peers that arrive over time, and who closes them.
 *
 * @example
 * ```ts
 * const stop = listening(server)(hub)
 * stop() // stops accepting, and closes everyone it accepted
 * ```
 */
/**
 * The part of a hub a source needs. `Hub` satisfies it.
 *
 * @example
 * ```ts
 * const into: Adder<Frame> = hub
 * ```
 */
export interface Adder<T> {
    add(node: Node<T>, meta?: Meta): Unsub;
}
export declare const adders: <T>(...adders: Adder<T>[]) => Adder<T>;
/**
 * Something that feeds a hub until you stop it.
 *
 * @example
 * ```ts
 * const workers = (count: number): Source<Frame> => (into) => {
 *   const offs = Array.from({ length: count }, () => into.add(fromWorker(new Worker(url))))
 *   return () => offs.forEach((off) => off())
 * }
 * hub.add !== undefined && workers(3)(hub)
 * ```
 */
export type Source<T> = (into: Adder<T>) => Unsub;
/**
 * The half handed to `source`'s `open`.
 *
 * @example
 * ```ts
 * source<Frame>((host) => {
 *   server.on('connection', (socket) => host.offer(fromSocket(socket), { name: socket.id }))
 *   return () => server.close()
 * })
 * ```
 */
export interface SourceHost<T> {
    /**
     * Closed rather than added once the source has stopped, so nothing is orphaned.
     *
     * @example
     * ```ts
     * host.offer(fromSocket(socket), { name: socket.remoteAddress })
     * ```
     */
    offer(node: Node<T>, meta?: Meta): void;
    fail(err: unknown): void;
    /**
     * Aborts when the source stops. Hand it to anything that takes one.
     *
     * @example
     * ```ts
     * server.on('connection', on, { signal: host.signal })
     * ```
     */
    readonly signal: AbortSignal;
}
/**
 * @example
 * ```ts
 * source(open, { onError: (err) => console.error(err) })
 * ```
 */
export interface SourceOptions {
    onError?: ((err: unknown) => void) | undefined;
}
/**
 * Owns what it produced: the teardown stops accepting, then closes every node it offered.
 *
 * @example
 * ```ts
 * const spawned: Source<Frame> = source((host) => {
 *   const worker = new Worker(url)
 *   host.offer(fromWorker(worker), { name: 'worker' })
 *   host.signal.addEventListener('abort', () => worker.terminate())
 * })
 *
 * const stop = spawned(hub)
 * stop()
 * ```
 */
export declare const source: <T>(open: (host: SourceHost<T>) => Unsub | void, opts?: SourceOptions) => Source<T>;
