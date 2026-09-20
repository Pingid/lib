import { hub, type HubOptions, type Meta, type Node, type Plugin, type Unsub } from '../core.ts'
import { interest } from '../interest.ts'
import { participant, tagged } from '../node.ts'

/**
 * The same machinery under a compound key. Shares nothing with `topics.ts`
 * except `interest`, which never learns what a collection is.
 *
 * @example
 * ```ts
 * const store = records('store')
 *
 * const viewer = store.node()
 * viewer.add(server)
 * viewer.watch('users', '42', (patch) => apply(patch))
 * viewer.watch('users', '*', (patch, at) => log(at.id, patch))
 * ```
 */

/**
 * `id` may be `'*'` for a whole collection.
 *
 * @example
 * ```ts
 * const one: Key = ['users', '42']
 * const all: Key = ['users', '*']
 * ```
 */
export type Key = readonly [collection: string, id: string]

export type Frame =
  { t: 'hello' } | { t: 'watch'; k: [string, string]; on: boolean } | { t: 'patch'; c: string; id: string; d: unknown }

/**
 * Which record a patch was for — the one you asked about, or one in a collection you watch.
 *
 * @example
 * ```ts
 * store.watch('users', '*', (patch, at) => console.log(at.id, patch))
 * ```
 */
export interface Watch {
  readonly collection: string
  readonly id: string
}

/**
 * One end. The same call whether it hosts the others or joins them.
 *
 * @example
 * ```ts
 * const store = records('store').node()
 * store.add(socket)
 * store.patch('users', '42', { name: 'ada' })
 * ```
 */
export interface Store {
  add(node: Node<unknown>, meta?: Meta): Unsub
  /**
   * `id` may be `'*'` for every record in the collection.
   *
   * @example
   * ```ts
   * const off = store.watch('users', '42', (patch) => apply(patch))
   * ```
   */
  watch(collection: string, id: string, fn: (patch: unknown, at: Watch) => void): Unsub
  /**
   * @example
   * ```ts
   * store.patch('users', '42', { name: 'ada' })
   * ```
   */
  patch(collection: string, id: string, patch: unknown): boolean
  /**
   * Keys anyone on this hub is watching, its own peers included.
   *
   * @example
   * ```ts
   * console.log(server.watched()) // [['users', '42'], ['users', '*']]
   * ```
   */
  watched(): readonly Key[]
  close(): void
}

const hash = ([collection, id]: Key) => `${collection}/${id}`

// A patch reaches the record's watchers and the collection's alike.
const expand = ([collection, id]: Key): Key[] =>
  id === '*'
    ? [[collection, '*']]
    : [
        [collection, id],
        [collection, '*'],
      ]

/**
 * Interest in `(collection, id)`, with `expand` doing the wildcard.
 *
 * @example
 * ```ts
 * const store = records('store')
 * const server = store.node()
 * ```
 */
export const records = (name: string) => ({
  node: (opts: HubOptions<Frame> = {}): Store => {
    const wants = interest<Frame, Key>({
      read: (msg) => (msg.t === 'watch' ? { key: [msg.k[0], msg.k[1]] as Key, on: msg.on } : null),
      write: ({ key, on }) => ({ t: 'watch', k: [key[0], key[1]], on }),
      hash,
      expand,
    })

    const hello: Plugin<Frame> = () => ({ open: (peer) => void peer.send({ t: 'hello' }) })

    const routes: Plugin<Frame> = () => ({
      data: (peer, msg, next) => {
        if (msg.t === 'hello') return void wants.announce(peer)
        if (msg.t !== 'patch') return next(msg)
        for (const to of wants.match([msg.c, msg.id], peer)) to.send(msg)
      },
    })

    const h = hub<Frame>([hello, wants, routes], opts)
    const here = participant(h)
    const sinks = new Map<string, Set<(patch: unknown, at: Watch) => void>>()

    here.listen((msg) => {
      if (msg.t !== 'patch') return
      for (const key of expand([msg.c, msg.id])) {
        const set = sinks.get(hash(key))
        if (!set) continue
        for (const fn of [...set]) fn(msg.d, { collection: msg.c, id: msg.id })
      }
    })

    return {
      add: (node, meta) => h.add(tagged<Frame>(node, name), meta),
      watch: (collection, id, fn) => {
        const key = hash([collection, id])
        const set = sinks.get(key) ?? new Set<(patch: unknown, at: Watch) => void>()
        sinks.set(key, set)
        set.add(fn)
        if (set.size === 1) here.send({ t: 'watch', k: [collection, id], on: true })
        return () => {
          if (!set.delete(fn) || set.size > 0) return
          sinks.delete(key)
          here.send({ t: 'watch', k: [collection, id], on: false })
        }
      },
      patch: (collection, id, patch) => here.send({ t: 'patch', c: collection, id, d: patch }),
      watched: () => wants.wanted(),
      close: () => h.close(),
    }
  },
})
