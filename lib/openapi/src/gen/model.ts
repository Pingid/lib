import type ts from 'typescript'
import type * as oas from 'openapi-typescript'

import * as Ast from './ast.ts'

const Methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const

const Locations = ['path', 'query', 'header', 'cookie'] as const

export type Method = (typeof Methods)[number]

/** Where a parameter travels. Each location becomes one object type on the emitted route. */
export type In = (typeof Locations)[number]

/** Matches a string exactly, by pattern, or by predicate. */
export type Pattern = string | RegExp | ((value: string) => boolean)

/** One parameter, lifted out of any `$ref`. */
export type Param = {
  in: In
  name: string
  required: boolean
  type: ts.TypeNode
  docs?: string
  deprecated?: boolean
  /** The parameter as written, `$ref` already followed. */
  source: oas.ParameterObject
}

/** One response header, lifted out of any `$ref`. */
export type Header = {
  name: string
  required: boolean
  type: ts.TypeNode
  docs?: string
  deprecated?: boolean
}

/** One request body variant, keyed by content type. */
export type Body = {
  media: string
  required: boolean
  type: ts.TypeNode
  /** The media type's schema, `$ref` already followed. */
  schema?: oas.SchemaObject
}

/** One response variant. `media` is `null` for statuses with no content. */
export type Reply = {
  status: string
  media: string | null
  type: ts.TypeNode
  docs?: string
  /** The headers the response declares. Every variant of one status carries the same list. */
  headers: Header[]
  /** The media type's schema, `$ref` already followed. */
  schema?: oas.SchemaObject
}

/**
 * One operation, lifted out of `paths[url][method]` so it can be reshaped on its own.
 *
 * `id` is the handle the pipeline uses to track a route across transforms — operators
 * rewrite `url`, `name` and `group` freely but must leave `id` alone.
 */
export type Route = {
  id: string
  url: string
  method: Method
  /** Nesting of the emitted member. `[]` puts it at the top level. */
  group: string[]
  /** Member name within its group. Unset means "follow the url" — see `Route.name`. */
  name?: string
  params: Param[]
  bodies: Body[]
  replies: Reply[]
  tags: string[]
  /** The operation's one-line `summary`. */
  summary?: string
  /** The operation's `description`. */
  docs?: string
  deprecated?: boolean
  /** The operation as written, `$ref`s and all. `Route.*` is the resolved read. */
  source: oas.OperationObject
}

/** How a declaration got into the model. */
export type Origin =
  /** A named schema in `components.schemas`. `name` is the key as the document spells it. */
  | { kind: 'schema'; name: string }
  /** Made by an operator. `at` is the place the type was lifted from, when it was lifted from one. */
  | { kind: 'made'; at?: Site }

/**
 * One top-level declaration in the emitted file.
 *
 * `id` is the handle everything else points at: a type anywhere in the model can hold
 * `Decl.ref(id)`, and `print` swaps that placeholder for whatever name the declaration
 * ends up with. Names are suggestions — `print` makes them legal and unique — so nothing
 * downstream of a rename has to be told about it.
 */
export type Decl = {
  /** Any string beginning `#/`, unique within the model. */
  id: string
  name: string
  type: ts.TypeNode
  /** `interface` where the type is an object literal; `type` otherwise. Defaults to `type`. */
  kind?: 'type' | 'interface'
  docs?: string
  deprecated?: boolean
  origin?: Origin
}

/** A type's position in the model. Handed to every type rewrite, and recorded on lifted declarations. */
export type Site =
  | { in: 'decl'; decl: Decl }
  | { in: 'param'; route: Route; param: Param }
  | { in: 'body'; route: Route; body: Body }
  | { in: 'reply'; route: Route; reply: Reply }
  | { in: 'header'; route: Route; reply: Reply; header: Header }

/** The whole editable surface. Every operator is an `Api -> Api`. */
export type Api = { routes: Route[]; decls: Decl[] }

export const Pattern = {
  /** `Pattern.match(/json/)('application/json')`. */
  match:
    (pattern: Pattern) =>
    (value: string): boolean => {
      if (typeof pattern === 'function') return pattern(value)
      if (typeof pattern === 'string') return pattern === value

      return pattern.test(value)
    },
}

/**
 * Reads over a route. Nothing these return is a `$ref`, which is the reason to
 * come through here rather than pick `source` apart by hand.
 */
