#!/usr/bin/env tsx
import macro_default from "../../api/cli/macro.js";
import { Cli } from "../../api/cli/cli.js";
import "../../api/cli/index.js";
import { find, load } from "./load.js";
//#region lib/ship/cli/v2.ts
var build = macro_default.cmd({
	name: "build",
	description: "Build compose files",
	options: {
		stacks: macro_default.list(macro_default.str(), { description: "The stacks to generate a compose file for defaults to all" }),
		config: macro_default.str({ description: "The config file to use defaults to finding one" })
	},
	positionals: ["stacks"],
	handle: async (args) => {
		const config = await load(await find(args.config));
		console.log(config);
	}
});
Cli.run(build);
//#endregion

//# sourceMappingURL=v2.js.map