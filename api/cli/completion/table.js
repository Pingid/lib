import { kebab } from "../../core/text.js";
import "../arg.js";
import { clean } from "./util.js";
//#region lib/api/src/cli/completion/table.ts
/**
* Flatten the tree into one entry per reachable command path.
*
* @example of(root).map((entry) => entry.path.join(' ')) // ['', 'deploy', 'deploy api']
*/
var of = (root, options = {}) => {
	const entries = [];
	const walk = (cmd, path) => {
		entries.push(entry(cmd, path, options.version === true && cmd === root));
		for (const child of cmd.commands) walk(child, [...path, kebab(child.name)]);
	};
	walk(root, []);
	return entries;
};
/** One command's own answers. Exported so `resolve` builds candidates the same way. */
var entry = (cmd, path, version) => {
	const positional = cmd.positional();
	const stop = positional.findIndex((arg) => arg.variadic());
	const slots = stop === -1 ? positional : positional.slice(0, stop + 1);
	return {
		path,
		commands: cmd.commands.map((child) => ({
			value: kebab(child.name),
			description: clean(child.description)
		})),
		flags: flags(cmd, version),
		positionals: slots.map((arg) => flatten(spec(cmd, arg))),
		variadic: stop !== -1,
		aliases: cmd.commands.filter((child) => kebab(child.name) !== child.name).map((child) => [child.name, kebab(child.name)])
	};
};
var flags = (cmd, version) => {
	const declared = [...cmd.flags(), ...cmd.globals()].map((arg) => ({
		names: [`--${arg.flag()}`, ...arg.aliases().map((alias) => `-${alias}`)],
		description: clean(arg.summary()),
		takes: !arg.boolean(),
		spec: flatten(spec(cmd, arg))
	}));
	const help = "Show this help message";
	const synthetic = [];
	if (!cmd.lookup("help")) synthetic.push({
		names: ["--help"],
		description: help,
		takes: false
	});
	if (!cmd.lookup("h")) synthetic.push({
		names: ["-h"],
		description: help,
		takes: false
	});
	if (version) synthetic.push({
		names: ["--version"],
		description: "Show version number",
		takes: false
	});
	return [...declared, ...synthetic];
};
/** A function cannot be baked into a script, so the drivers call back for it instead. */
var flatten = (value) => typeof value === "function" ? "call" : value;
/** An override on the declaring command wins, so a global can be set once at the root. */
var spec = (cmd, arg) => {
	for (let node = cmd; node; node = node.parent) {
		const found = node.completions.get(arg.name);
		if (found !== void 0) return found;
	}
	return arg.completion();
};
//#endregion
export { entry, flags, of, spec };

//# sourceMappingURL=table.js.map