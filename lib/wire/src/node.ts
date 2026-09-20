import type { Hub, Meta, Node, Unsub } from './core.ts'

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
export const pair = <T>(): readonly [Node<T>, Node<T>] => {
  type Side = { sinks: Set<(msg: T) => void>; gone: Set<() => void>; held: T[] }
  const fresh = (): Side => ({ sinks: new Set(), gone: new Set(), held: [] })
  const sides: [Side, Side] = [fresh(), fresh()]
  let open = true

  const shut = () => {
    if (!open) return
    open = false
    for (const side of sides) {
      for (const fn of [...side.gone]) fn()
      side.gone.clear()
      side.sinks.clear()
      side.held.length = 0
    }
  }

  const end = (i: 0 | 1): Node<T> => {
    const mine = sides[i]
    const other = sides[i === 0 ? 1 : 0]
    return {
      send: (msg) => {
        if (!open) return false
        queueMicrotask(() => {
          if (!open) return
          if (other.sinks.size === 0) return void other.held.push(msg)
          for (const fn of [...other.sinks]) fn(msg)
        })
        return true
      },
      listen: (fn) => {
        mine.sinks.add(fn)
        for (const msg of mine.held.splice(0)) fn(msg)
        return () => void mine.sinks.delete(fn)
      },
      closed: (fn) => {
        if (!open) return (fn(), () => {})
        mine.gone.add(fn)
        return () => void mine.gone.delete(fn)
      },
      close: shut,
    }
  }

  return [end(0), end(1)] as const
}

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
export const participant = <T>(hub: Hub<T>, meta: Meta = {}): Node<T> => {
  const [mine, theirs] = pair<T>()
  hub.add(theirs, { ...meta, local: true })
  return mine
}

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
export const mapNode = <A, B>(node: Node<A>, encode: (msg: B) => A, decode: (msg: A) => B | null): Node<B> => ({
  send: (msg) => node.send(encode(msg)),
  listen: (fn) =>
    node.listen((msg) => {
      const out = decode(msg)
      if (out !== null) fn(out)
    }),
  closed: (fn) => node.closed(fn),
  close: () => node.close(),
})

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
export const tagged = <T extends object>(node: Node<unknown>, tag: string): Node<T> =>
  mapNode<unknown, T>(
    node,
    (msg) => ({ ...msg, $: tag }),
    (raw) => {
      if (typeof raw !== 'object' || raw === null) return null
      const { $: seen, ...rest } = raw as { $?: unknown }
      return seen === tag ? (rest as T) : null
    },
  )

export type { Unsub }
