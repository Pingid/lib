import { describe, expect, it } from 'vitest'

import { hub, type Peer, type Plugin } from './core.ts'
import { directory } from './directory.ts'
import { interest } from './interest.ts'
import { pair, participant, tagged } from './node.ts'
import { records } from './protocols/records.ts'
import { topics, type Frame } from './protocols/topics.ts'

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

const link = (a: { add: (n: never, m?: never) => unknown }, b: { add: (n: never, m?: never) => unknown }) => {
  const [x, y] = pair<unknown>()
  a.add(x as never)
  b.add(y as never)
}

/* -------------------------------------------------------------------------- */
/* interest — the abstraction, with no protocol in sight                      */
/* -------------------------------------------------------------------------- */

type Want = { want: string; on: boolean } | { say: string }

const wanting = () =>
  interest<Want, string>({
    read: (msg) => ('want' in msg ? { key: msg.want, on: msg.on } : null),
    write: ({ key, on }) => ({ want: key, on }),
  })

describe('interest', () => {
  it('indexes who wants what without knowing what a message is', async () => {
    const wants = wanting()
    const delivered: string[] = []
    const routes: Plugin<Want> = () => ({
      data: (peer, msg, next) => {
        if (!('say' in msg)) return next(msg)
        for (const to of wants.match(msg.say, peer)) to.send(msg)
      },
    })

    const h = hub<Want>([wants, routes])
    const [x, y] = pair<Want>()
    const [p, q] = pair<Want>()
    h.add(x)
    h.add(p)
    q.listen((msg) => void ('say' in msg && delivered.push(msg.say)))

    q.send({ want: 'weather', on: true })
    await settle()
    y.send({ say: 'weather' })
    y.send({ say: 'sport' })
    await settle()

    expect(delivered).toEqual(['weather'])
  })

  it('tells each peer what the others want, and takes it back', async () => {
    const wants = wanting()
    const h = hub<Want>([wants])
    const [x, y] = pair<Want>()
    const [p, q] = pair<Want>()
    h.add(x)
    h.add(p)

    const told: Want[] = []
    y.listen((msg) => told.push(msg))
    q.send({ want: 'weather', on: true })
    await settle()
    expect(told).toEqual([{ want: 'weather', on: true }])

    q.send({ want: 'weather', on: false })
    await settle()
    expect(told).toEqual([
      { want: 'weather', on: true },
      { want: 'weather', on: false },
    ])
  })

  it('expands a published key, which is all a wildcard is', () => {
    const wants = interest<Want, string>({
      read: (msg) => ('want' in msg ? { key: msg.want, on: msg.on } : null),
      write: ({ key, on }) => ({ want: key, on }),
      expand: (key) => [key, `${key.split('/')[0]}/*`],
    })
    const h = hub<Want>([wants])
    const [x] = pair<Want>()
    h.add(x)
    const peer = h.peers[0] as Peer<Want>

    wants.set(peer, 'users/*', true)
    expect(wants.match('users/42')).toEqual([peer])
    expect(wants.match('posts/42')).toEqual([])
  })

  it('forgets a peer that leaves', async () => {
    const wants = wanting()
    const h = hub<Want>([wants])
    const [x, y] = pair<Want>()
    h.add(x)
    y.send({ want: 'weather', on: true })
    await settle()
    expect(wants.wanted()).toEqual(['weather'])

    y.close()
    await settle()
    expect(wants.wanted()).toEqual([])
  })
})

/* -------------------------------------------------------------------------- */
/* directory                                                                  */
/* -------------------------------------------------------------------------- */

describe('directory', () => {
  it('learns the way back to a sender it only overheard', async () => {
    type Msg = { from?: string; to?: string; body: string }

    const who = directory<Msg>({ from: (msg) => msg.from ?? null, stamp: (msg, id) => ({ ...msg, from: id }) })
    const routes: Plugin<Msg> = (h) => ({
      data: (peer, msg) => {
        if (msg.to !== undefined) return void who.peer(msg.to)?.send(msg)
        for (const to of h.peers) if (to !== peer) to.send(msg)
      },
    })

    const h = hub<Msg>([who, routes])
    const [x, y] = pair<Msg>()
    const [p, q] = pair<Msg>()
    h.add(x)
    h.add(p)

    const asked: Msg[] = []
    const replies: Msg[] = []
    y.listen((msg) => replies.push(msg))
    q.listen((msg) => asked.push(msg))

    y.send({ body: 'ping' })
    await settle()
    expect(asked[0]?.body).toBe('ping')
    expect(typeof asked[0]?.from).toBe('string')

    // `q` has never been told who that is, only where the reply should go.
    q.send({ to: asked[0]!.from!, body: 'pong' })
    await settle()

    expect(replies.map((m) => m.body)).toEqual(['pong'])
  })
})

