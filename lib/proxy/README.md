# @pingid/lib/proxy

A reverse proxy as three small functions over the fetch API: **match** a path, **resolve** an upstream, **forward** the request. No server, no runtime lock-in, no service discovery — you bring those.

```ts
import { createProxy } from '@pingid/lib/proxy'

Bun.serve({
  fetch: createProxy({
    mounts: [{ pattern: '/proxy/:name', upstream: ({ name }) => registry.get(name) }],
  }),
})
```

## What it does

Proxying an app under a path prefix is mostly a matter of undoing the origin it thinks it's on:

- **Requests** lose their hop-by-hop headers, `Host` and `Content-Length`; `Referer` and `Origin` are pointed back at the upstream; `x-forwarded-host`, `-proto` and `-prefix` tell the upstream where it really lives.
- **Responses** lose `X-Frame-Options`, CSP, HSTS, `Referrer-Policy` and `Alt-Svc` — each one is the upstream refusing to be embedded, or making a claim about _your_ origin. `Content-Encoding`/`-Length` go with them, since fetch already decoded the body.
- **`Set-Cookie`** loses a `Domain` written for the upstream's host, loses `Secure` when the client's leg isn't TLS, and downgrades `SameSite=None` it can no longer honour.
- **`Location`** comes back under the prefix when it stays on the upstream, and is left alone when it doesn't — a login provider on another host is exactly what an absolute `Location` is for.

Bodies stream both ways. Redirects are passed to the client, not followed.

## The primitives

### `match(pattern, pathname)`

Matches a _prefix_ of the path. Literal and `:named` segments; the tail is handed back verbatim, so a trailing slash survives.

```ts
match('/proxy/:name', '/proxy/web/assets/app.js')
// { prefix: "/proxy/web", path: "/assets/app.js", params: { name: "web" } }
```

### `route(prefix, upstream, secure?)` → `Route`

The only piece of state. `prefix` is where it's mounted, `upstream` is where it goes (a path here roots the upstream under a sub-path), `secure` is whether the _client's_ leg used TLS — `isSecure(request)` works that out, trusting an inbound `x-forwarded-proto`.

### `forward(request, route, options?)` → `Response`

Takes the path from the request minus `route.prefix`, so a route and a request are all it needs.

```ts
forward(request, route, {
  filters: { cookies: ['session', /^_ga/] }, // names not passed upstream
  headers: { 'x-forwarded-for': ip }, // applied last
  fetch: pooledFetch, // substitute transport
})
```

Throws `ProxyError` (with a ready `.response`) when the upstream can't be reached. A client that hangs up mid-flight aborts instead, and its `AbortError` is rethrown untouched.

### `createProxy({ mounts, notFound, ...forwardOptions })`

`match` and `forward` in a loop, returning a plain `(request) => Promise<Response>`. A mount's `upstream` is either a value or a resolver; a resolver that returns nothing **declines** the match and the next mount gets a look, so it doubles as a guard.

Reach past it the moment your dispatch needs something it doesn't do — it's fifty lines and no privileged access.

### Lower level

`toUpstream(route, path, search?)` and `toProxy(route, pathname)` are the URL mapping in both directions (`toUpstream` normalises `..` away, so a client can't climb out of a base path). `strip`, `requestHeaders`, `responseHeaders`, `rewriteCookie` and `rewriteLocation` are the pieces `forward` is made of, each usable on its own.

## Bring your own discovery

`Resolver` is the whole extension point. Docker, as an example — nothing about it is in the library:

```ts
import Docker from 'dockerode'
import os from 'node:os'
import { createProxy, type Resolver } from '@pingid/lib/proxy'

const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET })
const self = docker.getContainer(os.hostname())

/** Peers on any network we're attached to, by container name. */
const peers = async () => {
  const { NetworkSettings } = await self.inspect()
  const found = new Map<string, string>()
  await Promise.all(
    Object.values(NetworkSettings.Networks).map(async ({ NetworkID }) => {
      const { Containers } = await docker.getNetwork(NetworkID).inspect()
      for (const [id, { Name }] of Object.entries(Containers ?? {})) found.set(Name, id)
    }),
  )
  return found
}

const byLabel: Resolver = async ({ name }) => {
  const id = (await peers()).get(name)
  if (!id) return
  const port = (await docker.getContainer(id).inspect()).Config.Labels['com.proxy.port']
  return port && `http://${name}:${port}`
}

Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  hostname: process.env.HOST ?? '0.0.0.0',
  fetch: createProxy({ mounts: [{ pattern: '/proxy/:name', upstream: byLabel }] }),
})
```

Cache `peers()` behind a short TTL if you're proxying anything busy — every request otherwise costs two Docker round trips.

## Not included

WebSocket upgrades, body rewriting for apps that hardcode absolute paths, retries, and load balancing across several upstreams. A `Resolver` plus a substitute `fetch` covers the last two without the library knowing.

## Scripts

```sh
bun test        # unit + end-to-end against a live Bun server
bun run build   # tsc → dist
```
