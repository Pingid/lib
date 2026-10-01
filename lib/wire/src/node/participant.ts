import type { Adder, Meta } from '../hub/index.ts'
import type { Node } from './node.ts'
import { pair } from './pair.ts'

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
export function participant<T>(hub: Adder<T>, meta: Meta = {}): Node<T> {
  const [mine, theirs] = pair<T>()
  hub.add(theirs, { ...meta, local: true })
  return mine
}
