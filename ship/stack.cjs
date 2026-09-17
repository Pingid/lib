const require_brand = require("./brand.cjs");
const require_scope = require("./scope.cjs");
const require_registry = require("./registry.cjs");
//#region lib/ship/src/stack.ts
var STACK = Symbol.for("@pingid/lib-compose:Stack");
/** A named group of resources that becomes one compose file / one docker project. */
var Stack = class Stack {
	/** @see {@link branded} */
	[STACK] = true;
	static [Symbol.hasInstance] = require_brand.branded(STACK);
	name;
	items;
	options;
	static create(name, items, options = {}) {
		return new Stack(name, items, options);
	}
	constructor(name, items, options = {}) {
		this.name = name;
		this.items = items;
		this.options = options;
	}
	get project() {
		return this.options.project ?? this.name;
	}
	compose() {
		return Stack.compose(...this.items);
	}
	/** Build a single compose file. Registration errors surface as a rejection, not a sync throw. */
	static async compose(...items) {
		const registry = new require_registry.Registry(new require_scope.Scope());
		registry.registerAll(items);
		return await registry.resolve();
	}
};
//#endregion
exports.Stack = Stack;

//# sourceMappingURL=stack.cjs.map