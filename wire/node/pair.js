//#region lib/wire/src/node/pair.ts
var noop = () => {};
function side() {
	return {
		sinks: /* @__PURE__ */ new Set(),
		gone: /* @__PURE__ */ new Set(),
		held: []
	};
}
/** The state the two ends of a pair share. Closing either closes both. */
var PairChannel = class {
	#sides;
	#open;
	constructor() {
		this.#sides = [side(), side()];
		this.#open = true;
	}
	get open() {
		return this.#open;
	}
	near(index) {
		return this.#sides[index];
	}
	far(index) {
		return this.#sides[index === 0 ? 1 : 0];
	}
	shut() {
		if (!this.#open) return;
		this.#open = false;
		for (const one of this.#sides) {
			for (const fn of [...one.gone]) fn();
			one.gone.clear();
			one.sinks.clear();
			one.held.length = 0;
		}
	}
};
/** One end of a PairChannel. Delivery is deferred to a microtask, as a real transport would be. */
var PairNode = class {
	#channel;
	#index;
	constructor(channel, index) {
		this.#channel = channel;
		this.#index = index;
	}
	send(msg) {
		if (!this.#channel.open) return false;
		queueMicrotask(() => {
			if (!this.#channel.open) return;
			const far = this.#channel.far(this.#index);
			if (far.sinks.size === 0) return void far.held.push(msg);
			for (const fn of [...far.sinks]) fn(msg);
		});
		return true;
	}
	listen(fn) {
		const near = this.#channel.near(this.#index);
		near.sinks.add(fn);
		for (const msg of near.held.splice(0)) fn(msg);
		return () => void near.sinks.delete(fn);
	}
	closed(fn) {
		if (!this.#channel.open) return fn(), noop;
		const near = this.#channel.near(this.#index);
		near.gone.add(fn);
		return () => void near.gone.delete(fn);
	}
	close() {
		this.#channel.shut();
	}
};
/**
* Creates two cross-wired nodes in one process.
*
* @example
* ```ts
* const [mine, theirs] = pair<Frame>()
* hub.add(theirs)
* mine.send({ t: 'hello' })
* ```
*/
function pair() {
	const channel = new PairChannel();
	return [new PairNode(channel, 0), new PairNode(channel, 1)];
}
//#endregion
export { pair };

//# sourceMappingURL=pair.js.map