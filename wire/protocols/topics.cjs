Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_core = require("../core.cjs");
const require_node = require("../node.cjs");
const require_interest = require("../interest.cjs");
const require_directory = require("../directory.cjs");
//#region lib/wire/src/protocols/topics.ts
/**
* `interest` for the table, `directory` for replies, twenty lines for the rest.
*
* @example
* ```ts
* const app = topics<{ tick: number }>({ name: 'app', retain: ['tick'] })
* const wire = app.node()
* ```
*/
var topics = (spec) => ({ node: (opts = {}) => {
	const retains = new Set(spec.retain ?? []);
	const held = /* @__PURE__ */ new Map();
	const who = require_directory.directory({
		from: (msg) => msg.t === "pub" ? msg.from ?? null : "",
		stamp: (msg, id) => ({
			...msg,
			from: id
		})
	});
	const wants = require_interest.interest({
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
	wants.onWant((peer, channel) => {
		if (held.has(channel)) peer.send({
			t: "pub",
			c: channel,
			d: held.get(channel),
			r: true
		});
	});
	const hello = () => ({ open: (peer) => void peer.send({ t: "hello" }) });
	const routes = () => ({ data: (peer, msg, next) => {
		if (msg.t === "hello") return void wants.announce(peer);
		if (msg.t !== "pub") return next(msg);
		if (msg.to !== void 0) return void who.peer(msg.to)?.send(msg);
		if (retains.has(msg.c)) held.set(msg.c, msg.d);
		for (const to of wants.match(msg.c, peer)) to.send(msg);
	} });
	const h = require_core.hub([
		hello,
		who,
		wants,
		routes
	], opts);
	const here = require_node.participant(h);
	const sinks = /* @__PURE__ */ new Map();
	here.listen((msg) => {
		if (msg.t !== "pub") return;
		const set = sinks.get(msg.c);
		if (!set) return;
		const meta = {
			channel: msg.c,
			from: msg.from ?? null,
			retained: msg.r === true
		};
		for (const fn of [...set]) fn(msg.d, meta);
	});
	return {
		add: (node, meta) => h.add(require_node.tagged(node, spec.name), meta),
		topic: (channel) => ({
			send: (payload, to) => here.send(to === void 0 ? {
				t: "pub",
				c: channel,
				d: payload
			} : {
				t: "pub",
				c: channel,
				d: payload,
				to
			}),
			listen: (fn) => {
				const set = sinks.get(channel) ?? /* @__PURE__ */ new Set();
				sinks.set(channel, set);
				const sink = fn;
				set.add(sink);
				if (set.size === 1) here.send({
					t: "want",
					c: channel,
					on: true
				});
				return () => {
					if (!set.delete(sink) || set.size > 0) return;
					sinks.delete(channel);
					here.send({
						t: "want",
						c: channel,
						on: false
					});
				};
			}
		}),
		get peers() {
			return h.peers.filter((peer) => peer.meta["local"] !== true);
		},
		close: () => h.close()
	};
} });
//#endregion
exports.topics = topics;

//# sourceMappingURL=topics.cjs.map