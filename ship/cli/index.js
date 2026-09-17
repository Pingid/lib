#!/usr/bin/env node
import { run } from "../config/run.js";
import "../config/index.js";
import { load } from "./resolve.js";
//#region lib/ship/cli/index.ts
var c = await load();
run(c);
//#endregion

//# sourceMappingURL=index.js.map