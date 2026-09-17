const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
const require_ast = require("./ast.cjs");
const require_model = require("./model.cjs");
const require_emit = require("./emit.cjs");
const require_print = require("./print.cjs");
const require_doc = require("./doc.cjs");
const require_read = require("./read.cjs");
const require_ops = require("./ops.cjs");
let typescript = require("typescript");
typescript = require_runtime.__toESM(typescript, 1);
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
var generate = async (source, ...ops) => require_print.print(require_ops.Op.pipe(...ops)(await require_read.read(source)));
/** The model layer: a document in, TypeScript out, with the pipeline in between. */
var Api = {
	read: require_read.read,
	print: require_print.print,
	/** The same as `print`, stopping at the AST so callers can splice it into a larger file. */
	nodes: require_print.nodes,
	/** Applies a rewrite to every type in the model. */
	map: require_model.mapTypes
};
//#endregion
exports.Api = Api;
Object.defineProperty(exports, "Ast", {
	enumerable: true,
	get: function() {
		return require_ast.ast_exports;
	}
});
exports.Decl = require_model.Decl;
exports.Doc = require_doc.Doc;
exports.Emit = require_emit.Emit;
exports.Is = require_model.Is;
exports.Name = require_model.Name;
exports.Op = require_ops.Op;
exports.Pattern = require_model.Pattern;
exports.Route = require_model.Route;
exports.bind = require_emit.bind;
exports.generate = generate;
Object.defineProperty(exports, "ts", {
	enumerable: true,
	get: function() {
		return typescript.default;
	}
});

//# sourceMappingURL=index.cjs.map