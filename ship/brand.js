//#region lib/ship/src/brand.ts
/**
* Builds the `instanceof` check for a branded class.
*
* The classes here are handed to `compose()` / `project()` from a user's config, and the config
* is loaded by jiti so that `--watch` can re-read it without a stale module cache. jiti
* transpiles TypeScript wherever it finds it, so a config that reaches this library's sources
* gets its own copy of these classes — and a plain `instanceof`, which compares class identity,
* would reject a perfectly good Stack for coming from the wrong copy.
*
* Answering on a mark instead removes the question. `Symbol.for` keys a process-global
* registry, so every copy of this module brands with the very same symbol.
*/
var branded = (mark) => (value) => typeof value === "object" && value !== null && mark in value;
//#endregion
export { branded };

//# sourceMappingURL=brand.js.map