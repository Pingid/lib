import { Hooks, Hub, Peer, Plugin } from '../hub/index.cjs';
import { Unsub } from '../node/node.cjs';
import { Declaration } from './declaration.cjs';
/** How declarations ride your wire, and what a key is */
export interface InterestOptions<T, K> {
    /** Null when the message is not a declaration */
    read(msg: T): Declaration<K> | null;
    /** Writes a declaration as a message of your own */
    write(decl: Declaration<K>): T;
    /** Stable identity for a key. Default String(key). */
    hash?: ((key: K) => string) | undefined;
    /** Interest keys a published key reaches. Default [key]. Wildcards live here. */
    expand?: ((key: K) => Iterable<K>) | undefined;
}
/**
 * Who wants what, and keeping the neighbours told. Owns the index, the diff that tells
 * each peer what the others want, and the cleanup. No wire, no key type.
 *
 * @example
 * ```ts
 * const wants = new Interest<Frame, string>({
 *   read: (msg) => (msg.t === 'want' ? { key: msg.c, on: msg.on } : null),
 *   write: ({ key, on }) => ({ t: 'want', c: key, on }),
 * })
 * const routes = plugin<Frame>(() => ({
 *   data: (peer, msg, next) => {
 *     if (msg.t !== 'pub') return next(msg)
 *     for (const to of wants.match(msg.c, peer)) to.send(msg)
 *   },
 * }))
 * new Hub<Frame>([wants, routes])
 * ```
 */
export declare class Interest<T, K> implements Plugin<T> {
    #private;
    constructor(options: InterestOptions<T, K>);
    bind(hub: Hub<T>): Hooks<T>;
    /** Peers wanting key, from excluded, deduplicated across expansions */
    match(key: K, from?: Peer<T>): readonly Peer<T>[];
    /** Everything wanted by someone other than except */
    wanted(except?: Peer<T>): readonly K[];
    /** Everything this one peer wants */
    of(peer: Peer<T>): readonly K[];
    /** Declares on a peer's behalf, for interest that never crossed a wire */
    set(peer: Peer<T>, key: K, on: boolean): void;
    /** Re-sends the whole set to a peer. Call it when the peer says hello again. */
    announce(peer: Peer<T>): void;
    /** A peer newly wants a key. Where replaying retained state belongs. */
    onWant(fn: (peer: Peer<T>, key: K) => void): Unsub;
    /** The table moved */
    onChange(fn: () => void): Unsub;
}
