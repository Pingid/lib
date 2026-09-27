import { Type } from '@sinclair/typebox'

import { resolve, type OpenApiConfig } from './openapi/index.ts'
import { scalar, type ScalarConfig } from './scalar/index.ts'

import * as Http from '../route/index.ts'

export type { OpenApiConfig, NameContext } from './openapi/index.ts'
export type { ScalarConfig } from './scalar/index.ts'

/**
 * Build an OpenAPI 3.1 document from routes.
 *
 * Object bodies and responses are hoisted into `components.schemas` and deduplicated by structure.
 *
 * @example
 * OpenApi({ info: { title: 'Items', version: '1.0.0' }, routes: [getItem], models: { Item } })
 */
export const OpenApi = (config: OpenApiConfig) => resolve(config)

export interface ScalarDocsConfig extends OpenApiConfig {
  /** Page options. `url` defaults to the `json` route beside the page. */
  scalar?: ScalarConfig
  /** Inline the document in the page rather than fetching it from the `json` route. */
  embed?: boolean
}

/**
 * Serve a Scalar API reference at `prefix`, and its OpenAPI document at `${prefix}/json`.
 *
 * The docs routes stay out of the document. Mount `handler` directly, or `Page` and `Docs` through an adapter.
 *
 * @example
 * const docs = Scalar('/docs', { info: { title: 'Items', version: '1.0.0' }, routes: [getItem] })
 * Bun.serve({ routes: bunRoutes([docs.Page, docs.Docs]) })
 */
export const Scalar = <P extends string>(prefix: P, docs: ScalarDocsConfig) => {
  const PageSpec = {
    method: 'GET',
    path: prefix,
    response: { 200: { 'text/html': Type.String() } },
  } satisfies Http.RouteSpec

  const DocsSpec = {
    method: 'GET',
    path: `${prefix}/json`,
    response: { 200: { 'application/json': Type.Object({}, { description: 'OpenAPI 3.1 document' }) } },
  } satisfies Http.RouteSpec

  const { scalar: config, embed, ...openapi } = docs
  const gen = resolve(openapi)
  const page = scalar(gen.info, embed ? { ...config, content: gen } : { url: DocsSpec.path, ...config })

  const Page = Http.Route(PageSpec, (c) => c.html(page))
  const Docs = Http.Route(DocsSpec, (c) => c.json(gen))

  const handler = (req: Request) => {
    const path = new URL(req.url).pathname.replace(/(.)\/+$/, '$1')
    const route = path === PageSpec.path ? Page : path === DocsSpec.path ? Docs : undefined
    if (!route) return Promise.resolve(new Response(null, { status: 404 }))
    if (req.method !== 'GET' && req.method !== 'HEAD')
      return Promise.resolve(new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } }))
    return route.fetch(req)
  }

  return { handler, Page, Docs, document: gen }
}
