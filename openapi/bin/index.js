#!/usr/bin/env node
import macro_default from "../../api/cli/macro.js";
import { Cli } from "../../api/cli/cli.js";
import "../../api/cli/index.js";
import { Emit } from "../gen/emit.js";
import { Doc } from "../gen/doc.js";
import { Op } from "../gen/ops.js";
import { Api } from "../gen/index.js";
import "../index.js";
import path from "node:path";
import fs from "node:fs/promises";
//#region lib/openapi/bin/index.ts
var cmd = macro_default.cmd({
	name: "openapi-ts-generate",
	description: "Generate TypeScript types from OpenAPI 3.0.0 schema",
	options: {
		input: macro_default.str({
			description: "The source OpenAPI 3.0.0 schema",
			alias: "i",
			required: true
		}),
		output: macro_default.str({
			description: "The output file",
			alias: "o",
			required: false
		})
	},
	positionals: ["input", "output"],
	handle: async (i) => {
		const api = await Doc.load(i.input);
		const types = await Op.pipe()(await Api.read(api));
		const result = Api.print(types, { emit: (a) => [...Emit.file(a), ...Emit.requests(a)] });
		if (!i.output) return console.log(result);
		await fs.mkdir(path.dirname(i.output), { recursive: true });
		await fs.writeFile(i.output, result);
	}
});
Cli.run(cmd, process.argv.slice(2));
//#endregion

//# sourceMappingURL=index.js.map