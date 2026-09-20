import type { Hub, Peer, Plugin, Unsub } from './core.ts'

/**
 * Who wants what, and keeping the neighbours told. No wire, no key type.
 *
 * @example
 * ```ts
 * const wants = interest<Frame, string>({
 *   read: (msg) => (msg.t === 'want' ? { key: msg.c, on: msg.on } : null),
 *   write: ({ key, on }) => ({ t: 'want', c: key, on }),
 * })
 * const routes: Plugin<Frame> = () => ({
 *   data: (peer, msg, next) => {
 *     if (msg.t !== 'pub') return next(msg)
 *     for (const to of wants.match(msg.c, peer)) to.send(msg)
 *   },
 * })
 * hub<Frame>([wants, routes])
 * ```
 */

/**
 * A peer taking an interest up, or dropping it.
 *
 * @example
 * ```ts
 * const decl: Declaration<string> = { key: 'tick', on: true }
 * ```
 */
export interface Declaration<K> {
  readonly key: K
  readonly on: boolean
}

/**
 * How declarations ride your wire, and what a key is.
 *
 * @example
 * ```ts
 * interest<Frame, readonly [string, string]>({
 *   read: (msg) => (msg.t === 'watch' ? { key: [msg.k[0], msg.k[1]], on: msg.on } : null),
 *   write: ({ key, on }) => ({ t: 'watch', k: [key[0], key[1]], on }),
 *   hash: ([collection, id]) => `${collection}/${id}`,
 * })
 * ```
 */
export interface InterestOptions<T, K> {
  /**
   * Null when the message is not a declaration.
   *
   * @example
   * ```ts
   * read: (msg) => (msg.t === 'want' ? { key: msg.c, on: msg.on } : null)
   * ```
   */
  read(msg: T): Declaration<K> | null
  /**
   * @example
   * ```ts
   * write: ({ key, on }) => ({ t: 'want', c: key, on })
   * ```
   */
  write(decl: Declaration<K>): T
  /**
   * Stable identity for a key. Default `String(key)`.
   *
   * @example
   * ```ts
   * hash: ([collection, id]) => `${collection}/${id}`
   * ```
   */
  hash?: ((key: K) => string) | undefined
  /**
   * Interest keys a published key reaches. Default `[key]`. Wildcards live here.
   *
   * @example
   * ```ts
   * expand: ([collection, id]) =>
   *   id === '*' ? [[collection, '*']] : [[collection, id], [collection, '*']]
   * ```
   */
  expand?: ((key: K) => Iterable<K>) | undefined
}

/**
 * The table, as a plugin you can also ask questions of.
 *
 * @example
 * ```ts
 * const wants = interest<Frame, string>({ read, write })
 * hub<Frame>([wants, routes])
 * wants.match('tick', sender) // who to send to
 * ```
 */
export interface Interest<T, K> extends Plugin<T> {
  /**
   * Peers wanting `key`, `from` excluded, deduplicated across expansions.
   *
   * @example
   * ```ts
   * for (const to of wants.match(msg.c, peer)) to.send(msg)
   * ```
   */
  match(key: K, from?: Peer<T>): readonly Peer<T>[]
  /**
   * Declare on a peer's behalf, for interest that never crossed a wire.
   *
   * @example
   * ```ts
   * wants.set(peer, 'audit', true) // everyone is watched whether they asked or not
   * ```
   */
  set(peer: Peer<T>, key: K, on: boolean): void
  /**
   * Everything wanted by someone other than `except`.
   *
   * @example
   * ```ts
   * console.log('this hub is asked for', wants.wanted())
   * ```
   */
  wanted(except?: Peer<T>): readonly K[]
  /**
   * @example
   * ```ts
   * const idle = h.peers.filter((peer) => wants.of(peer).length === 0)
   * ```
   */
  of(peer: Peer<T>): readonly K[]
  /**
   * Re-send the whole set to a peer. Call it when the peer says hello again.
   *
   * @example
   * ```ts
   * data: (peer, msg, next) => (msg.t === 'hello' ? wants.announce(peer) : next(msg))
   * ```
   */
  announce(peer: Peer<T>): void
  /**
   * A peer newly wants a key. Where replaying retained state belongs.
   *
   * @example
   * ```ts
   * wants.onWant((peer, c) => held.has(c) && peer.send({ t: 'pub', c, d: held.get(c), r: true }))
   * ```
   */
  onWant(fn: (peer: Peer<T>, key: K) => void): Unsub
  /**
   * @example
   * ```ts
   * wants.onChange(() => render(wants.wanted()))
   * ```
   */
  onChange(fn: () => void): Unsub
}

