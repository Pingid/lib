//#region lib/wire/src/adapters/clock.ts
/**
* @example
* ```ts
* reconnect(connect, { clock: systemClock })
* ```
*/
var systemClock = {
	now: () => Date.now(),
	timer: (fn, ms) => {
		const id = setTimeout(fn, ms);
		return () => clearTimeout(id);
	}
};
/**
* Time that only moves when told. Timers fire in due order, ties in arming order.
*
* @example
* ```ts
* const clock = fakeClock()
* let fired = false
* clock.timer(() => (fired = true), 500)
* clock.advance(499) // fired === false
* clock.advance(1) //   fired === true
* ```
*/
var fakeClock = (start = 0) => {
	const timers = [];
	let now = start;
	let seq = 0;
	return {
		now: () => now,
		timer(fn, ms) {
			const timer = {
				at: now + Math.max(0, ms),
				seq: ++seq,
				fn
			};
			timers.push(timer);
			return () => {
				const i = timers.indexOf(timer);
				if (i >= 0) timers.splice(i, 1);
			};
		},
		advance(ms) {
			const until = now + Math.max(0, ms);
			for (;;) {
				let next = null;
				for (const timer of timers) {
					if (timer.at > until) continue;
					if (!next || timer.at < next.at || timer.at === next.at && timer.seq < next.seq) next = timer;
				}
				if (!next) break;
				timers.splice(timers.indexOf(next), 1);
				now = Math.max(now, next.at);
				next.fn();
			}
			now = until;
		},
		get pending() {
			return timers.length;
		}
	};
};
//#endregion
export { fakeClock, systemClock };

//# sourceMappingURL=clock.js.map