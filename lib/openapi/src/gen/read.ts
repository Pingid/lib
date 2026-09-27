import ts from 'typescript'
import * as oas from 'openapi-typescript'

import * as Ast from './ast.ts'
import { Doc, type DocOptions, type Source } from './doc.ts'
import {
  Is,
  Media,
  Name,
  Route,
  mapTypes,
  type Api,
  type Body,
  type Decl,
  type Header,
  type Method,
  type Param,
  type Reply,
} from './model.ts'

export type ReadOptions = DocOptions & {
  /** Overrides for openapi-typescript's transform context, e.g. `{ immutable: true }`. */
  ts?: Partial<oas.GlobalContext>
  /**
   * The type bytes are read as: a `format: binary` string anywhere, and the body of a binary
   * content type such as `application/octet-stream` that gives no schema or a plain string one.
   * Defaults to `Blob`; `false` leaves them as openapi-typescript types them.
   */
  binary?: ts.TypeNode | false
}

/** Loads a document and flattens it into the editable model. */
export const read = async (source: Source, options: ReadOptions = {}): Promise<Api> => {
  const config = options.config ?? (await Doc.config())
  const doc = await Doc.load(source, { ...options, config })
  const binary = options.binary === undefined ? BLOB : options.binary
  const ctx = Doc.context(doc, config, { ...options.ts, transform: bytes(binary, options.ts?.transform) })

  return link({ decls: schemas(doc, ctx), routes: routes(doc, ctx, binary) })
}

const BLOB = Ast.ref('Blob')

/** Types `format: binary` as `binary`, after whatever transform the caller supplied has had its say. */
const bytes =
  (binary: ts.TypeNode | false, over: oas.GlobalContext['transform']): oas.GlobalContext['transform'] =>
  (schema, options) => {
    const own = over?.(schema, options)

    if (own || !binary || schema.format !== 'binary') return own

    return Is.nullable(schema) ? Ast.union([binary, oas.NULL]) : binary
  }

const schemas = (doc: oas.OpenAPI3, ctx: oas.GlobalContext): Decl[] =>
  Object.entries(doc.components?.schemas ?? {}).map(([name, schema]) => {
    const id = oas.createRef(['components', 'schemas', name])

    return {
      id,
      name: Name.identifier(name),
      type: oas.transformSchemaObject(schema, { path: id, schema, ctx }),
      docs: schema.description,
      deprecated: schema.deprecated,
      origin: { kind: 'schema', name },
    }
  })

const routes = (doc: oas.OpenAPI3, ctx: oas.GlobalContext, binary: ts.TypeNode | false): Route[] =>
  Object.entries(doc.paths ?? {}).flatMap(([url, raw]) => {
    const item = deref<oas.PathItemObject>(raw, ctx)

    return item ? Route.methods.flatMap((method) => route(url, method, item, { ctx, binary })) : []
  })

/** What every read below the document needs: the transform context, and the type bytes are read as. */
type Reading = { ctx: oas.GlobalContext; binary: ts.TypeNode | false }

const route = (url: string, method: Method, item: oas.PathItemObject, reading: Reading): Route[] => {
  const { ctx } = reading
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
      bodies: bodies(op.requestBody, at, reading),
      replies: replies(op.responses, at, reading),
      tags: op.tags ?? [],
      summary: op.summary,
      docs: op.description,
      deprecated: op.deprecated || undefined,
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
    deprecated: source.deprecated || undefined,
    source,
  }))
}

const bodies = (raw: oas.RequestBodyObject | oas.ReferenceObject | undefined, at: string, reading: Reading): Body[] => {
  const body = deref<oas.RequestBodyObject>(raw, reading.ctx)

  return contents(body?.content, oas.createRef([at, 'requestBody', 'content']), reading).map((content) => ({
    ...content,
    required: !!body?.required,
  }))
}

const replies = (responses: oas.ResponsesObject | undefined, at: string, reading: Reading): Reply[] =>
  Object.entries(responses ?? {}).flatMap(([status, raw]): Reply[] => {
    const response = deref<oas.ResponseObject>(raw, reading.ctx)

    if (!response) return []

    const variants = contents(response.content, oas.createRef([at, 'responses', status, 'content']), reading)
    const docs = response.description
    const sent = headers(response.headers, oas.createRef([at, 'responses', status, 'headers']), reading.ctx)

    if (!variants.length) return [{ status, media: null, type: Ast.NEVER, docs, headers: sent }]

    return variants.map((content) => ({ ...content, status, docs, headers: sent }))
  })

/** A response's headers. `Content-Type` is left out: the content map already says it, per media type. */
const headers = (
  raw: Record<string, oas.HeaderObject | oas.ReferenceObject> | undefined,
  at: string,
  ctx: oas.GlobalContext,
): Header[] =>
  Object.entries(raw ?? {}).flatMap(([name, value]): Header[] => {
    const header = deref<oas.HeaderObject>(value, ctx)

    if (!header || /^content-type$/i.test(name)) return []

    return [
      {
        name,
        required: !!header.required,
        type: oas.transformHeaderObject(header, { path: oas.createRef([at, name]), ctx }),
        docs: header.description,
        deprecated: header.deprecated || undefined,
      },
    ]
  })

/** Each content type, paired with its emitted type and the schema that produced it. */
const contents = (
  content: Record<string, oas.MediaTypeObject | oas.ReferenceObject> | undefined,
  at: string,
  { ctx, binary }: Reading,
): { media: string; type: ts.TypeNode; schema?: oas.SchemaObject }[] =>
  Object.entries(content ?? {}).flatMap((entry) => {
    const [media, raw] = entry
    const value = deref<oas.MediaTypeObject>(raw, ctx)

    if (!value) return []

    const schema = deref<oas.SchemaObject>(value.schema, ctx)
    const bytes = binary && Media.binary(media) && opaque(schema)

    return [
      {
        media,
        type: bytes ? binary : oas.transformMediaTypeObject(value, { path: oas.createRef([at, media]), ctx }),
        schema,
      },
    ]
  })

/** A schema that says no more than "a string", or nothing at all: what a binary body is, given no better. */
const opaque = (schema: oas.SchemaObject | undefined): boolean =>
  !schema ||
  Object.keys(schema).length === 0 ||
  (schema.type === 'string' && !('enum' in schema) && !('const' in schema) && !('pattern' in schema))

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
