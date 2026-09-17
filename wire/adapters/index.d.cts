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
export { fakeClock, systemClock } from './clock.cjs';
export type { Clock, FakeClock } from './clock.cjs';
export { defineNode } from './define.cjs';
export type { DefineOptions, Host, Transport } from './define.cjs';
export { source, adders } from './source.cjs';
export type { Adder, Source, SourceHost, SourceOptions } from './source.cjs';
export { reconnect } from './reconnect.cjs';
export type { Connector, Reconnect, ReconnectOptions, State } from './reconnect.cjs';
export { keepalive } from './keepalive.cjs';
export type { KeepaliveOptions } from './keepalive.cjs';
export { fromPostMessage } from './post-message.cjs';
export type { PostMessageOptions, PostTarget } from './post-message.cjs';
export { sockets } from './sockets.cjs';
export type { Socket, Sockets, SocketsOptions } from './sockets.cjs';
