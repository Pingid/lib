import type * as oa from 'openapi-typescript'

import { createRegistry, pascal, type RegistryOptions } from './registry.ts'
import { bodySchema } from '../../route/context/extract.ts'
import { byStatus } from '../../route/response.ts'
import type * as Route from '../../route/index.ts'
import { Schema } from '../../../core/index.ts'

export interface OpenApiConfig extends Partial<oa.OpenAPI3>, RegistryOptions {
  routes: (Route.Route<any, any> | Route.RouteSpec)[]
  /** Named schemas emitted as components. Matching inline schemas resolve to them when `dedupe` is on. */
  models?: Record<string, Schema.Type>
  /** Defaults to the spec's `operationId`, else method + path, e.g. `GET /users/:id` → `getUsersById`. Repeats get a numeric suffix. */
  operationId?: (spec: Route.RouteSpec) => string
  /** Component name for a hoisted body or response schema without its own `$id` or `title`. */
  name?: (ctx: NameContext) => string
}

export interface NameContext {
  operationId: string
  role: 'body' | 'response'
  status?: string
  type?: string
}

/**
 * Build an OpenAPI 3.2 document from routes.
 *
 * Object bodies and responses are hoisted into `components.schemas` and deduplicated by structure.
 *
 * @example
 * openapi({ info: { title: 'Items', version: '1.0.0' }, routes: [getItem], models: { Item } })
 */
export const resolve = (config: OpenApiConfig): oa.OpenAPI3 => {
  const { routes, models = {}, refs, dedupe, operationId = operationIdOf, name = nameOf, ...doc } = config
  const reg = createRegistry({ refs, dedupe }, doc.components?.schemas as Record<string, Schema.Json>)
  reg.models(Object.fromEntries(Object.entries(models).map(([n, s]) => [n, toJson(s)])))
  const ids = new Set<string>()

  const operation = (spec: Route.RouteSpec): oa.OperationObject => {
    const { method, path = '', body, query, params, response, ...meta } = spec
    const id = unique(ids, operationId(spec))
    const refer = (s: Schema.Type, ctx: Omit<NameContext, 'operationId'>) =>
      reg.refer(toJson(s), name({ operationId: id, ...ctx }))
    const [pathJson, queryJson] = [params, query].map((s) => (s ? toJson(s) : {})) as [Schema.Json, Schema.Json]
    for (const json of [pathJson, queryJson]) reg.defines(json)
    const parameters = [...parametersOf('path', pathJson, pathNames(path)), ...parametersOf('query', queryJson)].map(
      (p) => ({ ...p, schema: reg.refer(p.schema) }),
    )
    return defined({
      ...meta,
      operationId: id,
      parameters: parameters.length ? (parameters as oa.ParameterObject[]) : undefined,
      requestBody: body && { required: true, content: requestContent(body, (s) => refer(s, { role: 'body' })) },
      responses: Object.fromEntries(
        Object.entries(byStatus(response)).map(([status, protocols]) => {
          const entries = Object.entries(protocols ?? {}) as [string, any][]
          const content = entries.map(([type, v]) => [
            type,
            !Schema.is(v)
              ? type === 'application/octet-stream'
                ? { schema: BINARY }
                : {}
              : type === 'text/event-stream'
                ? { itemSchema: event(refer(v, { role: 'response', status, type })) }
                : { schema: refer(v, { role: 'response', status, type }) },
          ])
          return [
            status,
            defined({
              description: entries.map(([, v]) => v?.description).find(Boolean) ?? STATUS[status] ?? 'Response',
              content: content.length ? Object.fromEntries(content) : undefined,
            }),
          ]
        }),
      ),
    })
  }

  const paths: oa.PathsObject = { ...doc.paths }
  for (const r of routes) {
    const spec = 'handler' in r ? r.spec : r
    if (!spec.path) continue
    const p = spec.path.replace(/:(\w+)/g, '{$1}')
    paths[p] = { ...paths[p], [(spec.method ?? 'GET').toLowerCase()]: operation(spec) }
  }

  const schemas = reg.schemas as Record<string, oa.SchemaObject>
  return {
    openapi: '3.2.0',
    info: { title: 'API', version: '1.0.0' },
    ...doc,
    paths,
    ...(Object.keys(schemas).length && { components: { ...doc.components, schemas } }),
  }
}

// ------------------------------------------------------------------
// Defaults
// ------------------------------------------------------------------
const operationIdOf = ({ operationId, method = 'GET', path = '' }: Route.RouteSpec) =>
  operationId ??
  method.toLowerCase() +
    path
      .split('/')
      .map((s) => (PARAM.test(s) ? `By${pascal(s)}` : pascal(s)))
      .join('')

const nameOf = ({ operationId, role, status = '200', type = 'application/json' }: NameContext) =>
  pascal(operationId) +
  (role === 'body'
    ? 'Body'
    : `${status === '200' ? '' : pascal(status)}${type === 'application/json' ? '' : pascal(type.split('/')[1] ?? '')}Response`)

const STATUS: Record<string, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Content',
  500: 'Internal Server Error',
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const PARAM = /^(?::\w+|\{\w+\})$/
const BINARY = { type: 'string', contentMediaType: 'application/octet-stream' } as const

/** JSON Schema in the dialect OpenAPI 3.2 uses. */
const toJson = (schema: Schema.Type) => Schema.toJson(schema, 'input', 'draft-2020-12')

/** `id`, or `id` with the first free numeric suffix once `taken` holds it. Claims the result. */
const unique = (taken: Set<string>, id: string) => {
  let out = id
  for (let i = 2; taken.has(out); i++) out = `${id}${i}`
  taken.add(out)
  return out
}

/** One server-sent event: `data` holds the JSON the route streams. */
const event = (schema: Schema.Json) => ({
  type: 'object',
  required: ['data'],
  properties: { data: { type: 'string', contentMediaType: 'application/json', contentSchema: schema } },
})

/** A request body's content by media type: its JSON schema, and bytes when it declares octet-stream. */
const requestContent = (
  body: NonNullable<Route.RouteSpec['body']>,
  refer: (s: Schema.Type) => Schema.Json,
): Record<string, oa.MediaTypeObject> => {
  const json = bodySchema(body)
  const bytes = !Schema.is(body) && 'application/octet-stream' in body
  return defined({
    'application/json': json && { schema: refer(json) as oa.SchemaObject },
    'application/octet-stream': bytes ? { schema: BINARY } : undefined,
  }) as Record<string, oa.MediaTypeObject>
}

const pathNames = (path: string) =>
  path
    .split('/')
    .filter((s) => PARAM.test(s))
    .map((s) => s.replace(/[:{}]/g, ''))

/**
 * Expand an object schema into parameters. Path names without a schema default to strings, and path
 * parameters the path does not name are left out.
 */
const parametersOf = (loc: 'path' | 'query', json: Schema.Json, names: string[] = []) => {
  const props = { ...Object.fromEntries(names.map((n) => [n, { type: 'string' }])), ...json.properties }
  const entries = Object.entries(props).filter(([name]) => loc === 'query' || names.includes(name))
  return entries.map(([name, s]: [string, Schema.Json]) =>
    defined({
      name,
      in: loc,
      required: loc === 'path' || !!json.required?.includes(name),
      description: s.description,
      schema: s,
    }),
  )
}

const defined = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T
