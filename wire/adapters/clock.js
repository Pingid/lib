//#region lib/wire/src/adapters/clock.ts
/** Real time, over Date.now and setTimeout */
var SystemClock = class {
	now() {
		return Date.now();
	}
	timer(fn, ms) {
		const id = setTimeout(fn, ms);
		return () => clearTimeout(id);
	}
};
/** The shared SystemClock, used by anything given no clock of its own */
var systemClock = new SystemClock();
/**
* Time that only moves when told. Timers fire in due order, ties in arming order.
*
* @example
* ```ts
* const clock = new FakeClock()
* let fired = false
* clock.timer(() => (fired = true), 500)
* clock.advance(499) // fired === false
* clock.advance(1) //   fired === true
* ```
*/
var FakeClock = class {
	#timers;
	#now;
	#seq;
	constructor(start = 0) {
		this.#timers = [];
		this.#now = start;
		this.#seq = 0;
	}
	now() {
		return this.#now;
	}
	timer(fn, ms) {
		const timer = {
			at: this.#now + Math.max(0, ms),
			seq: ++this.#seq,
			fn
		};
		this.#timers.push(timer);
		return () => {
			const index = this.#timers.indexOf(timer);
			if (index >= 0) this.#timers.splice(index, 1);
		};
	}
	/** Moves time forward, firing everything that comes due on the way */
	advance(ms) {
		const until = this.#now + Math.max(0, ms);
		for (;;) {
			const next = this.#due(until);
			if (!next) break;
			this.#timers.splice(this.#timers.indexOf(next), 1);
			this.#now = Math.max(this.#now, next.at);
			next.fn();
		}
		this.#now = until;
	}
	/** Timers still armed */
	get pending() {
		return this.#timers.length;
	}
	#due(until) {
		let next = null;
		for (const timer of this.#timers) {
			if (timer.at > until) continue;
			if (!next || timer.at < next.at || timer.at === next.at && timer.seq < next.seq) next = timer;
		}
		return next;
	}
};
//#endregion
export { FakeClock, SystemClock, systemClock };

//# sourceMappingURL=clock.js.map