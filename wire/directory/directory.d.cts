import { Hooks, Hub, Peer, Plugin } from '../hub/index.cjs';
import { Unsub } from '../node/node.cjs';
/** Where a sender id lives on your message, and how to put one there */
export interface DirectoryOptions<T> {
    /** Null for an unstamped message, which gets stamped. Any string for one to leave alone. */
    from(msg: T): string | null;
    /** Writes an id onto a message */
    stamp(msg: T, id: string): T;
    /** Mints an id for a peer. Default is a random tag plus a counter. */
    mint?: (() => string) | undefined;
}
/**
 * Where a talker lives, learned from hearing it talk. Stamps unstamped messages, and
 * remembers which peer each sender was last heard through. No wire, no id scheme.
 *
 * @example
 * ```ts
 * const who = new Directory<Frame>({
 *   from: (msg) => (msg.t === 'pub' ? (msg.from ?? null) : ''),
 *   stamp: (msg, id) => ({ ...msg, from: id }),
 * })
 * const routes = plugin<Frame>(() => ({
 *   data: (peer, msg, next) => (msg.to ? void who.peer(msg.to)?.send(msg) : next(msg)),
 * }))
 * new Hub<Frame>([who, routes]) // who first: it stamps before routes reads
 * ```
 */
export declare class Directory<T> implements Plugin<T> {
    #private;
    constructor(options: DirectoryOptions<T>);
    bind(_hub: Hub<T>): Hooks<T>;
    /** This hub's id for a peer, minted on first use */
    id(peer: Peer<T>): string;
    /** Who to hand something addressed to id, or null if never heard of */
    peer(id: string): Peer<T> | null;
    /** The route table moved */
    onChange(fn: () => void): Unsub;
}