export const Route = {
  /** Every HTTP method a path item can carry. */
  methods: Methods,

  /** Every place a parameter can travel. */
  locations: Locations,

  /** The name the route is emitted under. Defaults to `METHOD /url`, so rewriting the url moves the member. */
  name: (route: Route): string => route.name ?? `${route.method.toUpperCase()} ${route.url}`,

  /** Parameters, or just those in one location: `Route.params(route, 'query')`. */
  params: (route: Route, where?: In): Param[] =>
    where ? route.params.filter((param) => param.in === where) : route.params,

  /** One parameter by name, whatever its location. */
  param: (route: Route, name: Pattern): Param | undefined => route.params.find((p) => Pattern.match(name)(p.name)),

  /** The request body for a content type. Defaults to the first JSON one. */
  body: (route: Route, media: Pattern = /json/): Body | undefined =>
    route.bodies.find((body) => Pattern.match(media)(body.media)),

  /** The response for a status. Defaults to the first success. */
  reply: (route: Route, status: Pattern = /^2/): Reply | undefined =>
    route.replies.find((reply) => Pattern.match(status)(reply.status)),

  /** Replies grouped by status, in the order each status first appeared. */
  statuses: (route: Route): [string, Reply[]][] => {
    const out = new Map<string, Reply[]>()

    for (const reply of route.replies) out.set(reply.status, [...(out.get(reply.status) ?? []), reply])

    return [...out]
  },

  /** Every type the route holds, in a flat list. */
  types: (route: Route): ts.TypeNode[] => [
    ...route.params.map((p) => p.type),
    ...route.bodies.map((b) => b.type),
    ...route.replies.flatMap((r) => [r.type, ...r.headers.map((h) => h.type)]),
  ],
}

/**
 * Tells content types apart by how they go over the wire. Each takes the media type as the
 * document spells it, parameters and all: `Media.json('application/problem+json; charset=utf-8')`.
 */
export const Media = {
  /** `application/json`, and any `+json` suffix such as `application/problem+json`. */
  json: (media: string): boolean => /^[^;]*[/+]json\s*(;|$)/i.test(media),

  /** `application/x-www-form-urlencoded`. */
  form: (media: string): boolean => /^application\/x-www-form-urlencoded\s*(;|$)/i.test(media),

  /** `multipart/*`, which the runtime has to frame itself, boundary and all. */
  multipart: (media: string): boolean => /^multipart\//i.test(media),

  /** `text/event-stream`: the schema describes one event's data, not the body. */
  stream: (media: string): boolean => /^text\/event-stream\s*(;|$)/i.test(media),

  /** Readable as a string: `text/*`, XML, and the structured types above. */
  text: (media: string): boolean =>
    /^text\//i.test(media) || /[/+]xml\s*(;|$)/i.test(media) || Media.json(media) || Media.form(media),

  /** Everything else: bytes, `application/octet-stream`, `image/png` and the like. */
  binary: (media: string): boolean => !Media.text(media) && !Media.multipart(media),
}

/** Reads and references over the declaration list. */
export const Decl = {
  /**
   * A placeholder reference to a declaration, by value or by id. `print` swaps it for the
   * name the declaration ends up with; a pointer with nothing behind it degrades to `unknown`.
   */
  ref: (decl: Decl | string): ts.TypeReferenceNode => Ast.ref(typeof decl === 'string' ? decl : decl.id),

  /** One declaration by id. */
  find: (api: Api, id: string): Decl | undefined => api.decls.find((decl) => decl.id === id),

  /** The declarations that came from `components.schemas`, paired with the name the document gave them. */
  schemas: (api: Api): (Decl & { origin: Extract<Origin, { kind: 'schema' }> })[] =>
    api.decls.flatMap((decl) => (decl.origin?.kind === 'schema' ? [{ ...decl, origin: decl.origin }] : [])),

  /** The declarations an operator made, rather than the document. */
  made: (api: Api): Decl[] => api.decls.filter((decl) => decl.origin?.kind !== 'schema'),

  /**
   * The declarations `Op.extract` lifted out of a route, so a later op can point at one
   * without having to know the id it was given:
   *
   * ```ts
   * Decl.of(api, route, (at) => at.in === 'reply' && at.reply.status === '200').map(Decl.ref)
   * ```
   */
  of: (api: Api, route: Route, where?: (at: Site) => boolean): Decl[] =>
    api.decls.filter((decl) => {
      const at = decl.origin?.kind === 'made' ? decl.origin.at : undefined

      if (!at || at.in === 'decl' || at.route.id !== route.id) return false

      return where ? where(at) : true
    }),

  /** The id `Op.extract` gives a type lifted out of `at`. Deterministic, so re-running gives the same id. */
  at: (at: Site): string => {
    if (at.in === 'decl') return at.decl.id
    if (at.in === 'param') return `#/routes/${at.route.id}/params/${at.param.in}/${at.param.name}`
    if (at.in === 'body') return `#/routes/${at.route.id}/body/${at.body.media}`
    if (at.in === 'header')
      return `#/routes/${at.route.id}/replies/${at.reply.status}/${at.reply.media ?? 'empty'}/headers/${at.header.name}`

    return `#/routes/${at.route.id}/replies/${at.reply.status}/${at.reply.media ?? 'empty'}`
  },

  /** The description attached to whatever sits at `at`, when there is one. */
  docs: (at: Site): string | undefined => {
    if (at.in === 'decl') return at.decl.docs
    if (at.in === 'param') return at.param.docs
    if (at.in === 'reply') return at.reply.docs
    if (at.in === 'header') return at.header.docs

    return undefined
  },
}

