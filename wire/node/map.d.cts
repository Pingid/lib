import { Node } from './node.cjs';
/** Creates a node speaking B over one speaking A. A decode returning null drops the message. */
export declare function mapNode<A, B>(node: Node<A>, encode: (msg: B) => A, decode: (msg: A) => B | null): Node<B>;
/**
 * mapNode with the tag-and-filter a shared transport ends up writing.
 *
 * @example
 * ```ts
 * const [x, y] = pair<unknown>()
 * chat.add(tagged<ChatFrame>(x, 'chat'))
 * store.add(tagged<StoreFrame>(x, 'store')) // same wire, neither sees the other
 * ```
 */
export declare function tagged<T extends object>(node: Node<unknown>, tag: string): Node<T>;
