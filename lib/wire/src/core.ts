/**
 * A set of peers and a hook chain. Nothing else.
 *
 * @example
 * ```ts
 * const log: Plugin<string> = () => ({ data: (peer, msg, next) => (console.log(msg), next(msg)) })
 * const h = hub<string>([log])
 * h.add(node, { name: 'worker' })
 * ```
 */

/**
 * Detach.
 *
 * @example
 * ```ts
 * const off = node.listen(console.log)
 * off()
 * ```
 */
export type Unsub = () => void

/**
 * Per-connection facts, supplied when a node is added.
 *
 * @example
 * ```ts
 * h.add(node, { name: 'tab-1', origin: 'https://app.example' })
 * ```
 */
export interface Meta {
  readonly [key: string]: unknown
}

/**
 * One end of a duplex channel.
 *
 * @example
 * ```ts
 * const node: Node<string> = {
 *   send: (msg) => (socket.write(msg), true),
 *   listen: (fn) => (socket.on('data', fn), () => socket.off('data', fn)),
 *   closed: (fn) => (socket.on('close', fn), () => socket.off('close', fn)),
 *   close: () => socket.end(),
 * }
 * ```
 */
export interface Node<T = unknown> {
  /**
   * Never throws. False when the message was dropped.
   *
   * @example
   * ```ts
   * if (!node.send(msg)) pending.push(msg)
   * ```
   */
  send(msg: T): boolean
  listen(fn: (msg: T) => void): Unsub
  /**
   * Terminal. Fires immediately if already closed.
   *
   * @example
   * ```ts
   * node.closed(() => console.log('gone'))
   * ```
   */
  closed(fn: () => void): Unsub
  close(): void
}

/**
 * A node the hub is holding. Identity is stable for its lifetime, so it keys a map.
 *
 * @example
 * ```ts
 * const seen = new Map<Peer<Frame>, number>()
 * const count: Plugin<Frame> = () => ({
 *   data: (peer, msg, next) => (seen.set(peer, (seen.get(peer) ?? 0) + 1), next(msg)),
 * })
 * ```
 */
export interface Peer<T = unknown> extends Node<T> {
  readonly meta: Meta
}

/**
 * What a plugin hooks.
 *
 * @example
 * ```ts
 * const hooks: Hooks<Frame> = {
 *   open: (peer) => peer.send({ t: 'hello' }),
 *   close: (peer) => forget(peer),
 *   data: (peer, msg, next) => next(msg),
 * }
 * ```
 */
export interface Hooks<T = unknown> {
  open?(peer: Peer<T>): void
  close?(peer: Peer<T>): void
  /**
   * Inbound, in plugin order. Call `next` to pass it on; return without to consume it.
   *
   * @example
   * ```ts
   * data: (peer, msg, next) => {
   *   if (msg.t !== 'ping') return next(msg)
   *   peer.send({ t: 'pong' })
   * }
   * ```
   */
  data?(peer: Peer<T>, msg: T, next: (msg: T) => void): void
  /**
   * Outbound, in reverse plugin order, on every `peer.send`.
   *
   * @example
   * ```ts
   * send: (_peer, msg, next) => next({ ...msg, at: Date.now() })
   * ```
   */
  send?(peer: Peer<T>, msg: T, next: (msg: T) => void): void
}

/**
 * Built once per hub, so state is a closure rather than an `attach` hook.
 *
 * @example
 * ```ts
 * const counter: Plugin<Frame> = (h) => {
 *   let seen = 0
 *   return { data: (_peer, msg, next) => (seen++, h.peers.length > 1 ? next(msg) : undefined) }
 * }
 * ```
 */
export type Plugin<T = unknown> = (hub: Hub<T>) => Hooks<T>

/**
 * Peers, and the pipeline they run through.
 *
 * @example
 * ```ts
 * const h = hub<Frame>([greet, routes])
 * h.add(node, { name: 'worker' })
 * console.log(h.peers.length)
 * ```
 */
export interface Hub<T = unknown> {
  /**
   * Take a node as a peer. The teardown removes it and closes it.
   *
   * @example
   * ```ts
   * const leave = h.add(node, { name: 'worker' })
   * leave()
   * ```
   */
  add(node: Node<T>, meta?: Meta): Unsub
  readonly peers: readonly Peer<T>[]
  closed(fn: () => void): Unsub
  close(): void
}

