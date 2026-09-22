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

import { FakeClock } from '../src/adapters/clock.ts'
import { keepalive } from '../src/adapters/keepalive.ts'
import { fromPostMessage, type PostTarget } from '../src/adapters/post-message.ts'
import { ReconnectNode } from '../src/adapters/reconnect.ts'
import { Sockets, type Socket } from '../src/adapters/sockets.ts'
import { source } from '../src/adapters/source.ts'
import { Hub, plugin } from '../src/hub/index.ts'
import { pair, TransportNode, type Node, type TransportHost } from '../src/node/index.ts'
import { Wire } from '../src/protocols/topics/index.ts'

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

type Beat = { t: 'ping' | 'pong' } | { t: 'say'; body: string }
const beat = {
  beat: (kind: 'ping' | 'pong') => ({ t: kind }) as Beat,
  read: (msg: Beat) => (msg.t === 'ping' || msg.t === 'pong' ? msg.t : null),
}

describe('TransportNode', () => {
  it('holds inbound until someone listens', () => {
    let host!: TransportHost<string>
    const node = new TransportNode<string>((h) => ((host = h), { send: () => true }))
    host.deliver('early')

    const seen: string[] = []
    node.listen((msg) => seen.push(msg))
    expect(seen).toEqual(['early'])
  })

  it('drops the oldest past the bound, and reports it', () => {
    const dropped: string[] = []
    let host!: TransportHost<string>
    const node = new TransportNode<string>((h) => ((host = h), { send: () => true }), {
      pending: 2,
      onDrop: (msg) => dropped.push(msg),
    })
    host.deliver('a')
    host.deliver('b')
    host.deliver('c')

    const seen: string[] = []
    node.listen((msg) => seen.push(msg))
    expect(dropped).toEqual(['a'])
    expect(seen).toEqual(['b', 'c'])
  })

  it('releases once and goes inert, whoever closed it', () => {
    let released = 0
    let host!: TransportHost<string>
    const node = new TransportNode<string>((h) => ((host = h), { send: () => true, release: () => released++ }))

    let gone = 0
    node.closed(() => gone++)
    node.close()
    host.shut()
    node.close()

    expect(released).toBe(1)
    expect(gone).toBe(1)
    expect(node.send('x')).toBe(false)
  })

  it('survives a transport that is dead before it hands anything back', () => {
    const node = new TransportNode<string>((host) => (host.shut(), { send: () => true }))
    let gone = false
    node.closed(() => (gone = true))
    expect(gone).toBe(true)
  })
})

describe('source', () => {
  it('owns what it produced', async () => {
    const hub = new Hub<string>([])
    let offer!: (node: Node<string>) => void
    const feed = source<string>((host) => void (offer = host.offer))

    const stop = feed(hub)
    const [x, y] = pair<string>()
    offer(x)
    expect(hub.peers.length).toBe(1)

    let closed = false
    y.closed(() => (closed = true))
    stop()
    await settle()

    expect(hub.peers.length).toBe(0)
    expect(closed).toBe(true)
  })

  it('closes a node offered after it stopped', () => {
    const hub = new Hub<string>([])
    let offer!: (node: Node<string>) => void
    const stop = source<string>((host) => void (offer = host.offer))(hub)
    stop()

    const [x, y] = pair<string>()
    let closed = false
    y.closed(() => (closed = true))
    offer(x)

    expect(closed).toBe(true)
    expect(hub.peers.length).toBe(0)
  })
})

describe('ReconnectNode', () => {
  it('retries with backoff and flushes what was held', async () => {
    const clock = new FakeClock()
    const states: string[] = []
    const seen: string[] = []
    let attempts = 0
    let far: Node<string> | null = null

    const node = new ReconnectNode<string>(
      () => {
        attempts += 1
        const [mine, theirs] = pair<string>()
        if (attempts < 3) mine.close()
        else {
          far = theirs
          theirs.listen((msg) => seen.push(msg))
          theirs.send('hello')
        }
        return mine
      },
      { clock, backoff: { base: 100 }, buffer: 4, onState: (state) => states.push(state) },
    )

    expect(node.send('queued')).toBe(true)
    clock.advance(100)
    await settle()
    clock.advance(200)
    await settle()

    expect(node.state).toBe('open')
    expect(attempts).toBe(3)
    expect(states).toEqual(['retrying', 'connecting', 'retrying', 'connecting', 'open'])
    expect(seen).toEqual(['queued'])
    expect(far).not.toBeNull()
  })

  it('abandons an attempt that says nothing', async () => {
    const clock = new FakeClock()
    const errors: unknown[] = []
    let attempts = 0

    new ReconnectNode<string>(
      () => {
        attempts += 1
        return pair<string>()[0]
      },
      { clock, timeout: 1_000, backoff: { base: 100 }, onError: (err) => errors.push(err) },
    )

    expect(attempts).toBe(1)
    clock.advance(1_000)
    await settle()
    expect(errors).toHaveLength(1)
    clock.advance(100)
    expect(attempts).toBe(2)
  })

  it('re-announces subscriptions across a reconnect, with no liveness concept anywhere', async () => {
    const clock = new FakeClock()
    const server = new Wire<{ tick: number }>({ name: 'app' })
    const client = new Wire<{ tick: number }>({ name: 'app' })

    // A fresh transport into the same server on every attempt.
    const connect = () => {
      const [mine, theirs] = pair<unknown>()
      server.add(theirs)
      return mine
    }

    const wire = new ReconnectNode<unknown>(connect, { clock, backoff: { base: 100 }, timeout: 0 })
    client.add(wire)
    await settle()

    const seen: number[] = []
    client.topic('tick').listen((n) => seen.push(n))
    await settle()

    server.topic('tick').send(1)
    await settle()
    expect(seen).toEqual([1])

    // Cut the wire. The server sees a peer leave; the client's node survives.
    server.peers[0]!.close()
    await settle()
    clock.advance(100)
    await settle()

    server.topic('tick').send(2)
    await settle()
    expect(seen).toEqual([1, 2])
  })
})

