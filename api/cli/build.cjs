const require_register = require("../core/register.cjs");
const require_api = require("../core/util/api.cjs");
require("../core/util/index.cjs");
const require_build = require("../core/build.cjs");
require("../core/index.cjs");
//#region lib/api/src/cli/build.ts
/**
* Put anything into a command tree.
*
* A `Cmd` is compiled to the operation it describes. An operation or a namespace
* built with `@lickle/api` is already one and passes straight through, so a
* tree can mix commands written for this target with operations written for no
* target in particular.
*/
var cmd = (p) => {
	if (!isCmd(p)) return p;
	const properties = {};
	for (const [key, arg] of Object.entries(p.args)) {
		const type = arg.type;
		if (arg.description !== void 0) require_register.update(type, { description: arg.description });
		const field = {};
		if (arg.short !== void 0) field.short = arg.short;
		if (arg.aliases !== void 0) field.aliases = arg.aliases;
		if (Object.keys(field).length > 0) require_register.update(type, { meta: { cli: [field] } });
		properties[key] = type;
	}
	const operation = require_build.t.op({
		name: p.name,
		description: p.description,
		in: require_build.t.object(properties),
		out: require_build.t.empty(),
		handle: p.handle
	});
	if (p.positional !== void 0) require_register.update(operation, { meta: { cli: [{ positionals: p.positional }] } });
	return require_api.on(p, operation);
};
/** A command written here has `args`; an operation or a namespace does not. */
var isCmd = (p) => typeof p === "object" && p !== null && "args" in p && "handle" in p;
var flag = (description) => require_build.t.boolean(description);
var string = (description) => require_build.t.string(description);
var num = (description) => require_build.t.number(description);
/** A closed set: the handler sees the members, not just `string`. */
var choice = (members, description) => require_build.t.set(members, description);
/**
* Repeated on the command line: `-t home -t errands`. Absent means empty.
*
* The item-less form is a separate, non-generic signature on purpose: an arg's
* declared type is `Cmd.Type`, and a generic return would be inferred from that
* context — making `list()` a list of anything a command line can express
* rather than a list of strings.
*/
var list = (of, description) => typeof of === "object" ? require_build.t.array(of, description) : require_build.t.array(string(), of);
/** May be left out entirely, which is not the same as having a default. */
var optional = (of, description) => require_build.t.union([of, require_build.t.undefined()], description);
//#endregion
exports.choice = choice;
exports.cmd = cmd;
exports.flag = flag;
exports.list = list;
exports.num = num;
exports.optional = optional;
exports.string = string;

//# sourceMappingURL=build.cjs.map