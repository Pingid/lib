const require_guard = require("../../core/util/guard.cjs");
const require_api = require("../../core/util/api.cjs");
const require_visit = require("../../core/util/visit.cjs");
const require_error = require("../../core/error.cjs");
require("../../core/util/index.cjs");
require("../../core/index.cjs");
const require_errors = require("./errors.cjs");
const require_help = require("./help.cjs");
const require_output = require("./output.cjs");
const require_parse = require("./parse.cjs");
//#region lib/api/src/cli/core/run.ts
/** Exit codes: `0` success, `1` the command failed, `2` the invocation was wrong. */
var EXIT = {
	ok: 0,
	failed: 1,
	usage: 2
};
/**
* Run a program against `argv` (without the `node script` prefix).
*
* Resolves the command path, parses the remaining arguments against the
* operation it reached, invokes it, and prints what comes back as text or JSON.
* Never terminates the process — it returns the exit code for the caller to act
* on:
*
* ```ts
* process.exit(await run(cmds, process.argv.slice(2)))
* ```
*/
var run = async (program, argv, ...args) => {
	const [opts] = args;
	const stdout = opts?.stdout ?? ((s) => void process.stdout.write(s));
	const stderr = opts?.stderr ?? ((s) => void process.stderr.write(s));
	const root = require_api.of(program);
	const path = [opts?.name ?? root.name];
	let format = require_parse.peekFormat(argv);
	try {
		const { target, rest } = resolve(root, argv, path);
		if (!require_guard.operation(target)) {
			const parsed = require_parse.parseGlobals(rest);
			format = parsed.output;
			const help = require_help.namespaceHelp(target, path) + "\n";
			if (parsed.help) {
				stdout(help);
				return EXIT.ok;
			}
			stderr(help);
			return EXIT.usage;
		}
		const parsed = await require_parse.parseArgs(target, rest);
		format = parsed.output;
		if (parsed.help) {
			stdout(require_help.operationHelp(target, path) + "\n");
			return EXIT.ok;
		}
		const render = require_output.rendererFor(target.out, format);
		const write = (value) => {
			const line = render(value);
			if (line !== "") stdout(line + "\n");
		};
		const result = target.handle(parsed.inputs, opts?.context);
		if (require_guard.stream(result)) for await (const item of result) write(item);
		else write(await result);
		return EXIT.ok;
	} catch (e) {
		stderr(require_output.renderError(e, format) + "\n");
		if (require_error.isInputError(e)) {
			if (format === "text") stderr(`Try '${path.join(" ")} --help' for more information.\n`);
			return e instanceof require_errors.CliError ? e.exitCode : EXIT.usage;
		}
		return EXIT.failed;
	}
};
/**
* Walk leading argv segments down the tree until an operation is reached,
* pushing each matched segment onto `path`.
*/
var resolve = (root, argv, path) => {
	let target = root;
	let i = 0;
	while (!require_guard.operation(target) && i < argv.length) {
		const segment = argv[i];
		if (segment.startsWith("-")) break;
		const child = require_visit.findChild(target, segment);
		if (child === void 0) throw new require_errors.CliError(`unknown command '${segment}'`);
		i++;
		path.push(segment);
		target = child;
	}
	return {
		target,
		rest: argv.slice(i)
	};
};
//#endregion
exports.EXIT = EXIT;
exports.run = run;

//# sourceMappingURL=run.cjs.map