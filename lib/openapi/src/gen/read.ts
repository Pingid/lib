import ts from 'typescript'
import * as oas from 'openapi-typescript'

import * as Ast from './ast.ts'
import { Doc, type DocOptions, type Source } from './doc.ts'
import { Name, Route, mapTypes, type Api, type Body, type Decl, type Method, type Param, type Reply } from './model.ts'

export type ReadOptions = DocOptions & {
  /** Overrides for openapi-typescript's transform context, e.g. `{ immutable: true }`. */
  ts?: Partial<oas.GlobalContext>
}

/** Loads a document and flattens it into the editable model. */
export const read = async (source: Source, options: ReadOptions = {}): Promise<Api> => {
  const config = options.config ?? (await Doc.config())
  const doc = await Doc.load(source, { ...options, config })
  const ctx = Doc.context(doc, config, options.ts)

  return link({ decls: schemas(doc, ctx), routes: routes(doc, ctx) })
}

const schemas = (doc: oas.OpenAPI3, ctx: oas.GlobalContext): Decl[] =>
  Object.entries(doc.components?.schemas ?? {}).map(([name, schema]) => {
    const id = oas.createRef(['components', 'schemas', name])

    return {
      id,
      name: Name.identifier(name),
      type: oas.transformSchemaObject(schema, { path: id, schema, ctx }),
      docs: schema.description,
      origin: { kind: 'schema', name },
    }
  })

const routes = (doc: oas.OpenAPI3, ctx: oas.GlobalContext): Route[] =>
  Object.entries(doc.paths ?? {}).flatMap(([url, raw]) => {
    const item = deref<oas.PathItemObject>(raw, ctx)

    return item ? Route.methods.flatMap((method) => route(url, method, item, ctx)) : []
  })

const route = (url: string, method: Method, item: oas.PathItemObject, ctx: oas.GlobalContext): Route[] => {
  const op = deref<oas.OperationObject>(item[method], ctx)

  if (!op) return []

  const at = oas.createRef(['paths', url, method])

  return [
    {
      id: op.operationId ?? `${method} ${url}`,
      url,
      method,
      group: [],
      params: params([...(item.parameters ?? []), ...(op.parameters ?? [])], at, ctx),
      bodies: bodies(op.requestBody, at, ctx),
      replies: replies(op.responses, at, ctx),
      tags: op.tags ?? [],
      docs: op.description ?? op.summary,
      source: op,
    },
  ]
}

/** Path-level and operation-level parameters, deduped by location and name. */
const params = (list: (oas.ParameterObject | oas.ReferenceObject)[], at: string, ctx: oas.GlobalContext): Param[] => {
  const unique = new Map<string, oas.ParameterObject>()

  for (const raw of list) {
    const param = deref<oas.ParameterObject>(raw, ctx)
    if (param) unique.set(`${param.in}-${param.name}`, param)
  }

  return [...unique.values()].map((source) => ({
    in: source.in,
    name: source.name,
    required: source.in === 'path' || !!source.required,
    type: oas.transformParameterObject(source, {
      path: oas.createRef([at, 'parameters', source.in, source.name]),
      ctx,
    }),
    docs: source.description,
    source,
  }))
}

const bodies = (
  raw: oas.RequestBodyObject | oas.ReferenceObject | undefined,
  at: string,
  ctx: oas.GlobalContext,
): Body[] => {
  const body = deref<oas.RequestBodyObject>(raw, ctx)

  return contents(body?.content, oas.createRef([at, 'requestBody', 'content']), ctx).map((content) => ({
    ...content,
    required: !!body?.required,
  }))
}

const replies = (responses: oas.ResponsesObject | undefined, at: string, ctx: oas.GlobalContext): Reply[] =>
  Object.entries(responses ?? {}).flatMap(([status, raw]): Reply[] => {
    const response = deref<oas.ResponseObject>(raw, ctx)

    if (!response) return []

    const variants = contents(response.content, oas.createRef([at, 'responses', status, 'content']), ctx)
    const docs = response.description

    if (!variants.length) return [{ status, media: null, type: Ast.NEVER, docs }]

    return variants.map((content) => ({ ...content, status, docs }))
  })

/** Each content type, paired with its emitted type and the schema that produced it. */
const contents = (
  content: Record<string, oas.MediaTypeObject | oas.ReferenceObject> | undefined,
  at: string,
  ctx: oas.GlobalContext,
): { media: string; type: ts.TypeNode; schema?: oas.SchemaObject }[] =>
  Object.entries(content ?? {}).flatMap((entry) => {
    const [media, raw] = entry
    const value = deref<oas.MediaTypeObject>(raw, ctx)

    if (!value) return []

    return [
      {
        media,
        type: oas.transformMediaTypeObject(value, { path: oas.createRef([at, media]), ctx }),
        schema: deref<oas.SchemaObject>(value.schema, ctx),
      },
    ]
  })

/**
 * openapi-typescript renders `$ref` as `components["schemas"]["Foo"]`, which only holds
 * while the document keeps its original shape. The pipeline reshapes it, so references
 * collapse to their pointer here and are re-bound to whatever name `print` settles on.
 */
const link = (api: Api): Api => mapTypes(api, (type) => Ast.rewrite(type, (node) => component(node) ?? node))

const component = (node: ts.Node): ts.TypeNode | undefined => {
  if (!ts.isIndexedAccessTypeNode(node) || !ts.isIndexedAccessTypeNode(node.objectType)) return undefined

  const { objectType: root, indexType: kind } = node.objectType

  if (!ts.isTypeReferenceNode(root) || Ast.name(root) !== 'components') return undefined

  const parts = [literal(kind), literal(node.indexType)]

  return parts.every((part) => part) ? Ast.ref(oas.createRef(['components', ...parts])) : undefined
}

const literal = (node: ts.TypeNode): string | undefined =>
  ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal) ? node.literal.text : undefined

const deref = <T>(value: T | oas.ReferenceObject | undefined, ctx: oas.GlobalContext): T | undefined => {
  if (!value || typeof value !== 'object') return undefined

  return '$ref' in value ? ctx.resolve<T>((value as oas.ReferenceObject).$ref) : (value as T)
}
