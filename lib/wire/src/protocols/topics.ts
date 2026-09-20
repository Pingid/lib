import { hub, type Hub, type HubOptions, type Meta, type Node, type Plugin, type Unsub } from '../core.ts'
import { directory } from '../directory.ts'
import { interest } from '../interest.ts'
import { participant, tagged } from '../node.ts'

/**
 * Channels keyed by a name. An example, not the library — `routes` below is the
 * only part that knows what a message means.
 *
 * @example
 * ```ts
 * const app = topics<{ tick: number }>({ name: 'app', retain: ['tick'] })
 *
 * const page = app.node()
 * page.add(worker)
 * page.topic('tick').listen((n, meta) => console.log(n, meta.from))
 * page.topic('tick').send(1)
 * ```
 */

/**
 * Payload types by channel name.
 *
 * @example
 * ```ts
 * type App = { tick: number; chat: string }
 * ```
 */
export type Channels = Record<string, unknown>

/**
 * The wire. `interest` reads `want`, `directory` stamps `pub`.
 *
 * @example
 * ```ts
 * const frame: Frame = { t: 'pub', c: 'tick', d: 1, from: 'ab12-1' }
 * ```
 */
export type Frame =
  | { t: 'hello' }
  | { t: 'want'; c: string; on: boolean }
  | { t: 'pub'; c: string; d: unknown; from?: string; to?: string; r?: true }

/**
 * What came with a payload.
 *
 * @example
 * ```ts
 * topic.listen((n, meta) => meta.retained || reply(meta.from!))
 * ```
 */
export interface Message {
  readonly channel: string
  readonly from: string | null
  readonly retained: boolean
}

/**
 * One channel, typed.
 *
 * @example
 * ```ts
 * const off = wire.topic('chat').listen((text) => console.log(text))
 * wire.topic('chat').send('hi')
 * ```
 */
export interface Topic<T> {
  send(payload: T, to?: string): boolean
  listen(fn: (payload: T, meta: Message) => void): Unsub
}

/**
 * One end. The same call whether it hosts the others or joins them.
 *
 * @example
 * ```ts
 * const wire = app.node()
 * wire.add(socket)
 * wire.topic('tick').send(1)
 * ```
 */
export interface Wire<C extends Channels> {
  add(node: Node<unknown>, meta?: Meta): Unsub
  topic<K extends keyof C & string>(channel: K): Topic<C[K]>
  readonly peers: Hub<Frame>['peers']
  close(): void
}

/**
 * @example
 * ```ts
 * topics<{ tick: number }>({ name: 'app', retain: ['tick'] })
 * ```
 */
export interface Options<C extends Channels> {
  name: string
  retain?: readonly (keyof C & string)[] | undefined
}

type Sink = (payload: unknown, meta: Message) => void

/**
 * `interest` for the table, `directory` for replies, twenty lines for the rest.
 *
 * @example
 * ```ts
 * const app = topics<{ tick: number }>({ name: 'app', retain: ['tick'] })
 * const wire = app.node()
 * ```
 */
export const topics = <C extends Channels>(spec: Options<C>) => ({
  node: (opts: HubOptions<Frame> = {}): Wire<C> => {
    const retains = new Set<string>(spec.retain ?? [])
    const held = new Map<string, unknown>()

    const who = directory<Frame>({
      from: (msg) => (msg.t === 'pub' ? (msg.from ?? null) : ''),
      stamp: (msg, id) => ({ ...msg, from: id }),
    })

    const wants = interest<Frame, string>({
      read: (msg) => (msg.t === 'want' ? { key: msg.c, on: msg.on } : null),
      write: ({ key, on }) => ({ t: 'want', c: key, on }),
    })

    wants.onWant((peer, channel) => {
      if (held.has(channel)) peer.send({ t: 'pub', c: channel, d: held.get(channel), r: true })
    })

    const hello: Plugin<Frame> = () => ({ open: (peer) => void peer.send({ t: 'hello' }) })

    const routes: Plugin<Frame> = () => ({
      data: (peer, msg, next) => {
        if (msg.t === 'hello') return void wants.announce(peer)
        if (msg.t !== 'pub') return next(msg)
        if (msg.to !== undefined) return void who.peer(msg.to)?.send(msg)
        if (retains.has(msg.c)) held.set(msg.c, msg.d)
        for (const to of wants.match(msg.c, peer)) to.send(msg)
      },
    })

    const h = hub<Frame>([hello, who, wants, routes], opts)
    const here = participant(h)
    const sinks = new Map<string, Set<Sink>>()

    here.listen((msg) => {
      if (msg.t !== 'pub') return
      const set = sinks.get(msg.c)
      if (!set) return
      const meta: Message = { channel: msg.c, from: msg.from ?? null, retained: msg.r === true }
      for (const fn of [...set]) fn(msg.d, meta)
    })

    return {
      add: (node, meta) => h.add(tagged<Frame>(node, spec.name), meta),
      topic: <K extends keyof C & string>(channel: K): Topic<C[K]> => ({
        send: (payload, to) =>
          here.send(to === undefined ? { t: 'pub', c: channel, d: payload } : { t: 'pub', c: channel, d: payload, to }),
        listen: (fn) => {
          const set = sinks.get(channel) ?? new Set<Sink>()
          sinks.set(channel, set)
          const sink = fn as Sink
          set.add(sink)
          if (set.size === 1) here.send({ t: 'want', c: channel, on: true })
          return () => {
            if (!set.delete(sink) || set.size > 0) return
            sinks.delete(channel)
            here.send({ t: 'want', c: channel, on: false })
          }
        },
      }),
      get peers() {
        return h.peers.filter((peer) => peer.meta['local'] !== true)
      },
      close: () => h.close(),
    }
  },
})
