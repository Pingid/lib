const require_schema = require("../../core/util/schema.cjs");
const require_api = require("../../core/util/api.cjs");
require("../../core/util/index.cjs");
require("../../core/index.cjs");
const require_fields = require("./fields.cjs");
//#region lib/api/src/cli/core/help.ts
var GLOBAL_OPTIONS = [["-h, --help", "Show this help."], ["-o, --output <text|json>", "Output format. (default: text)"]];
/** Help for a namespace: the commands it holds, plus the global options. */
var namespaceHelp = (ns, path) => {
	const sections = [];
	if (ns.description) sections.push(ns.description);
	sections.push(`Usage: ${path.join(" ")} <command> [options]`);
	const commands = ns.operations.map((c) => require_api.of(c)).map((child) => [child.name, child.description ?? ""]);
	if (commands.length > 0) sections.push(section("Commands", commands));
	sections.push(section("Options", GLOBAL_OPTIONS));
	return sections.join("\n\n");
};
/** Help for a single operation: its arguments, its options and what it returns. */
var operationHelp = (op, path) => {
	const { fields, positionals } = require_fields.inputsOf(op);
	const byKey = new Map(fields.map((f) => [f.key, f]));
	const sections = [];
	if (op.description) sections.push(op.description);
	const placed = positionals.map((key) => token(key, byKey.get(key)));
	sections.push([
		`Usage: ${path.join(" ")}`,
		"[options]",
		...placed
	].join(" "));
	const args = [];
	for (const key of positionals) {
		const field = byKey.get(key);
		if (field === void 0) continue;
		args.push([token(key, field), annotate(field.description, require_fields.typeLabel(field.shape), defaultNote(field))]);
	}
	if (args.length > 0) sections.push(section("Arguments", args));
	const options = fields.filter((field) => !positionals.includes(field.key)).map((field) => [flags(field), annotate(field.description, defaultNote(field) ?? requiredNote(field))]);
	sections.push(section("Options", [...options, ...GLOBAL_OPTIONS]));
	const output = outputSection(op);
	if (output !== void 0) sections.push(output);
	return sections.join("\n\n");
};
/**
* What the command prints. An operation returning a record lists its fields; one
* returning a single value shows its type; one returning nothing says nothing.
*/
var outputSection = (op) => {
	if (op.out === void 0) return void 0;
	const json$1 = require_schema.json(op.out);
	if (require_schema.isNothing(json$1)) return void 0;
	const title = op.out.returns === "async-iter" ? "Output (streamed)" : "Output";
	const properties = Object.entries(json$1.properties ?? {});
	if (properties.length > 0) return section(title, properties.map(([key, property]) => [key, annotate(property.description ?? "", require_fields.typeLabel(require_schema.shape(property)))]));
	return section(title, [[require_fields.typeLabel(require_schema.shape(json$1)), json$1.description ?? ""]]);
};
/** Usage token for a positional: `<name>`, `[name]` or `[name...]`. */
var token = (key, field) => {
	if (field === void 0) return `<${key}>`;
	if (field.shape.list) return `[${key}...]`;
	return field.required ? `<${key}>` : `[${key}]`;
};
/**
* Flag column for an option: shorts first, then the long spellings. Options with
* no short flag are indented so the long ones line up.
*/
var flags = (field) => {
	const shorts = field.names.filter((n) => n.length === 1).map((n) => `-${n}`);
	const longs = field.names.filter((n) => n.length > 1).map((n) => `--${n}`);
	const names = [...shorts, ...longs].join(", ");
	const column = shorts.length > 0 ? names : `    ${names}`;
	return field.shape.type === "boolean" ? column : `${column} <${require_fields.valueLabel(field.shape)}>`;
};
var defaultNote = (field) => field.default === void 0 ? void 0 : `default: ${JSON.stringify(field.default)}`;
var requiredNote = (field) => field.required ? "required" : "";
var annotate = (text, ...notes) => {
	const kept = notes.filter((n) => n !== void 0 && n !== "");
	return kept.length > 0 ? `${text} (${kept.join(", ")})`.trimStart() : text;
};
var section = (title, rows) => {
	const width = Math.max(0, ...rows.map(([left]) => left.length));
	const lines = rows.map(([left, right]) => `  ${left.padEnd(width)}  ${right}`.trimEnd());
	return [`${title}:`, ...lines].join("\n");
};
//#endregion
exports.namespaceHelp = namespaceHelp;
exports.operationHelp = operationHelp;

//# sourceMappingURL=help.cjs.map