import { Arg } from "../arg.js";
import { words } from "./util.js";
import { of } from "./table.js";
import "./resolve.js";
import { MARKER, callback } from "./callback.js";
import { Cmd } from "../cmd.js";
import { bash } from "./bash.js";
import { fish } from "./fish.js";
import { zsh } from "./zsh.js";
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
	const invoke = options.static ? void 0 : words(options.invoke ?? name);
	const entries = of(root, options);
	const emit = {
		name,
		invoke
	};
	if (shell === "bash") return bash(entries, emit);
	return shell === "zsh" ? zsh(entries, emit) : fish(entries, emit);
};
/**
* Mount this to give a CLI `app completion bash|zsh|fish`. The script is a snapshot of
* the tree, so it is regenerated after an upgrade rather than kept in step by itself.
*
* @example Cli.build({ binary: 'app' }).with(Completion.command())
* @example cli.with(Completion.command({ version: true })) // also offer `--version`
*/
var command = (options = {}) => {
	const cmd = Cmd.build("completion").describe("Print a shell completion script").arg(Arg.enum(shells, "shell", {
		positional: true,
		required: true,
		description: "Target shell"
	}), Arg.string("name", { description: "Binary the script registers against" }), Arg.string("invoke", { description: "Command the script re-execs for dynamic values" }), Arg.boolean("static", { description: "Never call back, at the cost of the forms that need it" }));
	return cmd.handle(({ shell, name, invoke, static: fixed }) => script(shell, cmd.root(), {
		...options,
		name: name ?? options.name,
		...invoke === void 0 ? {} : { invoke },
		...fixed === void 0 ? {} : { static: fixed }
	}));
};
var Completion = {
	of,
	script,
	command,
	bash,
	zsh,
	fish,
	callback,
	MARKER
};
//#endregion
export { Completion, command, script };

//# sourceMappingURL=index.js.map