import { Adder, Meta } from '../hub/index.js';
import { Node } from './node.js';
/**
 * Joins your own hub. What you hold is a node; what the hooks see is a peer.
 *
 * @example
 * ```ts
 * const here = participant(hub)
 * here.listen((msg) => console.log('for me', msg))
 * here.send({ t: 'want', c: 'tick', on: true })
 * ```
 */
export declare function participant<T>(hub: Adder<T>, meta?: Meta): Node<T>;
