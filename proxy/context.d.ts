/**
 * Per-request facts the runtime knows and a policy cannot derive.
 *
 * Every policy step receives this as its second argument, because the things in
 * it — who the peer is, whether to believe them — are true of *one* request, not
 * of the policy. A policy is built once at startup and applied many times;
 * anything captured in its closure is frozen for the life of the process.
 *
 * The index signature makes this an open bag: stash whatever your own steps need
 * (a tenant, an auth result, a request id). `noPropertyAccessFromIndexSignature`
 * means those read as `context['tenant']`, not `context.tenant` — only the
 * declared members get dot access.
 *
 * The handler shallow-copies the caller's context once per request, so a step
 * may write to it freely without leaking into the next request.
 */
export interface ProxyContext {
    /** Peer address, from the runtime — Deno's `info.remoteAddr`, Bun's `server.requestIP()`, Node's `socket.remoteAddress`. */
    clientIp?: string;
    /** True when the immediate peer is a proxy you control, so its `X-Forwarded-*` can be trusted. */
    trustedPeer?: boolean;
    /** Did the *client's* own leg use TLS? Filled in by the handler; see `isSecure`. */
    clientTls?: boolean;
    [key: string]: unknown;
}
