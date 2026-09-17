import { createContext, execute, resolvePath, resolveSpec } from "./context.js";
import fs from "node:fs";
//#region lib/ship/src/config/run.ts
/** Run `ship [stack] <command> [args...]`, resolving to the exit code. */
var run = async (config) => {
	const args = [...config.argv ?? process.argv.slice(2)];
	if (args.length === 0 || args[0] === "--help" || args[0] === "-h") return print(help(config));
	const stackNames = Object.keys(config.stacks);
	const stackName = (Object.hasOwn(config.stacks, args[0]) ? args.shift() : void 0) ?? config.default ?? (stackNames.length === 1 ? stackNames[0] : void 0);
	if (!stackName || !Object.hasOwn(config.stacks, stackName)) {
		const expected = stackNames.length > 0 ? stackNames.join(", ") : "none declared";
		throw new Error(stackName ? `unknown stack "${stackName}" — expected one of ${expected}` : `which stack? — ${expected}`);
	}
	if (args.length === 0) return print(help(config));
	const ctx = createContext(config);
	const stack = config.stacks[stackName];
	const cmd = Object.hasOwn(commands, args[0]) ? commands[args[0]] : void 0;
	if (cmd) return cmd(ctx, stack);
	const file = await resolvePath(ctx, stack);
	const projectDir = typeof stack === "string" ? [] : ["--project-directory", ctx.cwd];
	return execute(ctx, {
		bin: config.bin ?? "docker",
		env: {
			...process.env,
			...config.env ?? {}
		},
		args: [
			...config.defaultArgs ?? ["compose"],
			...projectDir,
			"-f",
			file,
			...args
		]
	});
};
var commands = { 
/** The stack's compose file on stdout. */
print: async (ctx, stack) => {
	const spec = await resolveSpec(stack);
	if (typeof spec === "string") return print(await fs.promises.readFile(await resolvePath(ctx, spec), "utf8"));
	return print(`${JSON.stringify(spec, null, 2)}\n`);
} };
var print = (text) => (process.stdout.write(text), 0);
/** Usage, with the stacks this config declares. */
var help = (config) => {
	const stacks = Object.keys(config.stacks).map((name) => `  ${name}${name === config.default ? " (default)" : ""}`);
	return [
		"Usage: ship [-c file] [stack] <command> [args...]",
		"",
		"Stacks:",
		...stacks.length > 0 ? stacks : ["  (none)"],
		"",
		"Commands:",
		"  print                 Write the stack's compose file to stdout",
		"  <docker compose args> Run `docker compose` against the stack, e.g. `ship app up -d`",
		"",
		"Options:",
		"  -c, --config <file>   Config file (default: the nearest ship.config.ts or stack.config.ts)",
		""
	].join("\n");
};
//#endregion
export { help, run };

//# sourceMappingURL=run.js.map