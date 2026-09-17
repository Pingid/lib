//#region lib/workspace/src/util/recipe.ts
/** Promise methods the builder must forward rather than treat as an option. */
var THENABLE = [
	"then",
	"catch",
	"finally"
];
var Recipe = class {
	static create = (config, opts) => {
		const build = (options) => {
			let pending = null;
			const execute = () => pending ??= config.execute(options);
			return new Proxy({}, { get: (_, prop) => {
				if (typeof prop !== "string") return void 0;
				if (THENABLE.includes(prop)) {
					const promise = execute();
					return promise[prop].bind(promise);
				}
				if (!Object.hasOwn(config.options, prop)) return void 0;
				return (value) => build(config.resolve(options, prop, value));
			} });
		};
		return build(opts ?? {});
	};
};
//#endregion
exports.Recipe = Recipe;

//# sourceMappingURL=recipe.cjs.map