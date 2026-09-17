import { Node } from '../core.cjs';
/**
 * The bookkeeping every adapter repeats: hold inbound until someone listens,
 * fire `closed` once, go inert afterwards.
 *
 * @example
 * ```ts
 * const node = defineNode<string>((host) => {
 *   const on = (e: MessageEvent) => host.deliver(e.data)
 *   socket.addEventListener('message', on)
 *   socket.addEventListener('close', host.shut)
 *   return {
 *     send: (msg) => (socket.send(msg), true),
 *     close: () => socket.close(),
 *     release: () => socket.removeEventListener('message', on),
 *   }
 * })
 * ```
 */
/**
 * The inbound half, handed to `open` before there is a node.
 *
 * @example
 * ```ts
 * defineNode<Frame>((host) => {
 *   worker.on('message', (msg) => host.deliver(msg))
 *   worker.on('error', (err) => host.fail(err))
 *   worker.on('exit', () => host.shut())
 *   return { send: (msg) => (worker.postMessage(msg), true) }
 * })
 * ```
 */
export interface Host<T> {
    /**
     * False once `shut` has run.
     *
     * @example
     * ```ts
     * socket.on('data', (line) => host.alive && host.deliver(parse(line)))
     * ```
     */
    readonly alive: boolean;
    deliver(msg: T): void;
    /**
     * Terminal and idempotent, whoever calls it. Runs `release`, then fires `closed`.
     *
     * @example
     * ```ts
     * socket.on('close', () => host.shut())
     * ```
     */
    shut(): void;
    /**
     * A fault the node survives: an unclonable payload, a frame that would not parse.
     *
     * @example
     * ```ts
     * try { host.deliver(JSON.parse(line)) } catch (err) { host.fail(err) }
     * ```
     */
    fail(err: unknown): void;
}
/**
 * The outbound half, returned by `open` so `release` closes over what it attached.
 *
 * @example
 * ```ts
 * return {
 *   send: (msg) => (port.postMessage(msg), true),
 *   close: () => port.close(),
 *   release: () => port.removeEventListener('message', on),
 * }
 * ```
 */
export interface Transport<T> {
    send(msg: T): boolean;
    /**
     * The consumer called `close()`. Say goodbye here if the protocol has one.
     *
     * @example
     * ```ts
     * close: () => (socket.send('bye'), socket.close())
     * ```
     */
    close?(): void;
    /**
     * Runs once, on the first `shut`, whatever caused it. Detach here.
     *
     * @example
     * ```ts
     * release: () => target.removeEventListener('message', on)
     * ```
     */
    release?(): void;
}
/**
 * @example
 * ```ts
 * defineNode(open, { pending: 0, onDrop: (msg) => console.warn('lost', msg) })
 * ```
 */
export interface DefineOptions<T> {
    /**
     * Inbound held before the first `listen`. 0 disables. Default 64.
     *
     * @example
     * ```ts
     * defineNode(open, { pending: 0 }) // a feed where only the latest matters
     * ```
     */
    pending?: number | undefined;
    onError?: ((err: unknown) => void) | undefined;
    onDrop?: ((msg: T) => void) | undefined;
}
/**
 * `open` runs before this returns and may `shut` synchronously, so a transport
 * handed over already dead yields a node whose `closed` fires on subscribe.
 *
 * @example
 * ```ts
 * const node = defineNode<Frame>((host) => {
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
export declare const defineNode: <T>(open: (host: Host<T>) => Transport<T>, opts?: DefineOptions<T>) => Node<T>;
