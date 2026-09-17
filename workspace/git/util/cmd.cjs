const require_recipe = require("../../util/recipe.cjs");
const require_shell = require("../../util/shell.cjs");
//#region lib/workspace/src/git/util/cmd.ts
var spec = (kind, name) => ({
	kind,
	name,
	value: void 0
});
/** A boolean switch. Optional in the builder, where `.amend()` means `.amend(true)`. */
var flag = (name) => spec("flag", name);
/** A switch that carries a value, e.g. `--message <msg>`. */
var value = (name) => spec("value", name);
/** An operand, e.g. the `<name>` in `git tag <name>`. Emitted after the switches. */
var positional = () => spec("positional");
var switch_of = (key, arg) => arg.name ?? `--${key.replace(/_/g, "-")}`;
/**
* Render a value object as argv, iterating the *declaration* rather than the values so the
* order is stable and unknown keys (`cwd`, anything a caller invented) can never leak into
* the command line.
*/
var to_args = (options, values) => {
	const flags = [];
	const operands = [];
	for (const [key, arg] of Object.entries(options)) {
		const value = values[key];
		if (value === void 0 || value === null || value === false) continue;
		if (arg.kind === "flag") flags.push(switch_of(key, arg));
		else if (arg.kind === "positional") operands.push(...Array.isArray(value) ? value.map(String) : [String(value)]);
		else flags.push(switch_of(key, arg), String(value));
	}
	return [...flags, ...operands];
};
/**
* Turn a subcommand and its options into a lazy builder: `commit({ cwd }).message('x').amend()`
* runs `git commit --message x --amend` in `cwd` and resolves with its stdout.
*/
var recipe = (params, options) => (init) => require_recipe.Recipe.create({
	options: {
		...options,
		cwd: void 0
	},
	resolve: (opts, key, value) => {
		const arg = options[key];
		const set = value === void 0 && arg?.kind === "flag" ? true : value;
		return {
			...opts,
			[key]: set
		};
	},
	execute: ({ cwd, ...rest }) => require_shell.Shell.sho("git", [...params, ...to_args(options, rest)], { cwd })
}, init);
//#endregion
exports.flag = flag;
exports.positional = positional;
exports.recipe = recipe;
exports.to_args = to_args;
exports.value = value;

//# sourceMappingURL=cmd.cjs.map