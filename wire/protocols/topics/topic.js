//#region lib/wire/src/protocols/topics/topic.ts
/** A Topic over a Wire's own node. Interest is declared on the first listener and dropped with the last. */
var ChannelTopic = class {
	#channel;
	#node;
	#sinks;
	constructor(channel, node, sinks) {
		this.#channel = channel;
		this.#node = node;
		this.#sinks = sinks;
	}
	send(payload, to) {
		const frame = to === void 0 ? {
			t: "pub",
			c: this.#channel,
			d: payload
		} : {
			t: "pub",
			c: this.#channel,
			d: payload,
			to
		};
		return this.#node.send(frame);
	}
	listen(fn) {
		const set = this.#sinks.get(this.#channel) ?? /* @__PURE__ */ new Set();
		this.#sinks.set(this.#channel, set);
		const sink = fn;
		set.add(sink);
		if (set.size === 1) this.#node.send({
			t: "want",
			c: this.#channel,
			on: true
		});
		return () => {
			if (!set.delete(sink) || set.size > 0) return;
			this.#sinks.delete(this.#channel);
			this.#node.send({
				t: "want",
				c: this.#channel,
				on: false
			});
		};
	}
};
//#endregion
export { ChannelTopic };

//# sourceMappingURL=topic.js.map