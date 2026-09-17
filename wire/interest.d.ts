import { Peer, Plugin, Unsub } from './core.js';
/**
 * Who wants what, and keeping the neighbours told. No wire, no key type.
 *
 * @example
 * ```ts
 * const wants = interest<Frame, string>({
 *   read: (msg) => (msg.t === 'want' ? { key: msg.c, on: msg.on } : null),
 *   write: ({ key, on }) => ({ t: 'want', c: key, on }),
 * })
 * const routes: Plugin<Frame> = () => ({
 *   data: (peer, msg, next) => {
 *     if (msg.t !== 'pub') return next(msg)
 *     for (const to of wants.match(msg.c, peer)) to.send(msg)
 *   },
 * })
 * hub<Frame>([wants, routes])
 * ```
 */
/**
 * A peer taking an interest up, or dropping it.
 *
 * @example
 * ```ts
 * const decl: Declaration<string> = { key: 'tick', on: true }
 * ```
 */
export interface Declaration<K> {
    readonly key: K;
    readonly on: boolean;
}
/**
 * How declarations ride your wire, and what a key is.
 *
 * @example
 * ```ts
 * interest<Frame, readonly [string, string]>({
 *   read: (msg) => (msg.t === 'watch' ? { key: [msg.k[0], msg.k[1]], on: msg.on } : null),
 *   write: ({ key, on }) => ({ t: 'watch', k: [key[0], key[1]], on }),
 *   hash: ([collection, id]) => `${collection}/${id}`,
 * })
 * ```
 */
export interface InterestOptions<T, K> {
    /**
     * Null when the message is not a declaration.
     *
     * @example
     * ```ts
     * read: (msg) => (msg.t === 'want' ? { key: msg.c, on: msg.on } : null)
     * ```
     */
    read(msg: T): Declaration<K> | null;
    /**
     * @example
     * ```ts
     * write: ({ key, on }) => ({ t: 'want', c: key, on })
     * ```
     */
    write(decl: Declaration<K>): T;
    /**
     * Stable identity for a key. Default `String(key)`.
     *
     * @example
     * ```ts
     * hash: ([collection, id]) => `${collection}/${id}`
     * ```
     */
    hash?: ((key: K) => string) | undefined;
    /**
     * Interest keys a published key reaches. Default `[key]`. Wildcards live here.
     *
     * @example
     * ```ts
     * expand: ([collection, id]) =>
     *   id === '*' ? [[collection, '*']] : [[collection, id], [collection, '*']]
     * ```
     */
    expand?: ((key: K) => Iterable<K>) | undefined;
}
/**
 * The table, as a plugin you can also ask questions of.
 *
 * @example
 * ```ts
 * const wants = interest<Frame, string>({ read, write })
 * hub<Frame>([wants, routes])
 * wants.match('tick', sender) // who to send to
 * ```
 */
export interface Interest<T, K> extends Plugin<T> {
    /**
     * Peers wanting `key`, `from` excluded, deduplicated across expansions.
     *
     * @example
     * ```ts
     * for (const to of wants.match(msg.c, peer)) to.send(msg)
     * ```
     */
    match(key: K, from?: Peer<T>): readonly Peer<T>[];
    /**
     * Declare on a peer's behalf, for interest that never crossed a wire.
     *
     * @example
     * ```ts
     * wants.set(peer, 'audit', true) // everyone is watched whether they asked or not
     * ```
     */
    set(peer: Peer<T>, key: K, on: boolean): void;
    /**
     * Everything wanted by someone other than `except`.
     *
     * @example
     * ```ts
     * console.log('this hub is asked for', wants.wanted())
     * ```
     */
    wanted(except?: Peer<T>): readonly K[];
    /**
     * @example
     * ```ts
     * const idle = h.peers.filter((peer) => wants.of(peer).length === 0)
     * ```
     */
    of(peer: Peer<T>): readonly K[];
    /**
     * Re-send the whole set to a peer. Call it when the peer says hello again.
     *
     * @example
     * ```ts
     * data: (peer, msg, next) => (msg.t === 'hello' ? wants.announce(peer) : next(msg))
     * ```
     */
    announce(peer: Peer<T>): void;
    /**
     * A peer newly wants a key. Where replaying retained state belongs.
     *
     * @example
     * ```ts
     * wants.onWant((peer, c) => held.has(c) && peer.send({ t: 'pub', c, d: held.get(c), r: true }))
     * ```
     */
    onWant(fn: (peer: Peer<T>, key: K) => void): Unsub;
    /**
     * @example
     * ```ts
     * wants.onChange(() => render(wants.wanted()))
     * ```
     */
    onChange(fn: () => void): Unsub;
}
/**
 * Owns the index, the diff that tells each peer what the others want, and the cleanup.
 *
 * @example
 * ```ts
 * const wants = interest<Frame, string>({
 *   read: (msg) => (msg.t === 'want' ? { key: msg.c, on: msg.on } : null),
 *   write: ({ key, on }) => ({ t: 'want', c: key, on }),
 * })
 * ```
 */
export declare const interest: <T, K>(opts: InterestOptions<T, K>) => Interest<T, K>;
