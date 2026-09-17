import { Node, Unsub } from '../node/node.cjs';
import { Meta } from './meta.cjs';
/** A node the Hub is holding. Identity is stable for its lifetime, so it keys a map. */
export interface Peer<T = unknown> extends Node<T> {
    /** The facts this peer was added with */
    readonly meta: Meta;
}
/** The Peer a Hub wraps around an added node. Outbound sends run the hub's send chain. */
export declare class HubPeer<T = unknown> implements Peer<T> {
    #private;
    constructor(node: Node<T>, meta: Meta, dispatch: (peer: Peer<T>, msg: T) => boolean);
    get meta(): Meta;
    send(msg: T): boolean;
    listen(fn: (msg: T) => void): Unsub;
    closed(fn: () => void): Unsub;
    close(): void;
}