/**
 * Faults, and messages nothing consumed.
 *
 * @example
 * ```ts
 * hub<Frame>([routes], {
 *   onError: (err) => console.error(err),
 *   onUnhandled: (peer, msg) => console.warn('dropped', msg, 'from', peer.meta['name']),
 * })
 * ```
 */
export interface HubOptions<T = unknown> {
  onError?: ((err: unknown) => void) | undefined
  onUnhandled?: ((peer: Peer<T>, msg: T) => void) | undefined
}

const noop: Unsub = () => {}

type Run<T> = (peer: Peer<T>, msg: T, end: (msg: T) => void) => void

const chain = <T>(hooks: readonly Hooks<T>[], key: 'data' | 'send'): Run<T> => {
  const fns = hooks.flatMap((h) => (h[key] ? [h[key]!] : []))
  if (key === 'send') fns.reverse()
  return fns.reduceRight<Run<T>>(
    (down, fn) => (peer, msg, end) => fn(peer, msg, (out) => down(peer, out, end)),
    (_peer, msg, end) => end(msg),
  )
}

/**
 * Admission is a hook closing the peer; participation is a node you add.
 *
 * @example
 * ```ts
 * const gate: Plugin<Frame> = () => ({
 *   open: (peer) => void (peer.meta['token'] === 'ok' || peer.close()),
 * })
 * const h = hub<Frame>([gate, routes])
 * const here = participant(h)
 * ```
 */
export const hub = <T = unknown>(plugins: readonly Plugin<T>[] = [], opts: HubOptions<T> = {}): Hub<T> => {
  const peers = new Set<Peer<T>>()
  const ended = new Set<() => void>()
  let list: readonly Peer<T>[] | null = null
  let hooks: readonly Hooks<T>[] = []
  let inward: Run<T> = (_peer, msg, end) => end(msg)
  let outward: Run<T> = (_peer, msg, end) => end(msg)
  let shut = false

  const fail = (err: unknown) =>
    opts.onError
      ? opts.onError(err)
      : queueMicrotask(() => {
          throw err
        })

  const guard = (fn: () => void) => {
    try {
      fn()
    } catch (err) {
      fail(err)
    }
  }

  const drop = (peer: Peer<T>) => {
    if (!peers.delete(peer)) return
    list = null
    for (const h of hooks) if (h.close) guard(() => h.close!(peer))
  }

  const add = (node: Node<T>, meta: Meta = {}): Unsub => {
    if (shut) return (node.close(), noop)

    const peer: Peer<T> = {
      meta,
      send: (msg) => {
        if (shut) return false
        let ok = false
        guard(() => outward(peer, msg, (out) => void (ok = node.send(out))))
        return ok
      },
      listen: (fn) => node.listen(fn),
      closed: (fn) => node.closed(fn),
      close: () => node.close(),
    }

    peers.add(peer)
    list = null
    const off = node.listen((msg) => guard(() => inward(peer, msg, (out) => opts.onUnhandled?.(peer, out))))
    // Fires synchronously when the node is already dead, so only a peer that
    // survived being subscribed to ever reaches `open`.
    node.closed(() => drop(peer))
    if (!peers.has(peer)) return (off(), noop)

    for (const h of hooks) if (h.open) guard(() => h.open!(peer))

    return () => {
      drop(peer)
      off()
      node.close()
    }
  }

  const api: Hub<T> = {
    add,
    get peers() {
      return list ?? (list = [...peers])
    },
    closed: (fn) => {
      if (shut) return (fn(), noop)
      ended.add(fn)
      return () => void ended.delete(fn)
    },
    close: () => {
      if (shut) return
      shut = true
      for (const peer of [...peers]) {
        drop(peer)
        peer.close()
      }
      list = null
      for (const fn of [...ended]) guard(fn)
      ended.clear()
    },
  }

  hooks = plugins.map((plugin) => plugin(api))
  inward = chain(hooks, 'data')
  outward = chain(hooks, 'send')

  return api
}