/* -------------------------------------------------------------------------- */
/* two protocols, one machine                                                 */
/* -------------------------------------------------------------------------- */

const chat = topics<{ tick: number; chat: string }>({ name: 'chat', retain: ['tick'] })

describe('topics, built on the blocks', () => {
  it('fans out, retains and replies', async () => {
    const host = chat.node()
    const a = chat.node()
    const b = chat.node()
    link(host, a)
    link(host, b)
    await settle()

    const heard: string[] = []
    const replies: string[] = []
    a.topic('chat').listen((text) => replies.push(text))
    b.topic('chat').listen((text, meta) => {
      heard.push(text)
      if (meta.from) b.topic('chat').send('pong', meta.from)
    })
    await settle()

    a.topic('chat').send('ping')
    await settle()
    expect(heard).toEqual(['ping'])
    expect(replies).toEqual(['pong'])

    a.topic('tick').send(7)
    await settle()
    const late = chat.node()
    link(host, late)
    await settle()
    const seen: Array<[number, boolean]> = []
    late.topic('tick').listen((n, meta) => seen.push([n, meta.retained]))
    await settle()
    expect(seen).toEqual([[7, true]])
  })

  it('relays through a hub in the middle that wants nothing', async () => {
    const left = chat.node()
    const middle = chat.node()
    const right = chat.node()
    link(left, middle)
    link(middle, right)
    await settle()

    const seen: number[] = []
    right.topic('tick').listen((n) => seen.push(n))
    await settle()

    left.topic('tick').send(7)
    await settle()
    expect(seen).toEqual([7])
  })
})

describe('records, the same machinery under a compound key', () => {
  const store = records('store')

  it('routes on (collection, id)', async () => {
    const host = store.node()
    const a = store.node()
    const b = store.node()
    link(host, a)
    link(host, b)
    await settle()

    const mine: unknown[] = []
    const other: unknown[] = []
    b.watch('users', '42', (patch) => mine.push(patch))
    b.watch('users', '7', (patch) => other.push(patch))
    await settle()

    a.patch('users', '42', { name: 'ada' })
    await settle()

    expect(mine).toEqual([{ name: 'ada' }])
    expect(other).toEqual([])
  })

  it('reaches a collection watcher with a record patch', async () => {
    const host = store.node()
    const a = store.node()
    const b = store.node()
    link(host, a)
    link(host, b)
    await settle()

    const all: string[] = []
    b.watch('users', '*', (_patch, at) => all.push(at.id))
    await settle()

    a.patch('users', '42', { name: 'ada' })
    a.patch('users', '7', { name: 'grace' })
    a.patch('posts', '1', { title: 'hi' })
    await settle()

    expect(all).toEqual(['42', '7'])
  })

  it('propagates compound interest across a hub in the middle', async () => {
    const left = store.node()
    const middle = store.node()
    const right = store.node()
    link(left, middle)
    link(middle, right)
    await settle()

    const seen: string[] = []
    right.watch('users', '*', (_patch, at) => seen.push(at.id))
    await settle()

    expect(left.watched()).toEqual([['users', '*']])

    left.patch('users', '42', { name: 'ada' })
    await settle()
    expect(seen).toEqual(['42'])
  })
})

describe('core', () => {
  it('gates admission by closing the peer in `open`', async () => {
    const gate: Plugin<string> = () => ({ open: (peer) => void (peer.meta['token'] === 'ok' || peer.close()) })
    const h = hub<string>([gate])
    const [x, y] = pair<string>()
    const [p] = pair<string>()
    h.add(x, { token: 'no' })
    h.add(p, { token: 'ok' })

    let dead = false
    y.closed(() => (dead = true))
    await settle()

    expect(dead).toBe(true)
    expect(h.peers.length).toBe(1)
  })

  it('lets two protocols share one transport', async () => {
    const [x, y] = pair<unknown>()
    const one = tagged<Frame>(x, 'one')
    const two = tagged<Frame>(x, 'two')
    const seenOne: Frame[] = []
    const seenTwo: Frame[] = []
    one.listen((frame) => seenOne.push(frame))
    two.listen((frame) => seenTwo.push(frame))

    y.send({ $: 'one', t: 'hello' })
    y.send({ $: 'two', t: 'hello' })
    y.send({ $: 'three', t: 'hello' })
    await settle()

    expect(seenOne).toEqual([{ t: 'hello' }])
    expect(seenTwo).toEqual([{ t: 'hello' }])
  })

  it('participation is a peer', async () => {
    const h = hub<string>([])
    const here = participant(h, { name: 'me' })
    expect(h.peers.length).toBe(1)
    here.close()
    await settle()
    expect(h.peers.length).toBe(0)
  })
})
