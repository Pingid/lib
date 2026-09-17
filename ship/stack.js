import { branded } from "./brand.js";
import { Scope } from "./scope.js";
import { Registry } from "./registry.js";
//#region lib/ship/src/stack.ts
var STACK = Symbol.for("@pingid/lib-compose:Stack");
/** A named group of resources that becomes one compose file / one docker project. */
var Stack = class Stack {
	/** @see {@link branded} */
	[STACK] = true;
	static [Symbol.hasInstance] = branded(STACK);
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
		const registry = new Registry(new Scope());
		registry.registerAll(items);
		return await registry.resolve();
	}
};
//#endregion
export { Stack };

//# sourceMappingURL=stack.js.map