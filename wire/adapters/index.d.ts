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
export { fakeClock, systemClock } from './clock.js';
export type { Clock, FakeClock } from './clock.js';
export { defineNode } from './define.js';
export type { DefineOptions, Host, Transport } from './define.js';
export { source } from './source.js';
export type { Adder, Source, SourceHost, SourceOptions } from './source.js';
export { reconnect } from './reconnect.js';
export type { Connector, Reconnect, ReconnectOptions, State } from './reconnect.js';
export { keepalive } from './keepalive.js';
export type { KeepaliveOptions } from './keepalive.js';
export { fromPostMessage } from './post-message.js';
export type { PostMessageOptions, PostTarget } from './post-message.js';
export { sockets } from './sockets.js';
export type { Socket, Sockets, SocketsOptions } from './sockets.js';
