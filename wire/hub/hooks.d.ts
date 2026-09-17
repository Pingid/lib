import { Peer } from './peer.js';
/** What a Plugin contributes to a Hub */
export interface Hooks<T = unknown> {
    /** A peer was admitted */
    open?(peer: Peer<T>): void;
    /** A peer was dropped */
    close?(peer: Peer<T>): void;
    /** Inbound, in plugin order. Call next to pass it on; return without to consume it. */
    data?(peer: Peer<T>, msg: T, next: (msg: T) => void): void;
    /** Outbound, in reverse plugin order, on every peer.send */
    send?(peer: Peer<T>, msg: T, next: (msg: T) => void): void;
}
