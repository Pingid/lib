//#region lib/proxy/src/base.ts
var BasePolicy = class {
	mod;
	mapper;
	constructor(mapper, current) {
		this.mapper = mapper;
		this.mod = current;
	}
	/** Append one step. Subclasses build on this. */
	step(next) {
		this.mod = this.mapper(this.mod, next);
		return this;
	}
	/**
	* Splice other policies in, in order.
	*
	* The other policy's steps are snapshotted as they stand now — policies are
	* mutable, so anything appended to it afterwards will not show up here.
	*/
	use(...policies) {
		for (const policy of policies) this.step(policy.mod);
		return this;
	}
	/**
	* Apply a branch only when the condition holds.
	*
	* This is a *build-time* choice, for facts that are settled before any request
	* arrives — an upstream's config, a feature flag. Per-request choices belong
	* inside a step, where the context is in hand.
	*/
	when(condition, build) {
		if (condition) build(this);
		return this;
	}
	/**
	* Run the policy.
	*
	* The default context is a fresh object rather than a shared constant: steps
	* are allowed to write to it, and a shared one would carry those writes into
	* unrelated calls.
	*/
	applyTo(value, context = {}) {
		return this.mod(value, context);
	}
};
var compose = {
	/** Mutation pipeline: every step sees the same object. */
	effects: () => (a, b) => (x, context) => {
		a(x, context);
		b(x, context);
	},
	asyncPipe: () => (a, b) => async (x, context) => b(await a(x, context), context),
	/** Transform pipeline where null means "dropped" — later steps are skipped. */
	nullablePipe: () => (a, b) => (x, context) => {
		const result = a(x, context);
		return result == null ? null : b(result, context);
	}
};
//#endregion
export { BasePolicy, compose };

//# sourceMappingURL=base.js.map