describe('keepalive', () => {
  it('answers a ping without the protocol seeing it', async () => {
    const [x, y] = pair<Beat>()
    const clock = new FakeClock()
    const node = keepalive(x, { ...beat, clock, interval: 1_000, timeout: 500 })

    const seen: Beat[] = []
    node.listen((msg) => seen.push(msg))
    const out: Beat[] = []
    y.listen((msg) => out.push(msg))

    y.send({ t: 'ping' })
    y.send({ t: 'say', body: 'hi' })
    await settle()

    expect(seen).toEqual([{ t: 'say', body: 'hi' }])
    expect(out).toEqual([{ t: 'pong' }])
  })

  it('closes when nothing comes back', async () => {
    const [x] = pair<Beat>()
    const clock = new FakeClock()
    const node = keepalive(x, { ...beat, clock, interval: 1_000, timeout: 500 })

    let gone = false
    node.closed(() => (gone = true))

    clock.advance(1_000)
    await settle()
    expect(gone).toBe(false)

    clock.advance(500)
    expect(gone).toBe(true)
  })

  it('counts any inbound message as a sign of life', async () => {
    const [x, y] = pair<Beat>()
    const clock = new FakeClock()
    const node = keepalive(x, { ...beat, clock, interval: 1_000, timeout: 500 })

    let gone = false
    node.closed(() => (gone = true))

    clock.advance(1_000)
    y.send({ t: 'say', body: 'still here' })
    await settle()
    clock.advance(500)

    expect(gone).toBe(false)
  })
})

describe('fromPostMessage', () => {
  const stub = () => {
    const listeners = new Set<(event: { data: unknown }) => void>()
    const sent: unknown[] = []
    let terminated = false
    const target: PostTarget = {
      postMessage: (msg) => void sent.push(msg),
      addEventListener: (_type, fn) => void listeners.add(fn),
      removeEventListener: (_type, fn) => void listeners.delete(fn),
      terminate: () => void (terminated = true),
    }
    return { target, sent, listeners, terminated: () => terminated }
  }

  it('carries both directions and owns a target it can terminate', () => {
    const { target, sent, listeners, terminated } = stub()
    const node = fromPostMessage<string>(target)

    const seen: string[] = []
    node.listen((msg) => seen.push(msg))
    for (const fn of listeners) fn({ data: 'in' })
    node.send('out')

    expect(seen).toEqual(['in'])
    expect(sent).toEqual(['out'])

    node.close()
    expect(terminated()).toBe(true)
    expect(listeners.size).toBe(0)
  })

  it('treats an unclonable payload as a bad message, not a dead port', () => {
    const { target } = stub()
    const errors: unknown[] = []
    target.postMessage = () => {
      throw new Error('DataCloneError')
    }
    const node = fromPostMessage<string>(target, { onError: (err) => errors.push(err) })

    let gone = false
    node.closed(() => (gone = true))

    expect(node.send('nope')).toBe(false)
    expect(errors).toHaveLength(1)
    expect(gone).toBe(false)
  })
})

describe('Sockets', () => {
  it('turns socket callbacks into peers', async () => {
    type Fake = Socket & { out: string[] }
    const make = (): Fake => {
      const out: string[] = []
      return { out, send: ((data: string) => out.push(data)) as Socket['send'], close: () => {} }
    }

    const wire = new Sockets<Fake, { body: string }>({ meta: () => ({ name: 'socket' }) })
    const seen: string[] = []
    const hub = new Hub<{ body: string }>([plugin(() => ({ data: (_peer, msg) => void seen.push(msg.body) }))])
    wire.source(hub)

    const socket = make()
    wire.open(socket)
    expect(hub.peers.length).toBe(1)
    expect(hub.peers[0]!.meta['name']).toBe('socket')

    wire.message(socket, JSON.stringify({ body: 'hi' }))
    expect(seen).toEqual(['hi'])

    hub.peers[0]!.send({ body: 'back' })
    expect(socket.out).toEqual([JSON.stringify({ body: 'back' })])

    wire.close(socket)
    expect(hub.peers.length).toBe(0)
  })
})
