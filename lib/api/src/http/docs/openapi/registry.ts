import type { Schema } from '../../../core/index.ts'

type Json = Schema.Json

export interface RegistryOptions {
  /** Hoist schemas into `components.schemas`. `true` hoists object schemas; a predicate decides per schema. */
  refs?: boolean | ((schema: Json) => boolean)
  /** Structurally identical schemas share one component. Named models are referenced either way. */
  dedupe?: boolean
}

/**
 * Collects component schemas and rewrites inline schemas into `$ref`s.
 *
 * A schema matching a named model becomes a `$ref` to it, even where it carries its own
 * `description` or other annotations, which then sit beside the `$ref`. Schemas carrying `$id`
 * or `title` always become components under that name. Others become components only when
 * given a fallback name and the `refs` predicate accepts them.
 */
export const createRegistry = (
  { refs = true, dedupe = true }: RegistryOptions = {},
  seed: Record<string, Json> = {},
) => {
  const on = refs !== false
  const hoist = typeof refs === 'function' ? refs : (s: Json) => s.type === 'object'
  const shared = on && dedupe
  const schemas: Record<string, Json> = { ...seed }
  const seen = new Map(Object.entries(seed).map(([name, s]) => [hash(s), name]))
  /** Named models by fingerprint, exact and with annotations stripped. Consulted whenever refs are on. */
  const known = new Map<string, string>()
  const bare = new Map<string, string>()
  /** Local definition names that stand for a component of another name. */
  const alias = new Map<string, string>()

  const add = (name: string, key: string, out: Json) => {
    schemas[name] = out
    if (shared && !seen.has(key)) seen.set(key, name)
    return ref(name)
  }

  /** A `$ref` to the model `json` matches, keeping the annotations it adds to that model. */
  const model = (json: Json): Json | undefined => {
    if (!on) return undefined
    const exact = known.get(hash(json))
    if (exact) return ref(exact)
    const name = specific(json) ? bare.get(hash(strip(json))) : undefined
    if (!name) return undefined
    const own = schemas[name] ?? {}
    const notes = Object.entries(json).filter(([k, v]) => NOTES.has(k) && hash(v) !== hash(own[k]))
    return { ...ref(name), ...Object.fromEntries(notes) }
  }

  /** Rewrite `json` into a `$ref` or an inline schema whose children are refs where possible. */
  const refer = (json: Json, name?: string): Json => {
    const hit = model(json)
    if (hit) return hit
    const key = hash(json)
    const same = shared ? seen.get(key) : undefined
    if (same) return ref(same)
    const out = walk(json)
    const id = on ? (named(json) ?? (name && hoist(json) ? name : undefined)) : undefined
    return id ? add(unique(id), key, out) : out
  }

  /** Register named models up front so later occurrences, including in each other, resolve to them. */
  const models = (record: Record<string, Json>) => {
    const entries = Object.entries(record).map(([name, json]) => {
      const wrapped = unwrap(json)
      if (wrapped) alias.set(wrapped.def, name)
      const body = wrapped?.body ?? json
      for (const key of [hash(json), hash(body)]) known.set(key, name)
      bare.set(hash(strip(body)), name)
      return [name, json, body] as const
    })
    for (const [name, json, body] of entries) {
      if (body !== json) defines(json)
      schemas[name] = walk(body)
    }
  }

  /** Hoist a schema's local definitions, pointing each at a model it matches rather than copying it. */
  const defines = (json: Json) => {
    const defs = { ...(json['definitions'] as object), ...(json['$defs'] as object) } as Record<string, Json>
    for (const [n, s] of Object.entries(defs)) {
      const name = alias.get(n) ?? n
      if (name in schemas) continue
      const hit = model(s) ?? (shared && seen.has(hash(s)) ? ref(seen.get(hash(s))!) : undefined)
      if (hit?.['$ref'] && Object.keys(hit).length === 1) alias.set(n, String(hit['$ref']).slice(PREFIX.length))
      else schemas[name] = walk(s)
    }
  }

  /** Point local `$defs` refs and bare TypeBox `$id` refs at `components.schemas`. */
  const retarget = (r: string) => {
    const local = r.match(/^#\/(?:\$defs|definitions)\/(.+)$/)?.[1]
    if (local) return PREFIX + (alias.get(local) ?? local)
    return /^[\w.-]+$/.test(r) ? PREFIX + (alias.get(r) ?? r) : r
  }

  const walk = (json: Json): Json => {
    const out: Json = {}
    if ('$defs' in json || 'definitions' in json) defines(json)
    for (const [k, v] of Object.entries(json) as [string, any][]) {
      if (k === '$schema' || k === '$id' || k === '$defs' || k === 'definitions') continue
      else if (k === '$ref') out[k] = retarget(v)
      else if (MAPS.has(k)) out[k] = Object.fromEntries(Object.entries(v).map(([n, s]) => [n, refer(s as Json)]))
      else if (SUBS.has(k)) out[k] = Array.isArray(v) ? v.map((s) => refer(s)) : typeof v === 'object' ? refer(v) : v
      else out[k] = v
    }
    return out
  }

  const unique = (id: string) => {
    let name = id
    for (let i = 2; name in schemas; i++) name = `${id}${i}`
    return name
  }

  return { schemas, refer, models }
}

const MAPS = new Set(['properties', 'patternProperties', 'dependentSchemas'])
const SUBS = new Set([
  ...['items', 'additionalProperties', 'not', 'if', 'then', 'else', 'contains', 'propertyNames'],
  ...['unevaluatedProperties', 'unevaluatedItems', 'anyOf', 'oneOf', 'allOf', 'prefixItems'],
])

const PREFIX = '#/components/schemas/'
const ref = (name: string): Json => ({ $ref: PREFIX + name })

/** Keywords that describe a use of a schema without changing what it admits. OpenAPI 3.1 allows them beside `$ref`. */
const NOTES = new Set(['description', 'examples', 'example', 'deprecated', 'readOnly', 'writeOnly', '$comment'])

/** More than a bare `{ type }`: enough shape that matching it to a model by structure alone is safe. */
const specific = (json: Json) => Object.keys(strip(json)).some((k) => k !== 'type' && k !== 'format')

const strip = (json: Json): Json =>
  Object.fromEntries(Object.entries(json).filter(([k]) => !NOTES.has(k) && k !== '$schema'))

/**
 * The definition a schema is only a pointer to: zod writes a schema with a `meta({ id })` as
 * `{ $ref: '#/definitions/Id', definitions: { Id: ... } }`, and the model is what it points at.
 */
const unwrap = (json: Json): { def: string; body: Json } | undefined => {
  const def =
    typeof json['$ref'] === 'string' ? json['$ref'].match(/^#\/(?:\$defs|definitions)\/(.+)$/)?.[1] : undefined
  const defs = { ...(json['definitions'] as object), ...(json['$defs'] as object) } as Record<string, Json>
  const rest = Object.keys(json).filter((k) => !['$ref', '$schema', '$defs', 'definitions'].includes(k))
  const body = def ? defs[def] : undefined
  return def && body && !rest.length ? { def, body } : undefined
}

const named = (json: Json) => {
  const id = json['$id'] ?? json['title']
  return typeof id === 'string' ? pascal(id) : undefined
}

/** Key-order independent fingerprint. Ignores symbol keys such as TypeBox's `Kind`. */
const hash = (json: unknown) =>
  JSON.stringify(json, (k, v) =>
    k === '$schema'
      ? undefined
      : v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((key) => [key, v[key]]),
          )
        : v,
  )

export const pascal = (s: string) =>
  s
    .split(/[^a-zA-Z0-9]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
