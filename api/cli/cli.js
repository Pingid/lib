import { CliError } from "./core/error.js";
import { Render } from "./core/render.js";
import { Parse } from "./core/parse.js";
import { callback } from "./completion/callback.js";
import { Help } from "./core/help.js";
import { Cmd } from "./cmd.js";
//#region lib/api/src/cli/cli.ts
var Cli = class Cli {
	root;
	config;
	_out;
	_err;
	/** Wrap an existing command or api node as the root. */
	static for(root, config = {}) {
		const cmd = Cmd.from(root);
		return new Cli(config.binary ? cmd.rename(config.binary) : cmd, config);
	}
	/** Start from an empty root and mount commands onto it. */
	static build(config = {}) {
		return new Cli(Cmd.build(config.binary ?? "cli"), config);
	}
	static run(root, argv = process.argv.slice(2), config = {}, context = {}) {
		return new Cli(Cmd.from(root), config).run(argv, context);
	}
	constructor(root, config = {}) {
		this.root = root;
		this.config = config;
	}
	with(...children) {
		this.root.with(...children);
		return this;
	}
	get out() {
		return this._out ??= Render.from(this.config.out ?? process.stdout);
	}
	get err() {
		return this._err ??= Render.from(this.config.err ?? process.stderr);
	}
	/** Parse, validate, dispatch. Returns an exit code; never exits the process. */
	async run(argv = process.argv.slice(2), context = {}) {
		if (argv[0] === "__complete") return callback(this.root, argv.slice(1), {
			out: this.out,
			version: this.config.version !== void 0
		});
		try {
			const routed = Parse.route(this.root, argv);
			const result = Parse.parse(routed.cmd, routed.argv);
			if (result.version && this.config.version !== void 0) {
				this.version();
				return 0;
			}
			if (result.help) {
				this.help(result.cmd);
				return 0;
			}
			if (!result.cmd.handler) {
				this.help(result.cmd);
				return 1;
			}
			const input = await result.cmd.validate(result.input);
			const output = await result.cmd.invoke(input, {
				...context,
				...result.context
			});
			if (output !== void 0) this.print(output);
			return 0;
		} catch (error) {
			return this.fail(error);
		}
	}
	/** `run` plus `process.exit`. The entry point for a binary. */
	async main(argv, context = {}) {
		process.exit(await this.run(argv, context));
	}
	help(cmd = this.root, target) {
		const render = Render.from(target ?? this.out);
		const root = cmd === this.root;
		if (root && this.config.version !== void 0) render.line(`${this.root.name} ${this.config.version}`).blank();
		Help.help(cmd, {
			target: render,
			version: root && this.config.version !== void 0
		});
	}
	version(target) {
		Render.from(target ?? this.out).line(this.config.version ?? "0.0.0");
	}
	print(value) {
		if (this.config.print) return this.config.print(value, this.out);
		this.out.line(typeof value === "string" ? value : JSON.stringify(value, null, 2));
	}
	/** Report a `CliError` on stderr. Anything else is a bug and rethrows. */
	fail(error) {
		if (!(error instanceof CliError)) throw error;
		this.err.line(`error: ${error.message}`);
		if (error.cmd) {
			this.err.blank().line(`Usage: ${Help.usage(error.cmd)}`);
			this.err.line(`Run '${[...error.cmd.path(), "--help"].join(" ")}' for more information.`);
		}
		return error.exit;
	}
};
//#endregion
export { Cli };

//# sourceMappingURL=cli.js.map