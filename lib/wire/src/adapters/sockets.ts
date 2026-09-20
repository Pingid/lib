import type { Meta } from '../core.ts'
import { defineNode, type Host } from './define.ts'
import { source, type Source } from './source.ts'

/**
 * One `Source` for every server whose socket API is a handful of callbacks:
 * `ws`, Bun, Deno, a plain TCP server.
 *
 * @example
 * ```ts
 * const wire = sockets<WebSocket, Frame>()
 * wss.on('connection', (ws) => {
 *   wire.open(ws)
 *   ws.on('message', (data) => wire.message(ws, data))
 *   ws.on('close', () => wire.close(ws))
 * })
 * wire.source(hub)
 * ```
 */

/**
 * Enough of a socket to send on and hang up.
 *
 * @example
 * ```ts
 * const socket: Socket = { send: (data) => ws.send(data as string), close: () => ws.close() }
 * ```
 */
export interface Socket {
  send(data: never): unknown
  close(): unknown
}

/**
 * Defaults to JSON text frames.
 *
 * @example
 * ```ts
 * sockets<WebSocket, Frame>({
 *   encode: (msg) => `${JSON.stringify(msg)}\n`,
 *   decode: (data) => JSON.parse(String(data)) as Frame,
 *   meta: (ws) => ({ name: ws.url }),
 * })
 * ```
 */
export interface SocketsOptions<S, T> {
  encode?: ((msg: T) => unknown) | undefined
  decode?: ((data: unknown) => T) | undefined
  meta?: ((socket: S) => Meta) | undefined
  onError?: ((err: unknown) => void) | undefined
}

/**
 * Wire the four methods straight to whatever the platform calls its socket events.
 *
 * @example
 * ```ts
 * const wire = sockets<Socket, Frame>()
 * server.on('connection', (socket) => wire.open(socket, { name: socket.remoteAddress }))
 * ```
 */
export interface Sockets<S, T> {
  open(socket: S, meta?: Meta): void
  message(socket: S, data: unknown): void
  close(socket: S): void
  /**
   * Reported even for a socket with no node, which is what a failed upgrade looks like.
   *
   * @example
   * ```ts
   * ws.on('error', (err) => wire.error(ws, err))
   * ```
   */
  error(socket: S, err: unknown): void
  readonly source: Source<T>
}

type Event<S> =
  | { kind: 'open'; socket: S; meta: Meta | undefined }
  | { kind: 'message'; socket: S; data: unknown }
  | { kind: 'close'; socket: S }
  | { kind: 'error'; socket: S; err: unknown }

/**
 * Events are relayed rather than offered directly, so a socket connecting before
 * anything serves the source reads as "nobody was listening" instead of a crash.
 *
 * @example
 * ```ts
 * const wire = sockets<WebSocket, Frame>({ meta: (ws) => ({ name: ws.url }) })
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
export const sockets = <S extends Socket, T>(opts: SocketsOptions<S, T> = {}): Sockets<S, T> => {
  const encode = opts.encode ?? ((msg: T) => JSON.stringify(msg))
  const decode = opts.decode ?? ((data: unknown) => JSON.parse(String(data)) as T)
  const sinks = new Set<(event: Event<S>) => void>()
  const emit = (event: Event<S>) => {
    for (const fn of [...sinks]) fn(event)
  }

  return {
    open: (socket, meta) => emit({ kind: 'open', socket, meta }),
    message: (socket, data) => emit({ kind: 'message', socket, data }),
    close: (socket) => emit({ kind: 'close', socket }),
    error: (socket, err) => emit({ kind: 'error', socket, err }),
    source: source<T>((host) => {
      const hosts = new WeakMap<Socket, Host<T>>()

      const fn = (event: Event<S>) => {
        if (event.kind === 'open') {
          const node = defineNode<T>(
            (h) => {
              hosts.set(event.socket, h)
              return {
                send: (msg) => {
                  try {
                    ;(event.socket.send as (data: unknown) => unknown)(encode(msg))
                    return true
                  } catch (err) {
                    h.fail(err)
                    return false
                  }
                },
                close: () => void event.socket.close(),
                // Only its own entry: a second `open` must not be unrouted by the first close.
                release: () => void (hosts.get(event.socket) === h && hosts.delete(event.socket)),
              }
            },
            { onError: opts.onError },
          )
          host.offer(node, { ...opts.meta?.(event.socket), ...event.meta })
          return
        }

        const h = hosts.get(event.socket)
        if (event.kind === 'error') return (h ?? host).fail(event.err)
        if (!h) return
        if (event.kind === 'close') return h.shut()
        try {
          h.deliver(decode(event.data))
        } catch (err) {
          h.fail(err)
        }
      }

      sinks.add(fn)
      return () => void sinks.delete(fn)
    }, opts),
  }
}
