import { describe, expect, it } from 'vitest'

import { hub, type Node } from '../core.ts'
import { pair } from '../node.ts'
import { topics } from '../protocols/topics.ts'
import { defineNode, type Host } from './define.ts'
import { fakeClock } from './clock.ts'
import { fromPostMessage, type PostTarget } from './post-message.ts'
import { keepalive } from './keepalive.ts'
import { reconnect } from './reconnect.ts'
import { sockets, type Socket } from './sockets.ts'
import { source } from './source.ts'

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

type Beat = { t: 'ping' | 'pong' } | { t: 'say'; body: string }
const beat = {
  beat: (kind: 'ping' | 'pong') => ({ t: kind }) as Beat,
  read: (msg: Beat) => (msg.t === 'ping' || msg.t === 'pong' ? msg.t : null),
}

describe('defineNode', () => {
  it('holds inbound until someone listens', () => {
    let host!: Host<string>
    const node = defineNode<string>((h) => ((host = h), { send: () => true }))
    host.deliver('early')

    const seen: string[] = []
    node.listen((msg) => seen.push(msg))
    expect(seen).toEqual(['early'])
  })

  it('drops the oldest past the bound, and reports it', () => {
    const dropped: string[] = []
    let host!: Host<string>
    const node = defineNode<string>((h) => ((host = h), { send: () => true }), {
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
    let host!: Host<string>
    const node = defineNode<string>((h) => ((host = h), { send: () => true, release: () => released++ }))

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
    const node = defineNode<string>((host) => (host.shut(), { send: () => true }))
    let gone = false
    node.closed(() => (gone = true))
    expect(gone).toBe(true)
  })
})

describe('source', () => {
  it('owns what it produced', async () => {
    const h = hub<string>([])
    let offer!: (node: Node<string>) => void
    const feed = source<string>((host) => void (offer = host.offer))

    const stop = feed(h)
    const [x, y] = pair<string>()
    offer(x)
    expect(h.peers.length).toBe(1)

    let closed = false
    y.closed(() => (closed = true))
    stop()
    await settle()

    expect(h.peers.length).toBe(0)
    expect(closed).toBe(true)
  })

  it('closes a node offered after it stopped', () => {
    const h = hub<string>([])
    let offer!: (node: Node<string>) => void
    const stop = source<string>((host) => void (offer = host.offer))(h)
    stop()

    const [x, y] = pair<string>()
    let closed = false
    y.closed(() => (closed = true))
    offer(x)

    expect(closed).toBe(true)
    expect(h.peers.length).toBe(0)
  })
})

describe('reconnect', () => {
  it('retries with backoff and flushes what was held', async () => {
    const clock = fakeClock()
    const states: string[] = []
    const seen: string[] = []
    let attempts = 0
    let far: Node<string> | null = null

    const node = reconnect<string>(
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
    const clock = fakeClock()
    const errors: unknown[] = []
    let attempts = 0

    reconnect<string>(
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
    const clock = fakeClock()
    const app = topics<{ tick: number }>({ name: 'app' })

    const server = app.node()
    const client = app.node()

    // A fresh transport into the same server on every attempt.
    const connect = () => {
      const [mine, theirs] = pair<unknown>()
      server.add(theirs)
      return mine
    }

    const wire = reconnect<unknown>(connect, { clock, backoff: { base: 100 }, timeout: 0 })
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
    const clock = fakeClock()
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
    const clock = fakeClock()
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
    const clock = fakeClock()
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

describe('sockets', () => {
  it('turns socket callbacks into peers', async () => {
    type Fake = Socket & { out: string[] }
    const make = (): Fake => {
      const out: string[] = []
      return { out, send: ((data: string) => out.push(data)) as Socket['send'], close: () => {} }
    }

    const wire = sockets<Fake, { body: string }>({ meta: () => ({ name: 'socket' }) })
    const seen: string[] = []
    const h = hub<{ body: string }>([() => ({ data: (_peer, msg) => void seen.push(msg.body) })])
    wire.source(h)

    const socket = make()
    wire.open(socket)
    expect(h.peers.length).toBe(1)
    expect(h.peers[0]!.meta['name']).toBe('socket')

    wire.message(socket, JSON.stringify({ body: 'hi' }))
    expect(seen).toEqual(['hi'])

    h.peers[0]!.send({ body: 'back' })
    expect(socket.out).toEqual([JSON.stringify({ body: 'back' })])

    wire.close(socket)
    expect(h.peers.length).toBe(0)
  })
})
