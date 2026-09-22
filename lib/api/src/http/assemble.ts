import { tokens } from '../core/coerce.ts'
import type { Schema } from '../core/index.ts'
import type { Route } from './route.ts'
import type { Struct } from './util.ts'

interface Body {
  value: unknown
  /** Form and text bodies arrive as strings and still need the fragment's coercion. */
  textual: boolean
  /** The body is not a keyed object, so a single bound key receives it entire. */
  whole: boolean
}

/**
 * The flat input a handler receives, drawn from wherever the bindings say.
 *
 * Sources are disjoint by construction — the spec is checked for overlap — so there is no
 * precedence rule here. Nothing ever writes `undefined`: an absent value means the key is
 * *omitted*, so a schema's `required` fires and its `default` applies, both of which writing
 * `undefined` would defeat.
 */
export const assemble = async (
  route: Route.Node,
  request: Request,
  matched?: Record<string, string>,
): Promise<Struct> => {
  const url = new URL(request.url)
  const path = matched ?? route.match(url.pathname) ?? {}
  const input: Struct = {}

  let cookies: Record<string, string> | undefined
  let body: Body | undefined

  for (const [key, binding] of Object.entries(route.bindings)) {
    const json = route.fragment(key)
    const wire = binding.name

    switch (binding.source) {
      case 'path': {
        const raw = path[wire]
        if (raw !== undefined) input[key] = tokens(json, [raw])
        break
      }

      case 'query': {
        const all = url.searchParams.getAll(wire)
        if (all.length > 0) input[key] = tokens(json, binding.array ? all : [all[all.length - 1]!])
        break
      }

      case 'header': {
        const raw = request.headers.get(wire)
        // Only an array-typed field splits on `,` — a scalar header legitimately contains one.
        if (raw !== null) input[key] = tokens(json, binding.array ? raw.split(',').map((v) => v.trim()) : [raw])
        break
      }

      case 'cookie': {
        cookies ??= parse(request.headers.get('cookie'))
        const raw = cookies[wire]
        if (raw !== undefined) input[key] = tokens(json, [raw])
        break
      }

      case 'raw': {
        input[key] = request
        break
      }

      case 'body': {
        body ??= await read(request)
        assign(input, route, key, wire, json, body)
        break
      }
    }
  }

  return input
}

const assign = (
  input: Struct,
  route: Route.Node,
  key: string,
  wire: string,
  json: Schema.Json | undefined,
  body: Body,
) => {
  if (body.value === undefined) return

  if (body.whole) {
    const bound = Object.values(route.bindings).filter((binding) => binding.source === 'body')
    if (bound.length > 1) {
      throw new Error(`Route '${route.node.name}' binds ${bound.length} body keys, but the body is not an object`)
    }
    input[key] = body.value
    return
  }

  const raw = (body.value as Struct)[wire]
  if (raw === undefined) return

  input[key] = body.textual && typeof raw === 'string' ? tokens(json, [raw]) : raw
}

const read = async (request: Request): Promise<Body> => {
  if (request.body === null || request.method === 'GET' || request.method === 'HEAD') {
    return { value: undefined, textual: false, whole: false }
  }

  const type = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? ''

  if (type === 'application/json' || type.endsWith('+json')) {
    return { value: await request.json(), textual: false, whole: false }
  }

  if (type === 'application/x-www-form-urlencoded' || type === 'multipart/form-data') {
    return { value: form(await request.formData()), textual: true, whole: false }
  }

  if (type === '' || type.startsWith('text/')) return { value: await request.text(), textual: true, whole: true }

  return { value: await request.blob(), textual: false, whole: true }
}

/** Repeated fields collapse to an array; a `File` passes through untouched. */
const form = (data: FormData): Struct => {
  const out: Struct = {}
  for (const key of new Set(data.keys())) {
    const all = data.getAll(key)
    out[key] = all.length > 1 ? all : all[0]
  }
  return out
}

const parse = (header: string | null): Record<string, string> => {
  const out: Record<string, string> = {}
  if (!header) return out

  for (const pair of header.split(';')) {
    const index = pair.indexOf('=')
    if (index === -1) continue

    const name = pair.slice(0, index).trim()
    if (name !== '') out[name] = decodeURIComponent(pair.slice(index + 1).trim())
  }

  return out
}
