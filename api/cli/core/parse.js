import { CliError } from "./error.js";
import { tokenize } from "./token.js";
//#region lib/api/src/cli/core/parse.ts
/**
* Walk subcommands off the front of `argv`.
*
* Global options are allowed to appear before the subcommand — `app --use-stderr group
* op1` — since they can be resolved by name against this node's ancestors and its whole
* subtree. They are lifted out and handed to the leaf's parse, which is the only place
* that knows whether the option actually applies. Any other flag stops the walk, so an
* unknown one is reported against the node that would own it.
*/
var route = (root, argv) => {
	const items = tokenize(argv);
	let cmd = root;
	let index = 0;
	const leading = [];
	while (index < items.length) {
		const token = items[index];
		if (token.kind === "terminator") break;
		if (token.kind === "long" || token.kind === "short") {
			const arg = global(cmd, token.kind === "long" ? token.name : token.body);
			if (!arg) break;
			leading.push(token.text);
			index += 1;
			if (!arg.boolean() && token.inline === void 0 && index < items.length) leading.push(items[index++].text);
			continue;
		}
		const next = cmd.find(token.text);
		if (!next) break;
		cmd = next;
		index += 1;
	}
	return {
		cmd,
		argv: [...leading, ...argv.slice(index)]
	};
};
/** What `route` accepts ahead of a subcommand: an option from here up, or from anywhere below. */
var global = (cmd, name) => [...cmd.globals(), ...cmd.subtree()].find((arg) => arg.matches(name));
/**
* Turn the remaining argv into the command's input.
*
* `--flag value` · `--flag=value` · `--no-flag` · `-abc` · `-n5` · `-n=5` · `--`
*
* Repeated flags append when the arg is an array; otherwise the last one wins.
*/
var parse = (cmd, argv) => {
	const items = tokenize(argv);
	const tokens = /* @__PURE__ */ new Map();
	const loose = [];
	const inherited = new Set(cmd.globals());
	let help = false;
	let version = false;
	const collect = (arg, value) => {
		const existing = tokens.get(arg);
		if (existing) existing.push(value);
		else tokens.set(arg, [value]);
	};
	const consume = (index, flag, inline) => {
		if (inline !== void 0) return [inline, index];
		const next = argv[index + 1];
		if (next === void 0) throw new CliError(`Option '${flag}' expects a value`, {
			code: "missing-value",
			cmd
		});
		return [next, index + 1];
	};
	for (let index = 0; index < items.length; index++) {
		const token = items[index];
		if (token.kind === "terminator") continue;
		if (token.kind === "operand") {
			loose.push(token.text);
			continue;
		}
		if (token.kind === "long") {
			const { name, inline } = token;
			if (name === "help" && !cmd.lookup("help")) {
				help = true;
				continue;
			}
			if (name === "version" && !cmd.lookup("version")) {
				version = true;
				continue;
			}
			let negated = false;
			let arg = cmd.lookup(name);
			if (!arg && name.startsWith("no-")) {
				const candidate = cmd.lookup(name.slice(3));
				if (candidate?.boolean()) {
					arg = candidate;
					negated = true;
				}
			}
			if (!arg) throw new CliError(unknownOption(`--${name}`, cmd), {
				code: "unknown-option",
				cmd
			});
			if (arg.boolean()) {
				collect(arg, inline ?? String(!negated));
				continue;
			}
			const [value, next] = consume(index, `--${name}`, inline);
			collect(arg, value);
			index = next;
			continue;
		}
		const { body, inline } = token;
		for (let position = 0; position < body.length; position++) {
			const short = body[position];
			if (short === "h" && !cmd.lookup("h")) {
				help = true;
				continue;
			}
			const arg = cmd.lookup(short);
			if (!arg) throw new CliError(unknownOption(`-${short}`, cmd), {
				code: "unknown-option",
				cmd
			});
			if (arg.boolean()) {
				collect(arg, "true");
				continue;
			}
			const trailing = body.slice(position + 1);
			const [value, next] = trailing.length > 0 ? [trailing, index] : consume(index, `-${short}`, inline);
			collect(arg, value);
			index = next;
			position = body.length;
		}
	}
	let taken = 0;
	for (const arg of cmd.positional()) {
		if (arg.variadic()) {
			for (const item of loose.slice(taken)) collect(arg, item);
			taken = loose.length;
			break;
		}
		if (taken >= loose.length) break;
		collect(arg, loose[taken++]);
	}
	if (help || version) return {
		cmd,
		input: {},
		context: {},
		help,
		version
	};
	if (taken < loose.length) {
		const extra = loose[taken];
		if (cmd.commands.length > 0) throw new CliError(unknownCommand(extra, cmd), {
			code: "unknown-command",
			cmd
		});
		throw new CliError(`Unexpected argument '${extra}'`, {
			code: "unexpected-argument",
			cmd
		});
	}
	const input = {};
	const context = {};
	const missing = [];
	for (const arg of [...cmd.args, ...cmd.globals()]) {
		const into = inherited.has(arg) ? context : input;
		const collected = tokens.get(arg);
		if (collected === void 0) {
			const fallback = arg.default();
			if (fallback !== void 0) into[arg.name] = fallback;
			else if (arg.required) missing.push(arg);
			continue;
		}
		try {
			into[arg.name] = arg.decode(collected);
		} catch (error) {
			throw error instanceof CliError ? error.at(cmd) : error;
		}
	}
	if (missing.length > 0) {
		const names = missing.map((arg) => arg.token()).join(", ");
		const noun = missing.length === 1 ? "argument" : "arguments";
		throw new CliError(`Missing required ${noun}: ${names}`, {
			code: "missing-argument",
			cmd
		});
	}
	return {
		cmd,
		input,
		context,
		help,
		version
	};
};
var unknownOption = (flag, cmd) => {
	const near = closest(flag.replace(/^-+/, ""), [...cmd.flags(), ...cmd.globals()].map((arg) => arg.flag()));
	return `Unknown option '${flag}'${near ? `. Did you mean '--${near}'?` : ""}`;
};
var unknownCommand = (name, cmd) => {
	const near = closest(name, cmd.commands.map((child) => child.name));
	return `Unknown command '${name}'${near ? `. Did you mean '${near}'?` : ""}`;
};
var closest = (value, candidates) => {
	let best;
	let score = Infinity;
	for (const candidate of candidates) {
		const cost = distance(value, candidate);
		if (cost < score) {
			score = cost;
			best = candidate;
		}
	}
	return score <= Math.max(2, Math.floor(value.length / 3)) ? best : void 0;
};
var distance = (a, b) => {
	const row = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let diagonal = row[0];
		row[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const previous = row[j];
			row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
			diagonal = previous;
		}
	}
	return row[b.length];
};
var Parse = {
	route,
	parse,
	global
};
//#endregion
export { Parse, global, parse, route };

//# sourceMappingURL=parse.js.map