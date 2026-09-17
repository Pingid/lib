import { Peer, Plugin, Unsub } from './core.js';
/**
 * Where a talker lives, learned from hearing it talk. No wire, no id scheme.
 *
 * @example
 * ```ts
 * const who = directory<Frame>({
 *   from: (msg) => (msg.t === 'pub' ? (msg.from ?? null) : ''),
 *   stamp: (msg, id) => ({ ...msg, from: id }),
 * })
 * const routes: Plugin<Frame> = () => ({
 *   data: (peer, msg, next) => (msg.to ? void who.peer(msg.to)?.send(msg) : next(msg)),
 * })
 * hub<Frame>([who, routes]) // `who` first: it stamps before `routes` reads
 * ```
 */
/**
 * Where a sender id lives on your message, and how to put one there.
 *
 * @example
 * ```ts
 * directory<Msg>({ from: (msg) => msg.from ?? null, stamp: (msg, id) => ({ ...msg, from: id }) })
 * ```
 */
export interface DirectoryOptions<T> {
    /**
     * Null for an unstamped message, which gets stamped. Any string for one to leave alone.
     *
     * @example
     * ```ts
     * from: (msg) => (msg.t === 'pub' ? (msg.from ?? null) : '') // only `pub` carries a sender
     * ```
     */
    from(msg: T): string | null;
    /**
     * @example
     * ```ts
     * stamp: (msg, id) => ({ ...msg, from: id })
     * ```
     */
    stamp(msg: T, id: string): T;
    /**
     * Default is a random tag plus a counter.
     *
     * @example
     * ```ts
     * mint: () => crypto.randomUUID()
     * ```
     */
    mint?: (() => string) | undefined;
}
/**
 * The route table, as a plugin you can also ask questions of.
 *
 * @example
 * ```ts
 * const who = directory<Msg>({ from, stamp })
 * hub<Msg>([who, routes])
 * who.peer(msg.to)?.send(msg)
 * ```
 */
export interface Directory<T> extends Plugin<T> {
    /**
     * This hub's id for a peer, minted on first use.
     *
     * @example
     * ```ts
     * peer.send({ t: 'welcome', you: who.id(peer) })
     * ```
     */
    id(peer: Peer<T>): string;
    /**
     * Who to hand something addressed to `id`, or null if never heard of.
     *
     * @example
     * ```ts
     * if (msg.to) who.peer(msg.to)?.send(msg)
     * ```
     */
    peer(id: string): Peer<T> | null;
    /**
     * @example
     * ```ts
     * who.onChange(() => console.log('routes moved'))
     * ```
     */
    onChange(fn: () => void): Unsub;
}
/**
 * Stamps unstamped messages, and remembers which peer each sender was last heard through.
 *
 * @example
 * ```ts
 * const who = directory<Msg>({
 *   from: (msg) => msg.from ?? null,
 *   stamp: (msg, id) => ({ ...msg, from: id }),
 * })
 * ```
 */
export declare const directory: <T>(opts: DirectoryOptions<T>) => Directory<T>;
