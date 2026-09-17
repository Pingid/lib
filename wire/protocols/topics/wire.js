import { Directory } from "../../directory/directory.js";
import { Hub } from "../../hub/hub.js";
import { plugin } from "../../hub/plugin.js";
import { Interest } from "../../interest/interest.js";
import { tagged } from "../../node/map.js";
import { participant } from "../../node/participant.js";
import { ChannelTopic } from "./topic.js";
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
		this.#who = new Directory({
			from: (msg) => msg.t === "pub" ? msg.from ?? null : "",
			stamp: (msg, id) => ({
				...msg,
				from: id
			})
		});
		this.#wants = new Interest({
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
		const hello = plugin(() => ({ open: (peer) => void peer.send({ t: "hello" }) }));
		const routes = plugin(() => ({ data: (peer, msg, next) => {
			if (msg.t === "hello") return void this.#wants.announce(peer);
			if (msg.t !== "pub") return next(msg);
			if (msg.to !== void 0) return void this.#who.peer(msg.to)?.send(msg);
			if (this.#retains.has(msg.c)) this.#held.set(msg.c, msg.d);
			for (const to of this.#wants.match(msg.c, peer)) to.send(msg);
		} }));
		this.#hub = new Hub([
			hello,
			this.#who,
			this.#wants,
			routes
		], options);
		this.#here = participant(this.#hub);
		this.#here.listen((msg) => this.#inbound(msg));
	}
	/** Joins another end over any node. The returned Unsub removes and closes it. */
	add(node, meta) {
		return this.#hub.add(tagged(node, this.#name), meta);
	}
	/** The ends joined to this one, its own participation excluded */
	get peers() {
		return this.#hub.peers.filter((peer) => peer.meta["local"] !== true);
	}
	/** One channel, typed by C */
	topic(channel) {
		return new ChannelTopic(channel, this.#here, this.#sinks);
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
export { Wire };

//# sourceMappingURL=wire.js.map