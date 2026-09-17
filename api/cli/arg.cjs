const require_text = require("../core/text.cjs");
const require_coerce = require("../core/coerce.cjs");
const require_error = require("./core/error.cjs");
//#region lib/api/src/cli/arg.ts
/**
* A single named input: its JSON Schema fragment plus how it arrives on the command
* line. Standalone — an arg does not know which command it belongs to, so it can be
* declared once and reused.
*/
var Arg = class Arg {
	name;
	json;
	required;
	positional;
	/** Kept off `json`: a function has to survive here once dynamic sources land. */
	complete;
	constructor(name, json, options = {}) {
		const { required, positional, alias, complete, ...rest } = options;
		this.name = name;
		this.json = { ...json };
		this.required = required ?? false;
		this.positional = positional ?? false;
		this.complete = complete;
		for (const [key, value] of Object.entries(rest)) if (value !== void 0) this.json[key] = value;
		if (alias !== void 0) this.json["alias"] = alias;
	}
	static of(name, json, options) {
		return new Arg(name, json, options);
	}
	static string(name, options) {
		return new Arg(name ?? "", { type: "string" }, options);
	}
	static number(name, options) {
		return new Arg(name ?? "", { type: "number" }, options);
	}
	static integer(name, options) {
		return new Arg(name ?? "", { type: "integer" }, options);
	}
	/** Never consumes a following token; accepts `--no-` negation. */
	static boolean(name, options) {
		return new Arg(name ?? "", { type: "boolean" }, options);
	}
	static enum(values, name, options) {
		return new Arg(name ?? "", { enum: [...values] }, options);
	}
	/** Repeats as a flag (`--tag a --tag b`), or soaks up the remaining positionals. */
	static array(items, name, options) {
		return new Arg(name ?? "", {
			type: "array",
			items: items.json
		}, options);
	}
	/** A JSON literal, parsed from the token. */
	static json(name, options) {
		return new Arg(name ?? "", { type: "object" }, options);
	}
	/** Lift a property of an object schema, taking requiredness from its parent. */
	static from(name, json, required = false) {
		const arg = new Arg(name, json);
		arg.required = required && json.default === void 0;
		return arg;
	}
	get description() {
		return this.json.description;
	}
	default() {
		return this.json.default;
	}
	type() {
		const type = this.json.type;
		return Array.isArray(type) ? type.find((entry) => entry !== "null") : type;
	}
	boolean() {
		return this.type() === "boolean";
	}
	variadic() {
		return this.type() === "array";
	}
	/** `enum`, or a union of `const` branches — TypeBox emits literal unions as `anyOf`. */
	choices() {
		return require_coerce.choices(this.json) ?? (this.json.items ? require_coerce.choices(this.json.items) : void 0);
	}
	/**
	* @example Arg.string('path', { complete: 'file' }).completion() // 'file'
	* @example Arg.enum(['dev', 'prod'], 'env').completion() // ['dev', 'prod']
	* @example Arg.boolean('force').completion() // ['true', 'false']
	*/
	completion() {
		if (this.complete !== void 0) return this.complete;
		const options = this.choices();
		if (options) return options.map(require_text.format);
		return this.boolean() ? ["true", "false"] : void 0;
	}
	aliases() {
		const raw = this.json["alias"] ?? this.json["short"];
		if (typeof raw === "string") return [raw];
		if (Array.isArray(raw)) return raw.filter((entry) => typeof entry === "string");
		return [];
	}
	flag() {
		return require_text.kebab(this.name);
	}
	matches(token) {
		return token === this.name || token === this.flag() || this.aliases().includes(token);
	}
	/** How the arg is named in errors. */
	token() {
		return this.positional ? this.placeholder() : `--${this.flag()}`;
	}
	placeholder() {
		const inner = this.variadic() ? `${this.flag()}...` : this.flag();
		return this.required ? `<${inner}>` : `[${inner}]`;
	}
	hint() {
		const options = this.choices();
		const items = this.json.items?.type;
		const inner = options ? options.map(require_text.format).join("|") : (this.variadic() ? Array.isArray(items) ? items[0] : items : this.type()) ?? "value";
		return this.variadic() ? `<${inner}...>` : `<${inner}>`;
	}
	/** The left column of the options list. */
	label() {
		const names = [...this.aliases().map((alias) => `-${alias}`), `--${this.flag()}`].join(", ");
		return this.boolean() ? names : `${names} ${this.hint()}`;
	}
	/** The right column: description, then defaults and requiredness. */
	summary() {
		const notes = [];
		const fallback = this.default();
		if (fallback !== void 0) notes.push(`default: ${require_text.format(fallback)}`);
		const options = this.choices();
		if (options && this.positional) notes.push(`choices: ${options.map(require_text.format).join(", ")}`);
		if (this.required) notes.push("required");
		return [this.description, notes.length > 0 ? `(${notes.join(", ")})` : void 0].filter(Boolean).join(" ");
	}
	/** Collected tokens to a typed value. Last one wins unless the arg is variadic. */
	decode(tokens) {
		if (this.variadic()) return tokens.map((token) => this.coerce(this.json.items ?? {}, token));
		return this.coerce(this.json, tokens[tokens.length - 1]);
	}
	/** `Coerce.token` decides; this only turns its expectation into the command-line message. */
	coerce(json, token$1) {
		const result = require_coerce.token(json, token$1);
		if (!result.ok) throw this.invalid(token$1, result.error);
		return result.value;
	}
	/** No `cmd` — `Parse` attaches it with `CliError.at` once it knows. */
	invalid(token, expected) {
		return new require_error.CliError(`Invalid value '${token}' for ${this.token()}: expected ${expected}`, { code: "invalid-value" });
	}
};
//#endregion
exports.Arg = Arg;
exports.format = require_text.format;
exports.kebab = require_text.kebab;

//# sourceMappingURL=arg.cjs.map