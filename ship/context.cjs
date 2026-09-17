//#region lib/ship/src/context.ts
/** A typed injection key. Values are supplied per `compose()` / `project()` call. */
var Context = class Context {
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
var ContextValue = class {
	context;
	value;
	constructor(context, value) {
		this.context = context;
		this.value = value;
	}
};
//#endregion
exports.Context = Context;
exports.ContextValue = ContextValue;

//# sourceMappingURL=context.cjs.map