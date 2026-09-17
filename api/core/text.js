//#region lib/api/src/core/text.ts
/** `requestId` to `request-id`: the wire spelling of a camel-cased input key. */
var kebab = (value) => value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
/** A value as it appears in a message — strings bare, everything else as JSON. */
var format = (value) => typeof value === "string" ? value : JSON.stringify(value);
//#endregion
export { format, kebab };

//# sourceMappingURL=text.js.map