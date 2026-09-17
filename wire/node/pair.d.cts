import { Node } from './node.cjs';
/**
 * Creates two cross-wired nodes in one process.
 *
 * @example
 * ```ts
 * const [mine, theirs] = pair<Frame>()
 * hub.add(theirs)
 * mine.send({ t: 'hello' })
 * ```
 */
export declare function pair<T>(): readonly [Node<T>, Node<T>];
