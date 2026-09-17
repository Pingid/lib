import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
//#region lib/api/src/http/path.ts
var path_exports = /* @__PURE__ */ __exportAll({
	compile: () => compile,
	keys: () => keys,
	match: () => match
});
var PARAM = /^:([A-Za-z_$][\w$]*)(\{.*\})?(\?)?$/;
/**
* A path pattern to a regular expression, built segment by segment so a static segment
* carrying a regex metacharacter is escaped rather than silently becoming a wildcard.
*
* @example
* ```ts
* compile('/v1.0/:id').pattern.test('/v1X0/7') // false — the dot is literal
* ```
*/
var compile = (path) => {
	const names = [];
	let source = "";
	for (const segment of path.split("/")) {
		if (segment === "") continue;
		if (segment === "*") {
			names.push("*");
			source += "(?:/(.*))?";
			continue;
		}
		const found = PARAM.exec(segment);
		if (!found) {
			source += `/${escape(segment)}`;
			continue;
		}
		const [, name = "", constraint, optional] = found;
		names.push(name);
		const body = `(${constraint ? constraint.slice(1, -1) : "[^/]+"})`;
		source += optional ? `(?:/${body})?` : `/${body}`;
	}
	return {
		pattern: new RegExp(`^${source}/?$`),
		names
	};
};
/**
* The parameters a pathname supplies, or `undefined` when it does not match. An unsupplied
* optional is *omitted*, never `undefined`, so `required` and `default` behave as written.
* The only place path values are decoded.
*
* @example
* ```ts
* match(compile('/orgs/:org'), '/orgs/a%20b') // { org: 'a b' }
* match(compile('/u/:id?'), '/u') // {} — not { id: undefined }
* match(compile('/orgs/:org'), '/nope') // undefined
* ```
*/
var match = (compiled, pathname) => {
	const found = compiled.pattern.exec(pathname);
	if (!found) return void 0;
	const out = {};
	for (let index = 0; index < compiled.names.length; index += 1) {
		const value = found[index + 1];
		if (value !== void 0) out[compiled.names[index]] = decodeURIComponent(value);
	}
	return out;
};
/** The parameter names a pattern declares, in order. */
var keys = (path) => compile(path).names;
var escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//#endregion
export { compile, keys, match, path_exports };

//# sourceMappingURL=path.js.map