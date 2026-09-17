# @pingid/lib

Set of personal libraries, published as one package with a subpath per library.

- **[`@pingid/lib/compose`](https://github.com/Pingid/lib/tree/main/lib/compose)** — Docker Compose
  specs as typed, composable fragments. Environment interpolation lives in `/compose/env`.
- **[`@pingid/lib/proxy`](https://github.com/Pingid/lib/blob/main/lib/proxy/README.md)** — A reverse
  proxy as three small functions over the fetch API: match a path, resolve an upstream, forward the
  request.
- **[`@pingid/lib/vite`](https://github.com/Pingid/lib/blob/main/lib/vite/README.md)** — Three Vite
  plugins, each one thing: mount a backend in the dev server, bundle a script that can't be an ES
  module, and bind a key to a file.
