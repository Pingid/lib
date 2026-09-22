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

import type { Meta } from '../hub/index.ts'
import { TransportNode, type TransportHost } from '../node/transport.ts'
import { source, type Source } from './source.ts'

// ------------------------------------------------------------------
// Socket
// ------------------------------------------------------------------
/** Enough of a socket to send on and hang up */
export interface Socket {
  send(data: never): unknown
  close(): unknown
}

// ------------------------------------------------------------------
// SocketsOptions
// ------------------------------------------------------------------
/** Defaults to JSON text frames */
export interface SocketsOptions<S, T, M extends Meta = Meta> {
  encode?: ((msg: T) => unknown) | undefined
  decode?: ((data: unknown) => T) | undefined
  meta?: ((socket: S) => M) | undefined
  onError?: ((err: unknown) => void) | undefined
}

// ------------------------------------------------------------------
// SocketEvent
// ------------------------------------------------------------------
type SocketEvent<S> = { kind: 'open'; socket: S; meta: Meta | undefined } | { kind: 'message'; socket: S; data: unknown } | { kind: 'close'; socket: S } | { kind: 'error'; socket: S; err: unknown }

// ------------------------------------------------------------------
// Sockets
// ------------------------------------------------------------------
/**
 * One Source for every server whose socket API is a handful of callbacks: ws, Bun, Deno, a
 * plain TCP server. Events are relayed rather than offered directly, so a socket connecting
 * before anything serves the source reads as "nobody was listening" instead of a crash.
 *
 * @example
 * ```ts
 * const wire = new Sockets<WebSocket, Frame>({ meta: (ws) => ({ name: ws.url }) })
 * const stop = wire.source(hub)
 *
 * wss.on('connection', (ws) => {
 *   wire.open(ws)
 *   ws.on('message', (data) => wire.message(ws, data))
 *   ws.on('close', () => wire.close(ws))
 *   ws.on('error', (err) => wire.error(ws, err))
 * })
 * ```
 */
export class Sockets<S extends Socket, T, M extends Meta = Meta> {
  readonly #options: SocketsOptions<S, T, M>
  readonly #encode: (msg: T) => unknown
  readonly #decode: (data: unknown) => T
  readonly #sinks: Set<(event: SocketEvent<S>) => void>
  readonly #source: Source<T>
  constructor(options: SocketsOptions<S, T, M> = {}) {
    this.#options = options
    this.#encode = options.encode ?? ((msg: T) => JSON.stringify(msg))
    this.#decode = options.decode ?? ((data: unknown) => JSON.parse(String(data)) as T)
    this.#sinks = new Set<(event: SocketEvent<S>) => void>()
    this.#source = source<T>((host) => {
      const hosts = new WeakMap<Socket, TransportHost<T>>()
      const fn = (event: SocketEvent<S>) => {
        if (event.kind === 'open') return host.offer(this.#node(event.socket, hosts), { ...this.#options.meta?.(event.socket), ...event.meta })
        const near = hosts.get(event.socket)
        if (event.kind === 'error') return (near ?? host).fail(event.err)
        if (!near) return
        if (event.kind === 'close') return near.shut()
        try {
          near.deliver(this.#decode(event.data))
        } catch (err) {
          near.fail(err)
        }
      }
      this.#sinks.add(fn)
      return () => void this.#sinks.delete(fn)
    }, options)
  }
  // ----------------------------------------------------------------
  // Events
  // ----------------------------------------------------------------
  /** A socket connected */
  public open(socket: S, meta?: M): void {
    this.#emit({ kind: 'open', socket, meta })
  }
  /** A socket carried a frame */
  public message(socket: S, data: unknown): void {
    this.#emit({ kind: 'message', socket, data })
  }
  /** A socket hung up */
  public close(socket: S): void {
    this.#emit({ kind: 'close', socket })
  }
  /** Reported even for a socket with no node, which is what a failed upgrade looks like */
  public error(socket: S, err: unknown): void {
    this.#emit({ kind: 'error', socket, err })
  }
  // ----------------------------------------------------------------
  // Source
  // ----------------------------------------------------------------
  /** The Source that turns these events into peers */
  public get source(): Source<T> {
    return this.#source
  }
  // ----------------------------------------------------------------
  // Internal
  // ----------------------------------------------------------------
  #node(socket: S, hosts: WeakMap<Socket, TransportHost<T>>) {
    return new TransportNode<T>(
      (host) => {
        hosts.set(socket, host)
        return {
          send: (msg) => {
            try {
              ;(socket.send as (data: unknown) => unknown)(this.#encode(msg))
              return true
            } catch (err) {
              host.fail(err)
              return false
            }
          },
          close: () => void socket.close(),
          // Only its own entry: a second open must not be unrouted by the first close.
          release: () => void (hosts.get(socket) === host && hosts.delete(socket)),
        }
      },
      { onError: this.#options.onError },
    )
  }
  #emit(event: SocketEvent<S>): void {
    for (const fn of [...this.#sinks]) fn(event)
  }
}
