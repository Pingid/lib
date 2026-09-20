/**
 * Putting a hub on a real transport.
 *
 * Two kinds of thing: combinators that turn a transport into a better one
 * (`defineNode`, `reconnect`, `keepalive`), and sources that feed a hub peers
 * over time (`source`, `sockets`).
 *
 * @example
 * ```ts
 * const node = keepalive(
 *   reconnect<Frame>(() => fromPostMessage(new Worker(url)), { buffer: 32 }),
 *   { beat: (kind) => ({ t: kind }), read: (msg) => (msg.t === 'ping' || msg.t === 'pong' ? msg.t : null) },
 * )
 * hub.add(node, { name: 'worker' })
 * ```
 */

export { fakeClock, systemClock } from './clock.ts'
export type { Clock, FakeClock } from './clock.ts'

export { defineNode } from './define.ts'
export type { DefineOptions, Host, Transport } from './define.ts'

export { source } from './source.ts'
export type { Adder, Source, SourceHost, SourceOptions } from './source.ts'

export { reconnect } from './reconnect.ts'
export type { Connector, Reconnect, ReconnectOptions, State } from './reconnect.ts'

export { keepalive } from './keepalive.ts'
export type { KeepaliveOptions } from './keepalive.ts'

export { fromPostMessage } from './post-message.ts'
export type { PostMessageOptions, PostTarget } from './post-message.ts'

export { sockets } from './sockets.ts'
export type { Socket, Sockets, SocketsOptions } from './sockets.ts'
