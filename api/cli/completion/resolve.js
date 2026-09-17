import { kebab } from "../../core/text.js";
import "../arg.js";
import { tokenize } from "../core/token.js";
import { Parse } from "../core/parse.js";
import { clean } from "./util.js";
import { entry, spec } from "./table.js";
//#region lib/api/src/cli/completion/resolve.ts
/**
* Place the cursor. The last of `words` is the one being edited, and `words[0]` is NOT the
* binary — the caller strips it. Pure, synchronous, and never throws.
*
* @example site(root, ['build', '--env', 'd']).kind // 'value'
* @example site(root, ['']).commands                // true
*/
var site = (root, words) => {
	const word = words[words.length - 1] ?? "";
	const state = walk(root, words.slice(0, -1));
	const { cmd } = state;
	const base = {
		cmd,
		word,
		prefix: "",
		commands: false
	};
	if (state.pending) return {
		...base,
		kind: "value",
		arg: state.pending,
		spec: spec(cmd, state.pending)
	};
	const cursor = state.terminated ? void 0 : tokenize([word])[0];
	if (!state.terminated && word === "-") return {
		...base,
		kind: "flag"
	};
	if (!state.terminated && word === "--") return {
		...base,
		kind: "none"
	};
	if (cursor?.kind === "long") {
		if (cursor.inline === void 0) return {
			...base,
			kind: "flag"
		};
		const arg = lookup(cmd, cursor.name);
		if (!arg || arg.boolean()) return {
			...base,
			kind: "none"
		};
		const prefix = `--${cursor.name}=`;
		return {
			...base,
			kind: "value",
			word: cursor.inline,
			prefix,
			arg,
			spec: spec(cmd, arg)
		};
	}
	if (cursor?.kind === "short") {
		for (const [index, short] of [...cursor.body].entries()) {
			const arg = cmd.lookup(short);
			if (!arg || arg.boolean()) continue;
			const tail = cursor.body.slice(index + 1);
			const prefix = `-${cursor.body.slice(0, index + 1)}${cursor.inline === void 0 ? "" : "="}`;
			return {
				...base,
				kind: "value",
				word: cursor.inline ?? tail,
				prefix,
				arg,
				spec: spec(cmd, arg)
			};
		}
		return {
			...base,
			kind: "none"
		};
	}
	const slots = cmd.positional();
	const last = slots.length - 1;
	const slot = slots[last]?.variadic() === true && state.slot > last ? last : state.slot;
	const arg = slots[slot];
	return {
		...base,
		kind: "operand",
		slot,
		commands: state.routing && state.slot === 0,
		...arg ? {
			arg,
			spec: spec(cmd, arg)
		} : {}
	};
};
/**
* `site`, plus the values behind it. Never rejects — a thrown source is a wedged TAB key,
* so anything unexpected degrades to "offer nothing, let the shell complete filenames".
*/
var resolve = async (root, words, options = {}) => {
	const found = (() => {
		try {
			return site(root, words);
		} catch {
			return {
				cmd: root,
				kind: "none",
				word: "",
				prefix: "",
				commands: false
			};
		}
	})();
	try {
		const items = await candidates(found, words, options);
		const prefixed = found.prefix ? items.map((item) => ({
			...item,
			value: `${found.prefix}${item.value}`
		})) : items;
		return {
			site: found,
			items: prefixed,
			directive: directive(found, prefixed)
		};
	} catch {
		return {
			site: found,
			items: [],
			directive: "default"
		};
	}
};
var walk = (root, head) => {
	const state = {
		cmd: root,
		slot: 0,
		routing: true,
		terminated: false,
		pending: void 0
	};
	for (const token of tokenize(head)) {
		if (state.pending) {
			state.pending = void 0;
			continue;
		}
		if (token.kind === "terminator") {
			state.routing = false;
			state.terminated = true;
			continue;
		}
		if (token.kind === "operand") {
			const next = state.routing ? state.cmd.find(token.text) : void 0;
			if (next) {
				state.cmd = next;
				state.slot = 0;
			} else {
				state.routing = false;
				state.slot += 1;
			}
			continue;
		}
		const name = token.kind === "long" ? token.name : token.body;
		if (state.routing) {
			const global = Parse.global(state.cmd, name);
			if (global) {
				if (!global.boolean() && token.inline === void 0) state.pending = global;
				continue;
			}
			state.routing = false;
		}
		if (token.kind === "long") {
			const arg = lookup(state.cmd, name);
			if (arg && !arg.boolean() && token.inline === void 0) state.pending = arg;
			continue;
		}
		for (const [index, short] of [...token.body].entries()) {
			const arg = state.cmd.lookup(short);
			if (!arg || arg.boolean()) continue;
			if (!(token.body.slice(index + 1).length > 0 || token.inline !== void 0)) state.pending = arg;
			break;
		}
	}
	return state;
};
/** `cmd.lookup`, plus `parse`'s `--no-` fallback, which only applies to booleans. */
var lookup = (cmd, name) => {
	const direct = cmd.lookup(name);
	if (direct) return direct;
	if (!name.startsWith("no-")) return void 0;
	const candidate = cmd.lookup(name.slice(3));
	return candidate?.boolean() ? candidate : void 0;
};
var candidates = async (site, words, options) => {
	if (site.kind === "none") return [];
	if (site.kind === "flag") return flags(site, options);
	const values = await source(site, words);
	if (site.kind === "value") return values;
	return [...site.commands ? site.cmd.commands.map((child) => ({
		value: kebab(child.name),
		description: clean(child.description)
	})) : [], ...values];
};
var source = async (site, words) => {
	const spec = site.spec;
	if (spec === void 0 || typeof spec === "string") return [];
	if (typeof spec !== "function") return spec.map((value) => ({ value }));
	if (!site.arg) return [];
	return normalise(await spec({
		cmd: site.cmd,
		arg: site.arg,
		word: site.word,
		words
	}));
};
var flags = (site, options) => {
	const declared = entry(site.cmd, [], options.version === true && site.cmd.parent === void 0).flags;
	const items = declared.flatMap((flag) => flag.names.map((value) => ({
		value,
		description: flag.description
	})));
	if (!site.word.startsWith("--no")) return items;
	const negated = declared.filter((flag) => !flag.takes && flag.names[0]?.startsWith("--") && flag.names[0] !== "--help").map((flag) => ({
		value: `--no-${flag.names[0].slice(2)}`,
		description: flag.description
	}));
	return [...items, ...negated];
};
/** A tab or a newline would break the wire, so such a value is dropped rather than mangled. */
var normalise = (values) => values.map((value) => typeof value === "string" ? { value } : value).filter((item) => item.value !== "" && !/[\t\n\r]/.test(item.value)).map((item) => ({
	value: item.value,
	description: clean(item.description)
}));
var directive = (site, items) => {
	if (site.spec === "file" || site.spec === "dir") return site.prefix ? "default" : site.spec;
	if (site.kind === "none") return "none";
	return items.length > 0 ? "none" : "default";
};
//#endregion
export { resolve, site };

//# sourceMappingURL=resolve.js.map