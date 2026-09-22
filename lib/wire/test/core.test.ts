/*--------------------------------------------------------------------------

@pingid/lib-wire

The MIT License (MIT)

Copyright (c) 2026 Dan Beaven <dm.beaven@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/

import { describe, expect, it } from 'vitest'

import { Directory } from '../src/directory/index.ts'
import { Hub, plugin, type Peer } from '../src/hub/index.ts'
import { Interest } from '../src/interest/index.ts'
import { pair, participant, tagged } from '../src/node/index.ts'
import { Store } from '../src/protocols/records/index.ts'
import { Wire, type Frame } from '../src/protocols/topics/index.ts'

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

const link = (a: { add: (n: never, m?: never) => unknown }, b: { add: (n: never, m?: never) => unknown }) => {
  const [x, y] = pair<unknown>()
  a.add(x as never)
  b.add(y as never)
}

// ------------------------------------------------------------------
// Interest — the abstraction, with no protocol in sight
// ------------------------------------------------------------------
type Want = { want: string; on: boolean } | { say: string }

const wanting = () =>
  new Interest<Want, string>({
    read: (msg) => ('want' in msg ? { key: msg.want, on: msg.on } : null),
    write: ({ key, on }) => ({ want: key, on }),
  })

describe('Interest', () => {
  it('indexes who wants what without knowing what a message is', async () => {
    const wants = wanting()
    const delivered: string[] = []
    const routes = plugin<Want>(() => ({
      data: (peer, msg, next) => {
        if (!('say' in msg)) return next(msg)
        for (const to of wants.match(msg.say, peer)) to.send(msg)
      },
    }))

    const hub = new Hub<Want>([wants, routes])
    const [x, y] = pair<Want>()
    const [p, q] = pair<Want>()
    hub.add(x)
    hub.add(p)
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
    const hub = new Hub<Want>([wants])
    const [x, y] = pair<Want>()
    const [p, q] = pair<Want>()
    hub.add(x)
    hub.add(p)

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
    const wants = new Interest<Want, string>({
      read: (msg) => ('want' in msg ? { key: msg.want, on: msg.on } : null),
      write: ({ key, on }) => ({ want: key, on }),
      expand: (key) => [key, `${key.split('/')[0]}/*`],
    })
    const hub = new Hub<Want>([wants])
    const [x] = pair<Want>()
    hub.add(x)
    const peer = hub.peers[0] as Peer<Want>

    wants.set(peer, 'users/*', true)
    expect(wants.match('users/42')).toEqual([peer])
    expect(wants.match('posts/42')).toEqual([])
  })

  it('forgets a peer that leaves', async () => {
    const wants = wanting()
    const hub = new Hub<Want>([wants])
    const [x, y] = pair<Want>()
    hub.add(x)
    y.send({ want: 'weather', on: true })
    await settle()
    expect(wants.wanted()).toEqual(['weather'])

    y.close()
    await settle()
    expect(wants.wanted()).toEqual([])
  })
})

// ------------------------------------------------------------------
// Directory
// ------------------------------------------------------------------
describe('Directory', () => {
  it('learns the way back to a sender it only overheard', async () => {
    type Msg = { from?: string; to?: string; body: string }

    const who = new Directory<Msg>({ from: (msg) => msg.from ?? null, stamp: (msg, id) => ({ ...msg, from: id }) })
    const routes = plugin<Msg>((hub) => ({
      data: (peer, msg) => {
        if (msg.to !== undefined) return void who.peer(msg.to)?.send(msg)
        for (const to of hub.peers) if (to !== peer) to.send(msg)
      },
    }))

    const hub = new Hub<Msg>([who, routes])
    const [x, y] = pair<Msg>()
    const [p, q] = pair<Msg>()
    hub.add(x)
    hub.add(p)

    const asked: Msg[] = []
    const replies: Msg[] = []
    y.listen((msg) => replies.push(msg))
    q.listen((msg) => asked.push(msg))

    y.send({ body: 'ping' })
    await settle()
    expect(asked[0]?.body).toBe('ping')
    expect(typeof asked[0]?.from).toBe('string')

    // q has never been told who that is, only where the reply should go.
    q.send({ to: asked[0]!.from!, body: 'pong' })
    await settle()

    expect(replies.map((m) => m.body)).toEqual(['pong'])
  })
})

// ------------------------------------------------------------------
// Topics — two protocols, one machine
// ------------------------------------------------------------------
type Chat = { tick: number; chat: string }
const chat = () => new Wire<Chat>({ name: 'chat', retain: ['tick'] })

describe('Topics, built on the blocks', () => {
  it('fans out, retains and replies', async () => {
    const host = chat()
    const a = chat()
    const b = chat()
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
    const late = chat()
    link(host, late)
    await settle()
    const seen: Array<[number, boolean]> = []
    late.topic('tick').listen((n, meta) => seen.push([n, meta.retained]))
    await settle()
    expect(seen).toEqual([[7, true]])
  })

  it('relays through a hub in the middle that wants nothing', async () => {
    const left = chat()
    const middle = chat()
    const right = chat()
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

// ------------------------------------------------------------------
// Records — the same machinery under a compound key
// ------------------------------------------------------------------
describe('Records, the same machinery under a compound key', () => {
  const store = () => new Store({ name: 'store' })

  it('routes on (collection, id)', async () => {
    const host = store()
    const a = store()
    const b = store()
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
    const host = store()
    const a = store()
    const b = store()
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
    const left = store()
    const middle = store()
    const right = store()
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

// ------------------------------------------------------------------
// Hub
// ------------------------------------------------------------------
describe('Hub', () => {
  it('gates admission by closing the peer in open', async () => {
    const gate = plugin<string>(() => ({ open: (peer) => void (peer.meta['token'] === 'ok' || peer.close()) }))
    const hub = new Hub<string>([gate])
    const [x, y] = pair<string>()
    const [p] = pair<string>()
    hub.add(x, { token: 'no' })
    hub.add(p, { token: 'ok' })

    let dead = false
    y.closed(() => (dead = true))
    await settle()

    expect(dead).toBe(true)
    expect(hub.peers.length).toBe(1)
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
    const hub = new Hub<string>([])
    const here = participant(hub, { name: 'me' })
    expect(hub.peers.length).toBe(1)
    here.close()
    await settle()
    expect(hub.peers.length).toBe(0)
  })
})
