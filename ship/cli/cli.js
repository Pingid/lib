#!/usr/bin/env node
import { Arg } from "../../api/cli/arg.js";
import { Cmd } from "../../api/cli/cmd.js";
import { Cli } from "../../api/cli/cli.js";
import "../../api/cli/index.js";
import { formatProblems, validate } from "./validate.js";
import { docker, find, load, write } from "./load.js";
import path from "node:path";
//#region lib/ship/cli/cli.ts
/** Docker commands that tear down, and so run in reverse dependency order. */
var REVERSED = /* @__PURE__ */ new Set([
	"down",
	"stop",
	"kill",
	"rm"
]);
var config = Arg.string("config", {
	alias: "c",
	description: "Config file (default: the nearest stack.config.ts)",
	complete: "file"
});
var stack = Arg.array(Arg.string(), "stack", {
	alias: "s",
	description: "Limit to one stack, repeatable (default: all, in dependency order)"
});
/** Load the config named by the root options and pick the stacks it applies to. */
var resolve = async (shared) => {
	const file = find(shared.config);
	const project = await load(file);
	for (const name of shared.stack ?? []) if (!(name in project.specs)) throw new Error(`unknown stack "${name}" — have: ${project.order.join(", ")}`);
	return {
		project,
		names: shared.stack?.length ? project.order.filter((name) => shared.stack.includes(name)) : project.order,
		dir: path.dirname(file)
	};
};
/** Report reference problems on stderr; returns the number of hard errors. */
var report = (project, names, only) => {
	let errors = 0;
	for (const name of names) {
		const problems = validate(project.specs[name]);
		const shown = only === "all" ? problems : problems.filter((problem) => problem.level === "error");
		if (shown.length > 0) process.stderr.write(`${formatProblems(shown, `[${name}]`)}\n`);
		errors += problems.filter((problem) => problem.level === "error").length;
	}
	return errors;
};
var build = Cmd.build("build").describe("Write the generated compose files").arg(Arg.string("dir", {
	alias: "d",
	description: "Directory to write into (default: the working directory)",
	complete: "dir"
})).context().handle(async (input, shared) => {
	const { project, names } = await resolve(shared);
	for (const name of names) {
		const file = path.resolve(input.dir ?? process.cwd(), `compose.${name}.json`);
		await write(project.specs[name], file);
		const shown = path.relative(process.cwd(), file);
		process.stdout.write(`${shown.startsWith("..") ? file : shown}\n`);
	}
	if (report(project, names, "all") > 0) process.exitCode = 1;
});
var compose = Cmd.build("compose").describe("Alias for `docker compose`, with the generated file supplied on stdin").use("ship compose [options] <docker args...>").arg(Arg.array(Arg.string(), "args", {
	positional: true,
	description: "Passed through to `docker compose`"
})).context().handle(async (input, shared) => {
	const args = input.args ?? [];
	if (args.length === 0) throw new Error("nothing to run — try `ship compose up -d`");
	const { project, names, dir } = await resolve(shared);
	const command = args[0];
	const tearingDown = REVERSED.has(command);
	const ordered = tearingDown ? [...names].reverse() : names;
	if (!tearingDown && report(project, names, "errors") > 0) throw new Error("the generated file has undeclared references — `ship build` reports them in full");
	for (const name of ordered) {
		const argv = [
			"compose",
			"--project-name",
			project.projects[name],
			"--project-directory",
			dir,
			"-f",
			"-",
			...args
		];
		const code = await docker(argv, project.specs[name], command);
		if (code !== 0) {
			process.exitCode = code;
			if (!tearingDown) return;
		}
	}
});
var root = Cmd.build("ship").describe("Typed docker compose stacks").option(config, stack).with(build, compose);
/**
* Hand everything after `compose` to docker verbatim.
*
* The parser claims every flag it recognises and rejects the rest, so `-d` would never survive
* the trip. Walking argv the way `route` does and inserting the terminator where `compose` was
* found turns the whole tail into operands — ship's own options go ahead of the command, which
* is where `route` already accepts them.
*/
var passthrough = (argv) => {
	let cmd = root;
	for (let index = 0; index < argv.length; index++) {
		const token = argv[index];
		if (token === "--") break;
		if (token.startsWith("-") && token.length > 1) {
			const long = token.startsWith("--");
			const [body = "", inline] = token.replace(/^--?/, "").split("=");
			const arg = cmd.lookup(long ? body : body[0]);
			const bundled = !long && body.length > 1;
			if (arg && !arg.boolean() && inline === void 0 && !bundled) index += 1;
			continue;
		}
		const next = cmd.find(token);
		if (!next) break;
		cmd = next;
		if (cmd !== compose) continue;
		const tail = argv.slice(index + 1);
		if (tail.length === 0 || tail[0] === "--help" || tail[0] === "-h") break;
		return [
			...argv.slice(0, index + 1),
			"--",
			...tail
		];
	}
	return argv;
};
var main = async () => {
	const code = await Cli.run(root, passthrough(process.argv.slice(2)));
	if (code !== 0) process.exitCode = code;
};
main().catch((error) => {
	process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
	process.exitCode = 1;
});
//#endregion

//# sourceMappingURL=cli.js.map