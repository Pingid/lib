#!/usr/bin/env node
import { cli } from "../config/index.js";
import { load } from "./resolve.js";
//#region lib/ship/cli/index.ts
var c = await load();
cli(c);
//#endregion

//# sourceMappingURL=index.js.map