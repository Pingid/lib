import { Node, Unsub } from '../node/node.js';
import { Meta } from './meta.js';
/** The part of a Hub that takes nodes. Hub implements this, and it is all a Source needs. */
export interface Adder<T = unknown> {
    /** Takes a node. The returned Unsub removes it and closes it. */
    add(node: Node<T>, meta?: Meta): Unsub;
}
