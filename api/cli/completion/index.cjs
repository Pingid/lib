const require_arg = require("../arg.cjs");
const require_util = require("./util.cjs");
const require_table = require("./table.cjs");
require("./resolve.cjs");
const require_callback = require("./callback.cjs");
const require_cmd = require("../cmd.cjs");
const require_bash = require("./bash.cjs");
const require_fish = require("./fish.cjs");
const require_zsh = require("./zsh.cjs");
//#region lib/api/src/cli/completion/index.ts
var shells = [
	"bash",
	"zsh",
	"fish"
];
/**
* @example script('zsh', cli.root, { name: 'app', version: true })
*/
var script = (shell, root, options = {}) => {
	const name = options.name ?? root.name;
	const invoke = options.static ? void 0 : require_util.words(options.invoke ?? name);
	const entries = require_table.of(root, options);
	const emit = {
		name,
		invoke
	};
	if (shell === "bash") return require_bash.bash(entries, emit);
	return shell === "zsh" ? require_zsh.zsh(entries, emit) : require_fish.fish(entries, emit);
};
/**
* Mount this to give a CLI `app completion bash|zsh|fish`. The script is a snapshot of
* the tree, so it is regenerated after an upgrade rather than kept in step by itself.
*
* @example Cli.build({ binary: 'app' }).with(Completion.command())
* @example cli.with(Completion.command({ version: true })) // also offer `--version`
*/
var command = (options = {}) => {
	const cmd = require_cmd.Cmd.build("completion").describe("Print a shell completion script").arg(require_arg.Arg.enum(shells, "shell", {
		positional: true,
		required: true,
		description: "Target shell"
	}), require_arg.Arg.string("name", { description: "Binary the script registers against" }), require_arg.Arg.string("invoke", { description: "Command the script re-execs for dynamic values" }), require_arg.Arg.boolean("static", { description: "Never call back, at the cost of the forms that need it" }));
	return cmd.handle(({ shell, name, invoke, static: fixed }) => script(shell, cmd.root(), {
		...options,
		name: name ?? options.name,
		...invoke === void 0 ? {} : { invoke },
		...fixed === void 0 ? {} : { static: fixed }
	}));
};
var Completion = {
	of: require_table.of,
	script,
	command,
	bash: require_bash.bash,
	zsh: require_zsh.zsh,
	fish: require_fish.fish,
	callback: require_callback.callback,
	MARKER: require_callback.MARKER
};
//#endregion
exports.Completion = Completion;
exports.command = command;
exports.script = script;

//# sourceMappingURL=index.cjs.map