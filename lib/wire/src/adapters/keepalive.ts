/*--------------------------------------------------------------------------

@pingid/lib-wire/adapters

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

import type { Node, Unsub } from '../node/node.ts'
import { TransportNode } from '../node/transport.ts'
import { systemClock, type Clock } from './clock.ts'

// ------------------------------------------------------------------
// KeepaliveOptions
// ------------------------------------------------------------------
/** Beats are yours, so the protocol above never sees them */
export interface KeepaliveOptions<T> {
  /** Writes a beat as a message of your own */
  beat(kind: 'ping' | 'pong'): T
  /** Null when the message is not a beat, and so belongs to whoever is listening */
  read(msg: T): 'ping' | 'pong' | null
  /** ms between pings. Default 5000. */
  interval?: number | undefined
  /** ms to wait for any answer before declaring the peer gone. 0 keeps pinging. Default 2000. */
  timeout?: number | undefined
  clock?: Clock | undefined
}

// ------------------------------------------------------------------
// Keepalive
// ------------------------------------------------------------------
/**
 * Liveness for transports that cannot report it — a MessagePort whose far side was
 * terminated looks perfectly healthy. Symmetric: both ends ping, both answer, and any
 * inbound message counts as a sign of life.
 *
 * @example
 * ```ts
 * const clock = new FakeClock()
 * const node = keepalive(inner, { beat, read, interval: 1_000, timeout: 500, clock })
 *
 * clock.advance(1_000) // ping sent
 * clock.advance(500) //   nothing came back, so node closes
 * ```
 */
export function keepalive<T>(node: Node<T>, options: KeepaliveOptions<T>): Node<T> {
  const clock = options.clock ?? systemClock
  const interval = options.interval ?? 5_000
  const timeout = options.timeout ?? 2_000

  return new TransportNode<T>((host) => {
    let nextPing: Unsub | null = null
    let deadline: Unsub | null = null

    const alive = () => {
      deadline?.()
      deadline = null
    }

    const ping = () => {
      node.send(options.beat('ping'))
      if (timeout > 0 && !deadline) deadline = clock.timer(() => host.shut(), timeout)
      nextPing = clock.timer(ping, interval)
    }

    const off = node.listen((msg) => {
      // Anything at all means the far side is there.
      alive()
      const kind = options.read(msg)
      if (kind === null) return host.deliver(msg)
      if (kind === 'ping') node.send(options.beat('pong'))
    })
    const offClosed = node.closed(() => host.shut())
    if (interval > 0) nextPing = clock.timer(ping, interval)

    return {
      send: (msg) => node.send(msg),
      close: () => node.close(),
      release: () => {
        nextPing?.()
        deadline?.()
        off()
        offClosed()
      },
    }
  })
}
