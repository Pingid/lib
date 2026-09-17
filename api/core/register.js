//#region lib/api/src/core/register.ts
var _meta = void 0;
var reg = () => {
	if (_meta) return _meta;
	_meta = /* @__PURE__ */ new WeakMap();
	return _meta;
};
var update = (t, m) => {
	const _meta = reg();
	const current = _meta.get(t) ?? {};
	return _meta.set(t, {
		...current,
		...m,
		meta: {
			...current.meta ?? {},
			...m.meta
		}
	});
};
var get = (t) => {
	return reg().get(t) ?? {};
};
/**
* A target's own configuration for a node.
*
* `.meta(key, …)` records the arguments it was called with, so what is stored is
* an array and a target reads the first of it. That convention is this module's
* choice, so answering for it is this module's job rather than a line every
* target copies.
*/
var of = (t, key) => {
	const args = get(t).meta?.[key];
	return Array.isArray(args) ? args[0] : args;
};
//#endregion
export { get, of, update };

//# sourceMappingURL=register.js.map