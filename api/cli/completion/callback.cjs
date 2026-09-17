const require_render = require("../core/render.cjs");
const require_resolve = require("./resolve.cjs");
//#region lib/api/src/cli/completion/callback.ts
/** Leading dashes keep it clear of any declared subcommand, and out of help. */
var MARKER = "__complete";
/**
* The `__complete` protocol: one candidate per line as `value<TAB>description`, then a
* `:directive` trailer that is always present.
*
* Always resolves 0. A non-zero exit is indistinguishable from a missing binary, and
* would make every driver fall back for the wrong reason.
*
* @example callback(root, ['--', 'build', '--env', '']) // 'dev\nprod\n:none\n'
*/
var callback = async (root, argv, options = {}) => {
	const render = require_render.Render.from(options.out);
	try {
		const rest = argv[0] === "--" ? argv.slice(1) : argv;
		const result = await require_resolve.resolve(root, rest.length > 0 ? rest : [""], options);
		for (const item of result.items) render.line(item.description ? `${item.value}\t${item.description}` : item.value);
		render.line(`:${result.directive}`);
	} catch {
		render.line(":default");
	}
	return 0;
};
//#endregion
exports.MARKER = MARKER;
exports.callback = callback;

//# sourceMappingURL=callback.cjs.map