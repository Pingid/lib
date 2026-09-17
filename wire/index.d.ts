/**
 * A hub is peers and a hook chain; `interest` and `directory` are the routing
 * bookkeeping nobody should write twice. Protocols are not part of this — see
 * `src/protocols/` for two that share the machinery and nothing else.
 *
 * @example
 * ```ts
 * const wants = interest<Frame, string>({
 *   read: (msg) => (msg.t === 'want' ? { key: msg.c, on: msg.on } : null),
 *   write: ({ key, on }) => ({ t: 'want', c: key, on }),
 * })
 * const routes: Plugin<Frame> = () => ({
 *   data: (peer, msg, next) => {
 *     if (msg.t !== 'pub') return next(msg)
 *     for (const to of wants.match(msg.c, peer)) to.send(msg)
 *   },
 * })
 *
 * const h = hub<Frame>([wants, routes])
 * const here = participant(h)
 * h.add(tagged(socket, 'app'))
 * here.send({ t: 'want', c: 'tick', on: true })
 * ```
 */
export { hub } from './core.js';
export type { Hooks, Hub, HubOptions, Meta, Node, Peer, Plugin, Unsub } from './core.js';
export { mapNode, pair, participant, tagged } from './node.js';
export { interest } from './interest.js';
export type { Declaration, Interest, InterestOptions } from './interest.js';
export { directory } from './directory.js';
export type { Directory, DirectoryOptions } from './directory.js';
