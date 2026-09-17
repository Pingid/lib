import { ast_exports } from "./ast.js";
import { Decl, Is, Name, Pattern, Route, mapTypes } from "./model.js";
import { Emit, bind } from "./emit.js";
import { nodes, print } from "./print.js";
import { Doc } from "./doc.js";
import { read } from "./read.js";
import { Op } from "./ops.js";
import ts$1 from "typescript";
//#region lib/openapi/src/gen/index.ts
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
* Point at what it lifted with `Decl.of`, which finds a declaration by where it came from
* rather than by the name it was given — names get suffixed when two collide, so a reference
* written by name can end up on the wrong declaration without anything failing:
*
* ```ts
* Decl.of(api, route, (at) => at.in === 'reply' && at.reply.status === '200').map(Decl.ref)
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
var generate = async (source, ...ops) => print(Op.pipe(...ops)(await read(source)));
/** The model layer: a document in, TypeScript out, with the pipeline in between. */
var Api = {
	read,
	print,
	/** The same as `print`, stopping at the AST so callers can splice it into a larger file. */
	nodes,
	/** Applies a rewrite to every type in the model. */
	map: mapTypes
};
//#endregion
export { Api, ast_exports as Ast, Decl, Doc, Emit, Is, Name, Op, Pattern, Route, bind, generate, ts$1 as ts };

//# sourceMappingURL=index.js.map