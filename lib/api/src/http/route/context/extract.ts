import { Schema } from '../../../core/index.ts'

import { type RouteSpec } from '../types.ts'
import { json } from './reply.ts'

export interface ExtractorOptions<R = Request, S = Schema.Type> {
  body?: Extractor<R, S>
  query?: Extractor<R, S>
  path?: Extractor<R, S>
}

type Extractor<R, S> = (req: R, schema: S) => any | Promise<any>

export const extractor =
  <R extends Request, I extends Pick<RouteSpec, 'body' | 'query' | 'params'>>(
    e?: ExtractorOptions<R, I['body'] | I['query'] | I['params']>,
  ) =>
  (rt: I) => {
    const ex = { body: extractBody(rt), query: extractQuery(rt), path: extractPath(rt), ...e }
    return async (req: R) => ({
      body: await ex.body(req, rt.body),
      query: await ex.query(req, rt.query),
      path: await ex.path(req, rt.params),
    })
  }

const extractPath = <R extends Request, I extends RouteSpec>(rt?: I): Extractor<R, Schema.Type | undefined> => {
  if (!rt?.path) return () => undefined
  const paramsOf = pathParams(rt.path)
  return async (req: Request, s) => {
    const schema = s ?? rt.params
    return schema ? validate(schema, paramsOf(req.url)) : paramsOf(req.url)
  }
}

const extractBody = <R extends Request, I extends RouteSpec>(rt?: I): Extractor<R, RouteSpec['body']> => {
  if (rt?.body === undefined) return () => undefined
  return (req: Request, s) => readBody(s ?? rt.body, req, { json: () => req.json(), binary: () => req.arrayBuffer() })
}

export interface BodyReaders {
  json: () => unknown
  binary: () => unknown
}

/**
 * Read a body as declared: bytes for `application/octet-stream`, otherwise JSON checked against its schema.
 * A body declaring both is read by the request's content type.
 */
export const readBody = async (spec: RouteSpec['body'], req: Request, read: BodyReaders) => {
  if (!spec) return undefined
  const json = bodySchema(spec)
  const bytes = !Schema.is(spec) && 'application/octet-stream' in spec
  if (bytes && !(json && req.headers.get('content-type')?.includes('json'))) return read.binary()
  return json ? validate(json, await read.json()) : undefined
}

/** The JSON schema a body declares, if any. */
export const bodySchema = (spec: RouteSpec['body']): Schema.Type | undefined =>
  !spec ? undefined : Schema.is(spec) ? spec : spec['application/json']

const extractQuery = <R extends Request, I extends RouteSpec>(rt?: I): Extractor<R, Schema.Type | undefined> => {
  const schema = rt?.query
  if (schema === undefined) return () => undefined
  return async (req: Request, s) =>
    validate(s ?? schema, Object.fromEntries(new URL(req.url, 'http://localhost').searchParams))
}

/** Rejects with a 422 `Response`, which the route adapter returns as-is. */
export const validate = async (schema: Schema.Type, value: unknown) => {
  const result = await Schema.validate<any>(value, schema)
  if (result.ok) return result.value
  return Promise.reject(json({ error: 'validation', issues: result.error }, { status: 422 }))
}

const pathParams = (def: string) => {
  const keys: string[] = []

  const pattern = def
    .split('/')
    .map((part) => {
      if (part.startsWith(':')) {
        keys.push(part.slice(1))
        return '([^/]+)'
      }
      if (part.endsWith('...')) {
        const prefix = part.slice(0, -3)
        return `${escapeRegex(prefix)}.*`
      }

      return escapeRegex(part)
    })
    .join('/')

  const regex = new RegExp(`^${pattern}$`)

  return (url: string | URL): Record<string, string> => {
    const pathname = url instanceof URL ? url.pathname : new URL(url, 'http://localhost').pathname
    const match = regex.exec(pathname)
    if (!match) return {}
    return Object.fromEntries(keys.map((key, i) => [key, decodeURIComponent(match[i + 1]!)]))
  }
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
