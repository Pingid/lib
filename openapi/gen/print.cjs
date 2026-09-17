const require_ast = require("./ast.cjs");
const require_emit = require("./emit.cjs");
//#region lib/openapi/src/gen/print.ts
/** Renders the model as TypeScript source. */
var print = (api, options = {}) => (options.banner ?? Banner) + require_ast.print(nodes(api, options));
/** Renders the model as AST, for callers splicing it into a larger file. */
var nodes = (api, options = {}) => {
	const bound = require_emit.bind(api);
	return options.emit ? options.emit(bound) : require_emit.Emit.file(bound, options);
};
var Banner = "/** Generated from an OpenAPI document. Do not edit. */\n\n";
//#endregion
exports.nodes = nodes;
exports.print = print;

//# sourceMappingURL=print.cjs.map