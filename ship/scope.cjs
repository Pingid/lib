//#region lib/ship/src/scope.ts
/**
* Resolution scope.
*
* Context values resolve up the parent chain, so a project can supply configuration to every
* stack. Resource handles are local only, so the same `Resource` used in two stacks is built
* once per stack rather than shared between them.
*/
var Scope = class Scope {
	parent;
	contexts = /* @__PURE__ */ new Map();
	handles = /* @__PURE__ */ new Map();
	constructor(parent) {
		this.parent = parent;
	}
	child() {
		return new Scope(this);
	}
	setContext(context, value) {
		this.contexts.set(context, value);
	}
	getContext(context) {
		for (let s = this; s; s = s.parent) if (s.contexts.has(context)) return s.contexts.get(context);
		throw new Error(`context "${context.label}" was not provided to this scope`);
	}
	hasHandle(r) {
		return this.handles.has(r);
	}
	getHandle(r) {
		return this.handles.get(r);
	}
	setHandle(r, handle) {
		this.handles.set(r, handle);
	}
};
//#endregion
exports.Scope = Scope;

//# sourceMappingURL=scope.cjs.map