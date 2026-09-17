const require_directory = require("../../directory/directory.cjs");
const require_hub = require("../../hub/hub.cjs");
const require_plugin = require("../../hub/plugin.cjs");
const require_interest = require("../../interest/interest.cjs");
const require_map = require("../../node/map.cjs");
const require_participant = require("../../node/participant.cjs");
const require_topic = require("./topic.cjs");
//#region lib/wire/src/protocols/topics/wire.ts
/**
* Channels keyed by a name: Interest for the table, Directory for replies, twenty lines for
* the rest. One end, and the same call whether it hosts the others or joins them.
*
* @example
* ```ts
* const page = new Wire<{ tick: number }>({ name: 'app', retain: ['tick'] })
* page.add(worker)
* page.topic('tick').listen((n, meta) => console.log(n, meta.from))
* page.topic('tick').send(1)
* ```
*/
var Wire = class {
	#name;
	#retains;
	#held;
	#hub;
	#here;
	#who;
	#wants;
	#sinks;
	constructor(options) {
		this.#name = options.name;
		this.#retains = new Set(options.retain ?? []);
		this.#held = /* @__PURE__ */ new Map();
		this.#sinks = /* @__PURE__ */ new Map();
		this.#who = new require_directory.Directory({
			from: (msg) => msg.t === "pub" ? msg.from ?? null : "",
			stamp: (msg, id) => ({
				...msg,
				from: id
			})
		});
		this.#wants = new require_interest.Interest({
			read: (msg) => msg.t === "want" ? {
				key: msg.c,
				on: msg.on
			} : null,
			write: ({ key, on }) => ({
				t: "want",
				c: key,
				on
			})
		});
		this.#wants.onWant((peer, channel) => {
			if (this.#held.has(channel)) peer.send({
				t: "pub",
				c: channel,
				d: this.#held.get(channel),
				r: true
			});
		});
		const hello = require_plugin.plugin(() => ({ open: (peer) => void peer.send({ t: "hello" }) }));
		const routes = require_plugin.plugin(() => ({ data: (peer, msg, next) => {
			if (msg.t === "hello") return void this.#wants.announce(peer);
			if (msg.t !== "pub") return next(msg);
			if (msg.to !== void 0) return void this.#who.peer(msg.to)?.send(msg);
			if (this.#retains.has(msg.c)) this.#held.set(msg.c, msg.d);
			for (const to of this.#wants.match(msg.c, peer)) to.send(msg);
		} }));
		this.#hub = new require_hub.Hub([
			hello,
			this.#who,
			this.#wants,
			routes
		], options);
		this.#here = require_participant.participant(this.#hub);
		this.#here.listen((msg) => this.#inbound(msg));
	}
	/** Joins another end over any node. The returned Unsub removes and closes it. */
	add(node, meta) {
		return this.#hub.add(require_map.tagged(node, this.#name), meta);
	}
	/** The ends joined to this one, its own participation excluded */
	get peers() {
		return this.#hub.peers.filter((peer) => peer.meta["local"] !== true);
	}
	/** One channel, typed by C */
	topic(channel) {
		return new require_topic.ChannelTopic(channel, this.#here, this.#sinks);
	}
	close() {
		this.#hub.close();
	}
	#inbound(msg) {
		if (msg.t !== "pub") return;
		const set = this.#sinks.get(msg.c);
		if (!set) return;
		const meta = {
			channel: msg.c,
			from: msg.from ?? null,
			retained: msg.r === true
		};
		for (const fn of [...set]) fn(msg.d, meta);
	}
};
//#endregion
exports.Wire = Wire;

//# sourceMappingURL=wire.cjs.map