//#region lib/workspace/src/util/recipe.ts
var Recipe = class Recipe {
	static builder = (opts, cb) => Recipe.create(opts, (op) => cb(op));
	static create = (config, executer) => {
		const createBuilder = (executer, options) => {
			let executionPromise = null;
			const execute = () => {
				if (!executionPromise) executionPromise = executer(options);
				return executionPromise;
			};
			return new Proxy({}, { get(_, prop) {
				console.log({ prop });
				if (prop === "then" || prop === "catch" || prop === "finally") {
					const promise = execute();
					return promise[prop].bind(promise);
				}
				if (typeof prop === "string" && prop in config) return (value) => createBuilder(executer, {
					...options,
					[prop]: value ?? config[prop]
				});
			} });
		};
		return (opts) => createBuilder(executer, opts ?? {});
	};
};
//#endregion
export { Recipe };

//# sourceMappingURL=recipe.js.map