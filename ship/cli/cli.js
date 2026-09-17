#!/usr/bin/env node
import { Arg } from "../../api/cli/arg.js";
import { Render } from "../../api/cli/core/render.js";
import { Cmd } from "../../api/cli/cmd.js";
import { Cli } from "../../api/cli/cli.js";
import "../../api/cli/index.js";
import { formatProblems, validate } from "./validate.js";
import { docker, find, load, write } from "./load.js";
import { compare, desired, drifted, inspect, rows, survey } from "./diff.js";
import path from "node:path";
//#region lib/ship/cli/cli.ts
/** Docker commands that tear down, and so run in reverse dependency order. */
var REVERSED = /* @__PURE__ */ new Set([
	"down",
	"stop",
	"kill",
	"rm"
]);
/** The CLI's own commands; a stack sharing one of these names cannot be reached by it. */
var RESERVED = /* @__PURE__ */ new Set([
	"build",
	"compose",
	"diff"
]);
var argv = process.argv.slice(2);
var config = Arg.string("config", {
	alias: "c",
	description: "Config file (default: the nearest stack.config.ts)",
	complete: "file"
});
/**
* `--config` decides which stacks exist, and stacks are commands, so its value is read off
* argv before there is a tree to parse with. Everything else is left to the parser.
*/
var configOf = (args) => {
	for (const [index, token] of args.entries()) {
		if (token === "--") break;
		if (token === "-c" || token === "--config") return args[index + 1];
		if (token.startsWith("--config=")) return token.slice(9);
		if (token.startsWith("-c") && !token.startsWith("--") && token.length > 2) return token.slice(2);
	}
};
/**
* A failure is returned rather than thrown: the tree is built at import time, and bare `ship`
* should still print its help from a directory that has no config.
*/
var open = async () => {
	try {
		const file = find(configOf(argv));
		return {
			project: await load(file),
			dir: path.dirname(file)
		};
	} catch (error) {
		return error instanceof Error ? error : new Error(String(error));
	}
};
var opened = await open();
var resolve = () => {
	if (opened instanceof Error) throw opened;
	return opened;
};
/** Reference problems on stderr; returns the number of hard errors. */
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
/** A stack's help line: what it declares, and what it comes up after. */
var summary = (project, name) => {
	const spec = project.specs[name];
	const counts = [
		"services",
		"networks",
		"volumes",
		"secrets",
		"configs"
	].map((group) => [group, Object.keys(spec[group] ?? {}).length]).filter(([, total]) => total > 0).map(([group, total]) => `${total} ${total === 1 ? group.slice(0, -1) : group}`);
	const after = project.edges.filter(([, to]) => to === name).map(([from]) => from);
	return [counts.join(", "), after.length > 0 ? `after ${after.join(", ")}` : void 0].filter(Boolean).join(" — ");
};
/** Every `compose` node in the tree, so `passthrough` can tell where docker's arguments start. */
var composes = /* @__PURE__ */ new Set();
/** `docker compose` for one stack, or for every stack when `only` is omitted. */
var composeFor = (only) => {
	const cmd = Cmd.build("compose").describe(only ? `Run \`docker compose\` for ${only}` : "Run `docker compose` for every stack, in dependency order").use(`ship ${only ? `${only} ` : ""}compose <docker args...>`).arg(Arg.array(Arg.string(), "args", {
		positional: true,
		description: "Passed through to `docker compose`"
	})).handle(async (input) => {
		const args = input.args ?? [];
		if (args.length === 0) throw new Error(`nothing to run — try \`ship ${only ? `${only} ` : ""}compose up -d\``);
		const { project, dir } = resolve();
		const names = only ? [only] : project.order;
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
	composes.add(cmd);
	return cmd;
};
/** What docker is running, against what the config says it should be. */
var diffFor = (only) => Cmd.build("diff").describe(only ? `Compare ${only} against what docker is running` : "Compare every stack against what docker is running").arg(Arg.boolean("all", {
	alias: "a",
	description: "Include resources that are already in sync"
})).handle(async (input) => {
	const { project, dir } = resolve();
	const names = only ? [only] : project.order;
	const render = Render.create(process.stdout);
	const known = await survey();
	let drifted$1 = false;
	for (const name of names) {
		const spec = project.specs[name];
		const [desired$1, actual] = await Promise.all([desired(spec, project.projects[name], dir), inspect(project.projects[name], known)]);
		const entries = compare(desired$1, actual);
		const shown = input.all ? entries : entries.filter((entry) => entry.status !== "current");
		drifted$1 ||= drifted(entries);
		render.line(name);
		render.indent((into) => shown.length > 0 ? into.rows(rows(shown)) : into.line("in sync"));
	}
	if (drifted$1) process.exitCode = 1;
});
/** One command per stack: it prints that stack's compose file, and scopes `compose` to it. */
var stackFor = (project, name) => Cmd.build(name).describe(summary(project, name)).handle(() => project.specs[name]).with(composeFor(name), diffFor(name));
var build = Cmd.build("build").describe("Write every stack to a compose.<stack>.json file").arg(Arg.string("dir", {
	alias: "d",
	description: "Directory to write into (default: the working directory)",
	complete: "dir"
})).handle(async (input) => {
	const { project } = resolve();
	for (const name of project.order) {
		const file = path.resolve(input.dir ?? process.cwd(), `compose.${name}.json`);
		await write(project.specs[name], file);
		const shown = path.relative(process.cwd(), file);
		process.stdout.write(`${shown.startsWith("..") ? file : shown}\n`);
	}
	if (report(project, project.order, "all") > 0) process.exitCode = 1;
});
/** Stacks are mounted last, so the CLI's own commands win a name they both want. */
var stacks = () => {
	if (opened instanceof Error) return [];
	const { project } = opened;
	const clashing = project.order.filter((name) => RESERVED.has(name));
	if (clashing.length > 0) process.stderr.write(`warning: stack ${clashing.join(", ")} shadowed by a ship command of the same name\n`);
	return project.order.filter((name) => !RESERVED.has(name)).map((name) => stackFor(project, name));
};
var root = Cmd.build("ship").describe("Typed docker compose stacks").option(config).with(build, composeFor(), diffFor(), ...stacks());
/**
* Hand everything after a `compose` to docker verbatim.
*
* The parser claims every flag it recognises and rejects the rest, so `-d` would never survive
* the trip. Walking argv the way `route` does and inserting the terminator where the walk
* reached `compose` turns the whole tail into operands — `--config` goes ahead of it, which is
* where `route` already accepts it.
*/
var passthrough = (args) => {
	let cmd = root;
	for (let index = 0; index < args.length; index++) {
		const token = args[index];
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
		if (!composes.has(cmd)) continue;
		const tail = args.slice(index + 1);
		if (tail.length === 0 || tail[0] === "--help" || tail[0] === "-h") break;
		return [
			...args.slice(0, index + 1),
			"--",
			...tail
		];
	}
	return args;
};
/** Bare `ship` and `ship --help` describe the CLI; everything else needs the config to exist. */
var helping = argv.length === 0 || argv[0] === "--help" || argv[0] === "-h";
var main = async () => {
	if (opened instanceof Error && !helping) throw opened;
	const code = await Cli.run(root, passthrough(argv));
	if (code !== 0) process.exitCode = code;
};
main().catch((error) => {
	process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
	process.exitCode = 1;
});
//#endregion

//# sourceMappingURL=cli.js.map