import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import { io, ok, run, sh, sho } from "../shell/mod.js";
//#region lib/workspace/src/tcli/tcli.ts
/**
* Typed, lazily-built wrappers for command-line programs.
*
* ```ts
* const git = cli('git')
* const CommitOpts = { message: value(), amend: flag(), no_verify: flag() }
* export const commit = git(['commit'], CommitOpts)
*
* await commit({ cwd }).message('wip').amend()   // git commit --message wip --amend
* commit.argv({ message: 'wip' })                // ['git', 'commit', '--message', 'wip']
* ```
*
* A spec declares how each option renders; the builder gets one method per option plus one
* per {@link ShellOptions} key (`cwd`, `env`, `timeout`, …), and runs the command once, when
* it is first awaited.
*/
var tcli_exports = /* @__PURE__ */ __exportAll({
	cli: () => cli,
	flag: () => flag,
	positional: () => positional,
	to_args: () => to_args,
	value: () => value
});
/**
* Bind a program, returning a factory for its commands: `factory(params, spec, mode?)`.
* `params` is the fixed prefix (`['commit']`, `['remote', 'add']`); `mode` picks the
* {@link Shell} runner — `sho` (stdout, throws on failure) by default — or takes a {@link Runner}.
*/
var cli = (program, config = {}) => (params, spec, mode) => {
	for (const key of Object.keys(spec)) if (RESERVED.has(key)) throw new TypeError(`${[program, ...params].join(" ")}: "${key}" is reserved; use another key and set the switch with name, e.g. value('--${key}')`);
	const run = typeof mode === "function" ? mode : RUNNERS[mode ?? "sho"];
	const prefix = [...config.args ?? [], ...params];
	const methods = /* @__PURE__ */ new Set([...Object.keys(spec), ...Object.keys(CONTEXT)]);
	const fold = (state, key, v) => ({
		...state,
		[key]: v === void 0 && Object.hasOwn(spec, key) && spec[key].kind === "flag" ? true : v
	});
	const execute = (state) => {
		const shell = { ...config.shell };
		for (const key of Object.keys(CONTEXT)) if (state[key] !== void 0) shell[key] = state[key];
		if (config.shell?.env && state["env"]) shell["env"] = {
			...config.shell.env,
			...state["env"]
		};
		return run(program, [...prefix, ...to_args(spec, state)], shell);
	};
	const build = (state) => {
		let pending;
		const once = () => pending ??= new Promise((resolve) => resolve(execute(state)));
		return new Proxy(Object.create(null), { get: (_, prop) => {
			if (typeof prop !== "string") return void 0;
			if (THEN.includes(prop)) {
				const p = once();
				return p[prop].bind(p);
			}
			if (!methods.has(prop)) return void 0;
			return (v) => build(fold(state, prop, v));
		} });
	};
	const command = (init = {}) => build({ ...init });
	return Object.assign(command, {
		argv: (values = {}) => [
			program,
			...prefix,
			...to_args(spec, values)
		],
		spec
	});
};
/** A boolean switch. In the builder, `.amend()` means `.amend(true)`. */
var flag = (name) => ({
	kind: "flag",
	name
});
/** A switch that carries a value, e.g. `--message <msg>`. An array type repeats the switch. */
var value = (name, options = {}) => ({
	kind: "value",
	name,
	...options
});
/** An operand, e.g. the `<name>` in `git tag <name>`. An array type spreads into several. */
var positional = (options = {}) => ({
	kind: "positional",
	...options
});
var switch_of = (key, arg) => arg.name ?? `--${key.replace(/_/g, "-")}`;
/**
* Render a value object as argv. Iterates the *spec* rather than the values, so the order is
* stable and keys the spec doesn't declare (`cwd`, anything a caller invented) never leak in.
* `undefined`, `null` and `false` all mean "leave it out".
*/
var to_args = (spec, values) => {
	const switches = [];
	const operands = [];
	let separated = false;
	for (const [key, arg] of Object.entries(spec)) {
		const v = values[key];
		if (v === void 0 || v === null || v === false) continue;
		const list = (Array.isArray(v) ? v : [v]).map(String);
		if (arg.kind === "flag") switches.push(switch_of(key, arg));
		else if (arg.kind === "value") {
			const sw = switch_of(key, arg);
			for (const x of list) arg.eq ? switches.push(`${sw}=${x}`) : switches.push(sw, x);
		} else if (list.length) {
			if (arg.dashdash && !separated) operands.push("--");
			separated ||= !!arg.dashdash;
			operands.push(...list);
		}
	}
	return [...switches, ...operands];
};
/** Every shell option is also settable on a command, so none can be an option name. */
var CONTEXT = {
	cwd: true,
	env: true,
	input: true,
	stdio: true,
	timeout: true,
	signal: true
};
/** Promise methods the builder forwards rather than treating as options. */
var THEN = [
	"then",
	"catch",
	"finally"
];
var RESERVED = /* @__PURE__ */ new Set([...Object.keys(CONTEXT), ...THEN]);
var RUNNERS = {
	sho,
	sh,
	run,
	ok,
	io
};
//#endregion
export { cli, flag, positional, tcli_exports, to_args, value };

//# sourceMappingURL=tcli.js.map