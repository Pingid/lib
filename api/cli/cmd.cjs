const require_schema = require("../core/schema.cjs");
require("../core/index.cjs");
const require_text = require("../core/text.cjs");
const require_error = require("./core/error.cjs");
const require_arg = require("./arg.cjs");
const require_parse = require("./core/parse.cjs");
const require_help = require("./core/help.cjs");
//#region lib/api/src/cli/cmd.ts
/**
* A command: zero or more args of its own, zero or more subcommands, and optionally a
* handler. All three are independent — a node with subcommands can still take args, and
* a node with a handler can still nest.
*/
var Cmd = class Cmd {
	name;
	description;
	usage;
	parent;
	/** This command's own input. */
	args = [];
	/** Options this command contributes to itself and its subtree. */
	shared = [];
	commands = [];
	/** Completion sources by arg name. The only route for args that came from a schema. */
	completions = /* @__PURE__ */ new Map();
	/** Set when the input came from a schema, so `validate` has something to run. */
	schema;
	handler;
	_positionals;
	constructor(name) {
		this.name = name;
	}
	static build(name) {
		return new Cmd(name);
	}
	/** Pass through a `Cmd`, or convert an api-shaped node. */
	static from(node) {
		if (node instanceof Cmd) return node;
		const cmd = new Cmd(node.name);
		cmd.description = node.description;
		cmd.usage = node.usage;
		cmd.handler = node.handle;
		if (node.in) cmd.in(node.in);
		if (node.options) cmd.options(node.options);
		if (node.positionals) cmd.positional([...node.positionals]);
		if (node.completions) cmd.complete(node.completions);
		for (const child of node.methods ?? []) cmd.with(child);
		return cmd;
	}
	describe(description) {
		this.description = description;
		return this;
	}
	/** Replaces the derived usage line verbatim. */
	use(usage) {
		this.usage = usage;
		return this;
	}
	arg(...args) {
		for (const arg of args) this.args.push(arg);
		this.sync();
		return this;
	}
	in(schema) {
		const json = require_schema.toJson(schema);
		if (json.type !== void 0 && json.type !== "object") throw new Error(`Input schema for '${this.name}' must be an object`);
		const required = new Set(json.required ?? []);
		this.schema = schema;
		this.args = Object.entries(json.properties ?? {}).map(([key, value]) => require_arg.Arg.from(key, value, required.has(key)));
		this.sync();
		return this;
	}
	/** Options inherited by this command and its subtree; their values arrive as context. */
	option(...args) {
		for (const arg of args) this.shared.push(arg);
		return this;
	}
	options(schema) {
		const json = require_schema.toJson(schema);
		const required = new Set(json.required ?? []);
		for (const [key, value] of Object.entries(json.properties ?? {})) this.shared.push(require_arg.Arg.from(key, value, required.has(key)));
		return this;
	}
	/**
	* Attach completion sources to args this command declared.
	*
	* @example Cmd.build('deploy').in(Input).complete({ env: ['dev', 'prod'], config: 'file' })
	*/
	complete(sources) {
		for (const [name, source] of Object.entries(sources)) {
			if (![...this.args, ...this.shared].some((arg) => arg.name === name)) throw new Error(`Unknown arg '${name}' on command '${this.name}'`);
			this.completions.set(name, source);
		}
		return this;
	}
	/** Declare what this command needs from `run`'s context, beyond what options supply. */
	context() {
		return this;
	}
	handle(handler) {
		this.handler = handler;
		return this;
	}
	/** Mounts a child, reparenting it. Ancestors' options cover the child's context. */
	with(...children) {
		for (const child of children) {
			const node = Cmd.from(child);
			node.parent = this;
			this.commands.push(node);
		}
		return this;
	}
	positional(names) {
		if (names === void 0) return this.positionals().map((name) => this.args.find((arg) => arg.name === name)).filter((arg) => arg !== void 0);
		this._positionals = [...names];
		this.sync();
		return this;
	}
	positionals() {
		if (this._positionals) return this._positionals.filter((name) => this.args.some((arg) => arg.name === name));
		return this.args.filter((arg) => arg.positional).map((arg) => arg.name);
	}
	/** Own args that arrive as flags. */
	flags() {
		const positional = new Set(this.positionals());
		return this.args.filter((arg) => !positional.has(arg.name));
	}
	/** Options contributed by this command and every ancestor, outermost first. */
	globals() {
		return this.parent ? [...this.parent.globals(), ...this.shared] : [...this.shared];
	}
	/** Options declared anywhere below here — what `route` will accept ahead of a subcommand. */
	subtree() {
		return [...this.shared, ...this.commands.flatMap((child) => child.subtree())];
	}
	path() {
		return this.parent ? [...this.parent.path(), this.name] : [this.name];
	}
	root() {
		return this.parent ? this.parent.root() : this;
	}
	rename(name) {
		this.name = name;
		return this;
	}
	find(name) {
		return this.commands.find((child) => child.name === name || require_text.kebab(child.name) === name);
	}
	/** Resolve a long name, kebab form, or short alias against own args, then globals. */
	lookup(token) {
		return this.args.find((arg) => arg.matches(token)) ?? this.globals().find((arg) => arg.matches(token));
	}
	parse(argv) {
		return require_parse.Parse.parse(this, argv);
	}
	/** Schema validation, when a schema was supplied. Argv coercion has already happened. */
	async validate(input) {
		if (this.schema === void 0) return input;
		const result = await require_schema.validate(input, this.schema);
		if (result.ok) return result.value;
		throw require_error.CliError.fromIssues(result.error, this);
	}
	invoke(input, context) {
		if (!this.handler) throw new require_error.CliError(`Command '${this.name}' requires a subcommand`, {
			code: "missing-command",
			cmd: this
		});
		return this.handler(input, context);
	}
	help(target) {
		require_help.Help.help(this, { target });
	}
	/** An explicit positional list overrides whatever the args declared for themselves. */
	sync() {
		if (!this._positionals) return;
		for (const arg of this.args) arg.positional = this._positionals.includes(arg.name);
	}
};
//#endregion
exports.Cmd = Cmd;

//# sourceMappingURL=cmd.cjs.map