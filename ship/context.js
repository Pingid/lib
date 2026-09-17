import { branded } from "./brand.js";
//#region lib/ship/src/context.ts
var CONTEXT = Symbol.for("@pingid/lib-compose:Context");
/** A typed injection key. Values are supplied per `compose()` / `project()` call. */
var Context = class Context {
	/** @see {@link branded} */
	[CONTEXT] = true;
	static [Symbol.hasInstance] = branded(CONTEXT);
	label;
	constructor(label) {
		this.label = label;
	}
	static define(label = "anonymous") {
		return new Context(label);
	}
	create(value) {
		return new ContextValue(this, value);
	}
};
var CONTEXT_VALUE = Symbol.for("@pingid/lib-compose:ContextValue");
var ContextValue = class {
	/** @see {@link branded} */
	[CONTEXT_VALUE] = true;
	static [Symbol.hasInstance] = branded(CONTEXT_VALUE);
	context;
	value;
	constructor(context, value) {
		this.context = context;
		this.value = value;
	}
};
//#endregion
export { Context, ContextValue };

//# sourceMappingURL=context.js.map