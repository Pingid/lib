import { print as print$1 } from "./ast.js";
import { Emit, bind } from "./emit.js";
//#region lib/openapi/src/gen/print.ts
/** Renders the model as TypeScript source. */
var print = (api, options = {}) => (options.banner ?? Banner) + print$1(nodes(api, options));
/** Renders the model as AST, for callers splicing it into a larger file. */
var nodes = (api, options = {}) => {
	const lost = Emit.unresolved(api);
	if (lost.length && !options.silent) console.warn(`Emitting unknown for ${lost.length} reference(s) with nothing behind them:\n  ${lost.join("\n  ")}`);
	const bound = bind(api);
	return options.emit ? options.emit(bound) : Emit.file(bound, options);
};
var Banner = "/** Generated from an OpenAPI document. Do not edit. */\n\n";
//#endregion
export { nodes, print };

//# sourceMappingURL=print.js.map