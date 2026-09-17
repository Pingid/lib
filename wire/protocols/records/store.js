import { Hub } from "../../hub/hub.js";
import { plugin } from "../../hub/plugin.js";
import { Interest } from "../../interest/interest.js";
import { tagged } from "../../node/map.js";
import { participant } from "../../node/participant.js";
//#region lib/wire/src/protocols/records/store.ts
function hash([collection, id]) {
	return `${collection}/${id}`;
}
/** A patch reaches the record's watchers and the collection's alike */
function expand([collection, id]) {
	return id === "*" ? [[collection, "*"]] : [[collection, id], [collection, "*"]];
}
/**
* The same machinery as Topics under a compound key, with expand doing the wildcard. Shares
* nothing with topics except Interest, which never learns what a collection is. One end: the
* same call whether it hosts the others or joins them.
*
* @example
* ```ts
* const viewer = new Store({ name: 'store' })
* viewer.add(server)
* viewer.watch('users', '42', (patch) => apply(patch))
* viewer.watch('users', '*', (patch, at) => log(at.id, patch))
* viewer.patch('users', '42', { name: 'ada' })
* ```
*/
var Store = class {
	#name;
	#hub;
	#here;
	#wants;
	#sinks;
	constructor(options) {
		this.#name = options.name;
		this.#sinks = /* @__PURE__ */ new Map();
		this.#wants = new Interest({
			read: (msg) => msg.t === "watch" ? {
				key: [msg.k[0], msg.k[1]],
				on: msg.on
			} : null,
			write: ({ key, on }) => ({
				t: "watch",
				k: [key[0], key[1]],
				on
			}),
			hash,
			expand
		});
		const hello = plugin(() => ({ open: (peer) => void peer.send({ t: "hello" }) }));
		const routes = plugin(() => ({ data: (peer, msg, next) => {
			if (msg.t === "hello") return void this.#wants.announce(peer);
			if (msg.t !== "patch") return next(msg);
			for (const to of this.#wants.match([msg.c, msg.id], peer)) to.send(msg);
		} }));
		this.#hub = new Hub([
			hello,
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
	/** Watches one record, or every record in the collection when id is '*' */
	watch(collection, id, fn) {
		const key = hash([collection, id]);
		const set = this.#sinks.get(key) ?? /* @__PURE__ */ new Set();
		this.#sinks.set(key, set);
		set.add(fn);
		if (set.size === 1) this.#here.send({
			t: "watch",
			k: [collection, id],
			on: true
		});
		return () => {
			if (!set.delete(fn) || set.size > 0) return;
			this.#sinks.delete(key);
			this.#here.send({
				t: "watch",
				k: [collection, id],
				on: false
			});
		};
	}
	/** Publishes a patch to everyone watching the record or its collection */
	patch(collection, id, patch) {
		return this.#here.send({
			t: "patch",
			c: collection,
			id,
			d: patch
		});
	}
	/** Keys anyone on this hub is watching, its own peers included */
	watched() {
		return this.#wants.wanted();
	}
	close() {
		this.#hub.close();
	}
	#inbound(msg) {
		if (msg.t !== "patch") return;
		for (const key of expand([msg.c, msg.id])) {
			const set = this.#sinks.get(hash(key));
			if (!set) continue;
			for (const fn of [...set]) fn(msg.d, {
				collection: msg.c,
				id: msg.id
			});
		}
	}
};
//#endregion
export { Store };

//# sourceMappingURL=store.js.map