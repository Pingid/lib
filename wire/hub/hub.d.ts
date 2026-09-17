import { Node, Unsub } from '../node/node.js';
import { Adder } from './adder.js';
import { Meta } from './meta.js';
import { Plugin } from './plugin.js';
import { Peer } from './peer.js';
/** Faults, and messages nothing consumed */
export interface HubOptions<T = unknown> {
    /** Called for anything a hook threw. Rethrown on a microtask when unset. */
    onError?: ((err: unknown) => void) | undefined;
    /** Called for an inbound message that ran the whole chain without being consumed */
    onUnhandled?: ((peer: Peer<T>, msg: T) => void) | undefined;
}
/**
 * A set of peers and a hook chain. Nothing else. Admission is a hook closing the peer;
 * participation is a node you add.
 *
 * @example
 * ```ts
 * const gate = plugin<Frame>(() => ({ open: (peer) => void (peer.meta['token'] === 'ok' || peer.close()) }))
 * const hub = new Hub<Frame>([gate, routes])
 * const here = participant(hub)
 * hub.add(node, { name: 'worker' })
 * ```
 */
export declare class Hub<T = unknown> implements Adder<T> {
    #private;
    constructor(plugins?: readonly Plugin<T>[], options?: HubOptions<T>);
    /** Takes a node as a peer. The returned Unsub removes it and closes it. */
    add(node: Node<T>, meta?: Meta): Unsub;
    /** The peers this hub is holding */
    get peers(): readonly Peer<T>[];
    /** Subscribes to this hub closing. Fires immediately if it already has. */
    closed(fn: () => void): Unsub;
    /** Closes this hub and every peer it holds */
    close(): void;
}
