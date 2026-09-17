import { KINDS, isResource } from "./resource.js";
//#region lib/ship/src/v2/compose.ts
var COMPOSE = Symbol.for("@pingid/lib/ship:Compose");
var REF = Symbol.for("@pingid/lib/ship:Ref");
var isRef = (value) => typeof value === "object" && value !== null && REF in value;
var isCompose = (value) => typeof value === "object" && value !== null && COMPOSE in value;
/**
* The list may be a thunk, so a stack can ref into one declared after it. It is read once, on
* first access.
*/
var Compose = (name, items) => {
	let flat;
	let listing = false;
	const refs = /* @__PURE__ */ new Map();
	const ref = (r) => {
		if (!refs.has(r)) refs.set(r, Object.freeze({
			[REF]: true,
			type: r.type,
			name: r.name,
			stack: self,
			resource: r
		}));
		return refs.get(r);
	};
	const list = () => {
		if (flat) return flat;
		if (listing) throw new Error(`stack "${name}" is part of a ref cycle`);
		listing = true;
		try {
			return flat = flatten(typeof items === "function" ? items() : items);
		} finally {
			listing = false;
		}
	};
	const self = {
		[COMPOSE]: true,
		name
	};
	Object.defineProperty(self, "items", {
		enumerable: true,
		get: list
	});
	for (const kind of KINDS) Object.defineProperty(self, `${kind}s`, {
		enumerable: true,
		get: () => {
			const group = {};
			for (const r of list()) if (isResource(r) && r.type === kind) group[r.name] = ref(r);
			return group;
		}
	});
	return Object.freeze(self);
};
var flatten = (items) => items.flatMap((item) => {
	if (isCompose(item)) return [...item.items];
	if (isResource(item) || isRef(item)) return [item];
	throw new TypeError(`expected a Resource, Ref or Compose, got ${typeof item}`);
});
//#endregion
export { Compose, isCompose, isRef };

//# sourceMappingURL=compose.js.map