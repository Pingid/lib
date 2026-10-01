import type { Node } from './node.ts'

// ------------------------------------------------------------------
// MapNode
// ------------------------------------------------------------------

/** Creates a node speaking B over one speaking A. A decode returning null drops the message. */
export function mapNode<A, B>(node: Node<A>, encode: (msg: B) => A, decode: (msg: A) => B | null): Node<B> {
  return {
    send: (msg) => node.send(encode(msg)),
    listen: (fn) =>
      node.listen((msg) => {
        const out = decode(msg)
        if (out !== null) fn(out)
      }),
    closed: (fn) => node.closed(fn),
    close: () => node.close(),
  }
}

// ------------------------------------------------------------------
// Tagged
// ------------------------------------------------------------------

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
export function tagged<T extends object>(node: Node<unknown>, tag: string): Node<T> {
  return mapNode<unknown, T>(
    node,
    (msg) => ({ ...msg, $: tag }),
    (raw) => {
      if (typeof raw !== 'object' || raw === null) return null
      const { $: seen, ...rest } = raw as { $?: unknown }
      return seen === tag ? (rest as T) : null
    },
  )
}
