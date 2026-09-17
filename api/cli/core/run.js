import { operation, stream } from "../../core/util/guard.js";
import { of } from "../../core/util/api.js";
import { findChild } from "../../core/util/visit.js";
import { isInputError } from "../../core/error.js";
import "../../core/util/index.js";
import "../../core/index.js";
import { CliError } from "./errors.js";
import { namespaceHelp, operationHelp } from "./help.js";
import { renderError, rendererFor } from "./output.js";
import { parseArgs, parseGlobals, peekFormat } from "./parse.js";
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
	const root = of(program);
	const path = [opts?.name ?? root.name];
	let format = peekFormat(argv);
	try {
		const { target, rest } = resolve(root, argv, path);
		if (!operation(target)) {
			const parsed = parseGlobals(rest);
			format = parsed.output;
			const help = namespaceHelp(target, path) + "\n";
			if (parsed.help) {
				stdout(help);
				return EXIT.ok;
			}
			stderr(help);
			return EXIT.usage;
		}
		const parsed = await parseArgs(target, rest);
		format = parsed.output;
		if (parsed.help) {
			stdout(operationHelp(target, path) + "\n");
			return EXIT.ok;
		}
		const render = rendererFor(target.out, format);
		const write = (value) => {
			const line = render(value);
			if (line !== "") stdout(line + "\n");
		};
		const result = target.handle(parsed.inputs, opts?.context);
		if (stream(result)) for await (const item of result) write(item);
		else write(await result);
		return EXIT.ok;
	} catch (e) {
		stderr(renderError(e, format) + "\n");
		if (isInputError(e)) {
			if (format === "text") stderr(`Try '${path.join(" ")} --help' for more information.\n`);
			return e instanceof CliError ? e.exitCode : EXIT.usage;
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
	while (!operation(target) && i < argv.length) {
		const segment = argv[i];
		if (segment.startsWith("-")) break;
		const child = findChild(target, segment);
		if (child === void 0) throw new CliError(`unknown command '${segment}'`);
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
export { EXIT, run };

//# sourceMappingURL=run.js.map