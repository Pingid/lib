import { hub } from "../core.js";
import { participant, tagged } from "../node.js";
import { interest } from "../interest.js";
//#region lib/wire/src/protocols/records.ts
var hash = ([collection, id]) => `${collection}/${id}`;
var expand = ([collection, id]) => id === "*" ? [[collection, "*"]] : [[collection, id], [collection, "*"]];
/**
* Interest in `(collection, id)`, with `expand` doing the wildcard.
*
* @example
* ```ts
* const store = records('store')
* const server = store.node()
* ```
*/
var records = (name) => ({ node: (opts = {}) => {
	const wants = interest({
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
	const hello = () => ({ open: (peer) => void peer.send({ t: "hello" }) });
	const routes = () => ({ data: (peer, msg, next) => {
		if (msg.t === "hello") return void wants.announce(peer);
		if (msg.t !== "patch") return next(msg);
		for (const to of wants.match([msg.c, msg.id], peer)) to.send(msg);
	} });
	const h = hub([
		hello,
		wants,
		routes
	], opts);
	const here = participant(h);
	const sinks = /* @__PURE__ */ new Map();
	here.listen((msg) => {
		if (msg.t !== "patch") return;
		for (const key of expand([msg.c, msg.id])) {
			const set = sinks.get(hash(key));
			if (!set) continue;
			for (const fn of [...set]) fn(msg.d, {
				collection: msg.c,
				id: msg.id
			});
		}
	});
	return {
		add: (node, meta) => h.add(tagged(node, name), meta),
		watch: (collection, id, fn) => {
			const key = hash([collection, id]);
			const set = sinks.get(key) ?? /* @__PURE__ */ new Set();
			sinks.set(key, set);
			set.add(fn);
			if (set.size === 1) here.send({
				t: "watch",
				k: [collection, id],
				on: true
			});
			return () => {
				if (!set.delete(fn) || set.size > 0) return;
				sinks.delete(key);
				here.send({
					t: "watch",
					k: [collection, id],
					on: false
				});
			};
		},
		patch: (collection, id, patch) => here.send({
			t: "patch",
			c: collection,
			id,
			d: patch
		}),
		watched: () => wants.wanted(),
		close: () => h.close()
	};
} });
//#endregion
export { records };

//# sourceMappingURL=records.js.map