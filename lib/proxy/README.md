# @pingid/lib/proxy

A reverse proxy over the fetch API. One handler per upstream, plus composable
policies for headers, cookies and provenance.

```ts
import { proxy } from '@pingid/lib/proxy'

const api = proxy({ origin: 'http://app:3000', stripPrefix: '/api' })

Bun.serve({
  fetch: (request, server) =>
    new URL(request.url).pathname.startsWith('/api')
      ? api(request, { clientIp: server.requestIP(request)?.address })
      : new Response('not found', { status: 404 }),
})
```

`proxy()` returns `(request, context?) => Promise<Response>`. It matches nothing —
you decide which requests reach it — and owns a single upstream.

## What it does on the way through

Out to the upstream: drops hop-by-hop headers (including the ones `Connection`
names), drops `Host` and `Content-Length` since fetch derives both, records the
client in `X-Forwarded-*`, and points `Referer`/`Origin` at the upstream so an app
checking them for CSRF sees its own origin.

Back to the client: drops `Content-Encoding`/`Content-Length`, because fetch has
already decoded the body and the length no longer counts what is being sent; then
rewrites `Location` back under the mount point, strips the cookie `Domain`, re-roots
the cookie `Path` under the mount, and drops `Secure` (with `SameSite=None` → `Lax`)
when the client's own leg is not TLS. Set `rewriteBack: false` to keep the last group.

The upstream's `Content-Security-Policy`, `X-Frame-Options` and friends are left
alone — they are the upstream's to set. Reach for `excludeTypes('SECURITY')` if you
are embedding it and need them gone.

## Context

The second argument carries what only the runtime knows:

```ts
{ clientIp?: string, trustedPeer?: boolean, clientTls?: boolean, [key: string]: unknown }
```

`clientIp` comes from `server.requestIP()` (Bun), `info.remoteAddr` (Deno) or
`socket.remoteAddress` (Node). Without `trustedPeer`, a client's own `X-Forwarded-*`
and `Via` are discarded rather than extended — anyone can send them — and its
`X-Forwarded-Proto` is not believed when deciding whether cookies may stay `Secure`.

Every policy step receives the context as its second argument, so per-request
decisions stay per-request even though the policy is built once.

## Policies

```ts
import { Policy, proxy } from '@pingid/lib/proxy'

const handler = proxy({
  origin: 'http://app:3000',
  timeout: 5_000, // time to first byte; exceeded, a 504
  request: Policy.request().readOnly(),
  response: Policy.response().maskServerErrors(),
})
```

`Policy.request()`, `.response()`, `.header()` and `.setCookie()` each build a chain
that runs in the order you wrote it. They are mutable builders: build one per
upstream at startup, not per request.

## Errors

A `ProxyError` carries a status and knows its own `.response`. The handler converts
one into that response — an unreachable upstream becomes a 502, a timeout a 504, and
a request `readOnly()` refuses a 405. A client that hangs up mid-flight is not a
gateway failure, so its `AbortError` is rethrown untouched. Pass `onError` to take
over the conversion.
