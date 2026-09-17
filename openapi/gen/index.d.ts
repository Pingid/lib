import { Api as Model } from './model.js';
import { Source } from './doc.js';
import { Op } from './ops.js';
export { default as ts } from 'typescript';
export { type OpenAPI3 } from 'openapi-typescript';
/**
 * Reads an OpenAPI document, reshapes it, and renders TypeScript.
 *
 * ```ts
 * await generate('./openapi.yaml',
 *   Op.keep(/^\/api\//),
 *   Op.url((u) => u.replace(/^\/api/, '')),
 *   Op.group(Op.byTag),
 *   Op.rename(Name.camel),
 *   Op.status(/^2/),
 *   Op.media(/json/),
 *   Op.compact,
 *   Op.sort,
 * )
 * ```
 *
 * Operators that need to look at the document should go through `Route` and `Is`
 * rather than pick `route.source` apart — those reads are already resolved, so no
 * `$ref` or `SchemaObject` subtype union survives to be narrowed by hand:
 *
 * ```ts
 * Op.keep((route) => Is.array(Route.reply(route)?.schema))
 * ```
 *
 * Past filtering and renaming there are three further places to cut in, each further
 * from the document and closer to the file:
 *
 * `Op.extract` hoists a type out of the routes into a declaration of its own, leaving a
 * reference behind:
 *
 * ```ts
 * Op.extract((_type, at) => (at.in === 'reply' ? `${Route.name(at.route)} ${at.reply.status}` : null))
 * ```
 *
 * `Op.declare` adds declarations built from the model as it stands. Point at other
 * declarations with `Decl.ref` and the reference survives every later rename:
 *
 * ```ts
 * Op.declare((api) => ({
 *   id: '#/emit/Schemas',
 *   name: 'Schemas',
 *   kind: 'interface',
 *   type: Ast.obj(Decl.schemas(api).map((d) => ({ name: d.origin.name, type: Decl.ref(d) }))),
 * }))
 * ```
 *
 * `PrintOptions.emit` replaces the file layout itself, with `Emit.*` on hand for the
 * parts of the default you want to keep. It returns statements rather than declarations,
 * so a generated file can carry runtime code as well as types — `Emit.requests` emits a
 * `const` of request builders, one per route, under the same keys as the types:
 *
 * ```ts
 * Api.print(api, { emit: (api) => [...Emit.file(api), ...Emit.requests(api)] })
 *
 * // export const requests = {
 * //   "POST /api/things/{id}": (p: { path: { id: string }; body: Thing }) => ({
 * //     method: "POST",
 * //     url: `/api/things/${p.path.id}`,
 * //     headers: { "Content-Type": "application/json" },
 * //     body: JSON.stringify(p.body),
 * //   }),
 * // }
 * ```
 *
 * `Api.read` and `Api.print` are the same thing a layer down, for callers that need
 * transform options or a custom emitted shape.
 */
export declare const generate: (source: Source, ...ops: Op[]) => Promise<string>;
export type Api = Model;
/** The model layer: a document in, TypeScript out, with the pipeline in between. */
export declare const Api: {
    read: (source: Source, options?: import('./read.js').ReadOptions) => Promise<Model>;
    print: (api: Model, options?: import('./print.js').PrintOptions) => string;
    /** The same as `print`, stopping at the AST so callers can splice it into a larger file. */
    nodes: (api: Model, options?: import('./print.js').PrintOptions) => import('typescript').Node[];
    /** Applies a rewrite to every type in the model. */
    map: (api: Model, f: (type: import('typescript').TypeNode, at: import('./model.js').Site) => import('typescript').TypeNode) => Model;
};
export * as Ast from './ast.js';
export { Doc, type DocOptions, type Source } from './doc.js';
export { Emit, bind, type RequestOptions, type Shape } from './emit.js';
export { Decl, Is, Name, Pattern, Route } from './model.js';
export type { Body, In, Method, Origin, Param, Reply, Site } from './model.js';
export { Op, type Test } from './ops.js';
export type { PrintOptions } from './print.js';
export type { ReadOptions } from './read.js';
