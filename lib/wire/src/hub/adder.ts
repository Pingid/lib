import type { Node, Unsub } from '../node/node.ts'
import type { Meta } from './meta.ts'

/** The part of a Hub that takes nodes. Hub implements this, and it is all a Source needs. */
export interface Adder<T = unknown> {
  /** Takes a node. The returned Unsub removes it and closes it. */
  add(node: Node<T>, meta?: Meta): Unsub
}
