import { UpstreamTarget } from './upstream.cjs';
import { ProxyContext } from './context.cjs';
export type ProxyHandler = (request: Request, context?: ProxyContext) => Promise<Response>;
/**
 * Build a handler that forwards a request to one upstream and returns its
 * response, rewritten.
 *
 * You match the path; this owns a single upstream. Bodies stream both ways —
 * nothing is buffered — and redirects are passed through rather than followed,
 * since the client is the one that has to see them.
 *
 * `context` carries what only the runtime knows: `clientIp` from
 * `server.requestIP()` / `info.remoteAddr` / `socket.remoteAddress`, and
 * `trustedPeer` when the immediate peer is a proxy you control. Without the
 * latter, the client's own `X-Forwarded-*` are discarded rather than extended,
 * because anyone can send them.
 */
export declare const proxy: (target: UpstreamTarget) => ProxyHandler;
