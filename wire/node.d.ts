import { Hub, Meta, Node, Unsub } from './core.js';
/**
 * Two cross-wired nodes in one process.
 *
 * @example
 * ```ts
 * const [mine, theirs] = pair<Frame>()
 * h.add(theirs)
 * mine.send({ t: 'hello' })
 * ```
 */
export declare const pair: <T>() => readonly [Node<T>, Node<T>];
/**
 * Join your own hub. What you hold is a node; what the hooks see is a peer.
 *
 * @example
 * ```ts
 * const here = participant(h)
 * here.listen((msg) => console.log('for me', msg))
 * here.send({ t: 'want', c: 'tick', on: true })
 * ```
 */
export declare const participant: <T>(hub: Hub<T>, meta?: Meta) => Node<T>;
/**
 * A node speaking `B` over one speaking `A`. `decode` returning null drops the message.
 *
 * @example
 * ```ts
 * const lines = mapNode<string, Frame>(
 *   socket,
 *   (frame) => `${JSON.stringify(frame)}\n`,
 *   (line) => (line.trim() ? (JSON.parse(line) as Frame) : null),
 * )
 * ```
 */
export declare const mapNode: <A, B>(node: Node<A>, encode: (msg: B) => A, decode: (msg: A) => B | null) => Node<B>;
/**
 * {@link mapNode} with the tag-and-filter a shared transport ends up writing.
 *
 * @example
 * ```ts
 * const [x, y] = pair<unknown>()
 * chat.add(tagged<ChatFrame>(x, 'chat'))
 * store.add(tagged<StoreFrame>(x, 'store')) // same wire, neither sees the other
 * ```
 */
export declare const tagged: <T extends object>(node: Node<unknown>, tag: string) => Node<T>;
export type { Unsub };