/** Narrows the OpenAPI unions, which otherwise only open up to an `in` check. */
export const Is = {
  ref: (value: unknown): value is oas.ReferenceObject =>
    !!value && typeof value === 'object' && '$ref' in value && typeof value.$ref === 'string',

  object: (schema: oas.SchemaObject | undefined): schema is oas.SchemaObject & oas.ObjectSubtype =>
    !!schema && (typed(schema, 'object') || 'properties' in schema || 'additionalProperties' in schema),

  array: (schema: oas.SchemaObject | undefined): schema is oas.SchemaObject & oas.ArraySubtype =>
    !!schema && (typed(schema, 'array') || 'items' in schema || 'prefixItems' in schema),

  /** True when the schema admits `null`, however the document spells it. */
  nullable: (schema: oas.SchemaObject | undefined): boolean =>
    !!schema && (typed(schema, 'null') || schema.nullable === true),
}

/** Turns arbitrary strings into names TypeScript will accept. */
export const Name = {
  /** Strips a string down to a legal identifier: `Docker.Container` becomes `DockerContainer`. */
  identifier: (value: string): string =>
    legal(value.replace(/[^A-Za-z0-9_$]+(.)?/g, (_, next?: string) => next?.toUpperCase() ?? '')),

  /** `GET /api/docker/{id}` becomes `GetApiDockerId`. */
  pascal: (value: string): string => legal(words(value).map(capital).join('')),

  /** `GET /api/docker/{id}` becomes `getApiDockerId`. */
  camel: (value: string): string => {
    const [head = '', ...rest] = words(value).map(capital)

    return legal([head.charAt(0).toLowerCase() + head.slice(1), ...rest].join(''))
  },

  /** `name` if it is free, else the first of `name_2`, `name_3`, ... that is. */
  free: (taken: Set<string>, name: string): string => {
    let free = name

    for (let n = 2; taken.has(free); n++) free = `${name}_${n}`

    return free
  },
}

/**
 * Applies `f` to every type in the model: declarations, parameters, bodies, replies and their headers.
 * `at` says which of those the type came from, so one rewrite can treat them differently.
 */
export const mapTypes = (api: Api, f: (type: ts.TypeNode, at: Site) => ts.TypeNode): Api => ({
  decls: api.decls.map((decl) => ({ ...decl, type: f(decl.type, { in: 'decl', decl }) })),
  routes: api.routes.map((route) => ({
    ...route,
    params: route.params.map((param) => ({ ...param, type: f(param.type, { in: 'param', route, param }) })),
    bodies: route.bodies.map((body) => ({ ...body, type: f(body.type, { in: 'body', route, body }) })),
    replies: route.replies.map((reply) => ({
      ...reply,
      type: f(reply.type, { in: 'reply', route, reply }),
      headers: reply.headers.map((header) => ({
        ...header,
        type: f(header.type, { in: 'header', route, reply, header }),
      })),
    })),
  })),
})

const typed = (schema: oas.SchemaObject, type: string): boolean =>
  Array.isArray(schema.type) ? schema.type.includes(type as never) : schema.type === type

const words = (value: string) => value.split(/[^A-Za-z0-9]+/).filter(Boolean)

/** `GET` normalises to `Get`, but `listUsers` keeps the casing it was given. */
const capital = (word: string) => {
  const tail = word === word.toUpperCase() ? word.slice(1).toLowerCase() : word.slice(1)

  return word.charAt(0).toUpperCase() + tail
}

const legal = (value: string) => (/^[0-9]/.test(value) ? `_${value}` : value || '_')