/**
 * Owns the index, the diff that tells each peer what the others want, and the cleanup.
 *
 * @example
 * ```ts
 * const wants = interest<Frame, string>({
 *   read: (msg) => (msg.t === 'want' ? { key: msg.c, on: msg.on } : null),
 *   write: ({ key, on }) => ({ t: 'want', c: key, on }),
 * })
 * ```
 */
export const interest = <T, K>(opts: InterestOptions<T, K>): Interest<T, K> => {
  const hash = opts.hash ?? ((key: K) => String(key))
  const expand = opts.expand ?? ((key: K) => [key])

  const byPeer = new Map<Peer<T>, Map<string, K>>()
  const byKey = new Map<string, Set<Peer<T>>>()
  const told = new Map<Peer<T>, Map<string, K>>()
  const wants = new Set<(peer: Peer<T>, key: K) => void>()
  const changes = new Set<() => void>()
  let hub!: Hub<T>

  const changed = () => {
    sync()
    for (const fn of [...changes]) fn()
  }

  // Tell every peer the union of what the others want, as a diff.
  const sync = () => {
    for (const peer of hub.peers) {
      const want = new Map<string, K>()
      for (const [other, keys] of byPeer) {
        if (other === peer) continue
        for (const [id, key] of keys) want.set(id, key)
      }
      const have = told.get(peer) ?? new Map<string, K>()
      for (const [id, key] of want) if (!have.has(id)) peer.send(opts.write({ key, on: true }))
      for (const [id, key] of have) if (!want.has(id)) peer.send(opts.write({ key, on: false }))
      told.set(peer, want)
    }
  }

  const set = (peer: Peer<T>, key: K, on: boolean) => {
    const id = hash(key)
    const keys = byPeer.get(peer) ?? new Map<string, K>()
    byPeer.set(peer, keys)

    if (on) {
      if (keys.has(id)) return
      keys.set(id, key)
      const peers = byKey.get(id) ?? new Set<Peer<T>>()
      byKey.set(id, peers)
      peers.add(peer)
      for (const fn of [...wants]) fn(peer, key)
    } else {
      if (!keys.delete(id)) return
      const peers = byKey.get(id)
      peers?.delete(peer)
      if (peers?.size === 0) byKey.delete(id)
      if (keys.size === 0) byPeer.delete(peer)
    }
    changed()
  }

  const forget = (peer: Peer<T>) => {
    const keys = byPeer.get(peer)
    byPeer.delete(peer)
    told.delete(peer)
    if (!keys) return
    for (const id of keys.keys()) {
      const peers = byKey.get(id)
      peers?.delete(peer)
      if (peers?.size === 0) byKey.delete(id)
    }
  }

  const self = ((h: Hub<T>) => {
    hub = h
    return {
      open: (peer: Peer<T>) => self.announce(peer),
      close: (peer: Peer<T>) => {
        forget(peer)
        changed()
      },
      data: (peer: Peer<T>, msg: T, next: (msg: T) => void) => {
        const decl = opts.read(msg)
        if (!decl) return next(msg)
        set(peer, decl.key, decl.on)
      },
    }
  }) as Interest<T, K>

  self.match = (key, from) => {
    const out: Peer<T>[] = []
    const seen = new Set<Peer<T>>()
    for (const one of expand(key)) {
      const peers = byKey.get(hash(one))
      if (!peers) continue
      for (const peer of peers) {
        if (peer === from || seen.has(peer)) continue
        seen.add(peer)
        out.push(peer)
      }
    }
    return out
  }

  self.set = set

  self.wanted = (except) => {
    const out = new Map<string, K>()
    for (const [peer, keys] of byPeer) {
      if (peer === except) continue
      for (const [id, key] of keys) out.set(id, key)
    }
    return [...out.values()]
  }

  self.of = (peer) => [...(byPeer.get(peer)?.values() ?? [])]

  self.announce = (peer) => {
    told.delete(peer)
    sync()
  }

  self.onWant = (fn) => (wants.add(fn), () => void wants.delete(fn))
  self.onChange = (fn) => (changes.add(fn), () => void changes.delete(fn))

  return self
}
