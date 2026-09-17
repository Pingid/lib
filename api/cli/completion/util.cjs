//#region lib/api/src/cli/completion/util.ts
/** @example words('bun /app/cli.ts') // ['bun', '/app/cli.ts'] */
var words = (value) => typeof value === "string" ? value.split(/\s+/).filter(Boolean) : [...value];
/** Collapse whitespace, so a description can never break the tab-separated wire. */
var clean = (value) => {
	const text = value?.replace(/\s+/g, " ").trim();
	return text ? text : void 0;
};
/** A shell function name: `my-app` -> `my_app`. */
var slug = (name) => name.replace(/[^A-Za-z0-9_]/g, "_");
/** @example quote("it's") // "'it'\\''s'" */
var quote = (value) => `'${value.replace(/'/g, `'\\''`)}'`;
/** fish only honours `\\` and `\'` inside single quotes. */
var escape = (value) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
var key = (path) => path.join(" ");
/** Flags the walk must skip a token for. */
var takes = (entry) => entry.flags.filter((flag) => flag.takes).flatMap((f) => f.names);
/** Every non-kebab command spelling in the tree, paired with the canonical one. */
var aliases = (entries) => {
	const seen = /* @__PURE__ */ new Map();
	for (const entry of entries) for (const [from, to] of entry.aliases) seen.set(from, to);
	return [...seen];
};
/** Every flag spelling, long forms first. */
var names = (entry) => entry.flags.flatMap((flag) => flag.names);
/**
* Value specs keyed as the drivers look them up: a flag by each of its spellings, a
* positional by slot.
*
* @example specs(entry) // [[['--env', '-e'], ['dev', 'prod']], [['@0'], 'file']]
*/
var specs = (entry) => {
	const out = [];
	for (const flag of entry.flags) if (flag.takes && flag.spec !== void 0) out.push([flag.names, flag.spec]);
	for (const [index, spec] of entry.positionals.entries()) if (spec !== void 0) out.push([[`@${index}`], spec]);
	return out;
};
//#endregion
exports.aliases = aliases;
exports.clean = clean;
exports.escape = escape;
exports.key = key;
exports.names = names;
exports.quote = quote;
exports.slug = slug;
exports.specs = specs;
exports.takes = takes;
exports.words = words;

//# sourceMappingURL=util.cjs.map