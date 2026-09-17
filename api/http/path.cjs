//#region lib/api/src/http/path.ts
var PARAM = /^:([A-Za-z_$][\w$]*)(\{.*\})?(\?)?$/;
/**
* A path pattern to a regular expression.
*
* Built segment by segment rather than by substitution into the whole string, so a static
* segment carrying a regex metacharacter — `/v1.0/` — is escaped instead of silently becoming
* a wildcard.
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
* The parameters a pathname supplies, or `undefined` when it does not match.
*
* An optional parameter that was not supplied is *omitted*, never set to `undefined`, so a
* schema's `required` and `default` keywords behave as written. Values are decoded here, which
* makes this the only place that does so.
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
var Path = {
	compile,
	match,
	keys
};
//#endregion
exports.Path = Path;

//# sourceMappingURL=path.cjs.map