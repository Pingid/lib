//#region lib/wire/src/node.ts
/**
* Two cross-wired nodes in one process.
*
* @example
* ```ts
* const [mine, theirs] = pair<Frame>()
* h.add(theirs)
* mine.send({ t: 'hello' })
* ```
*/
var pair = () => {
	const fresh = () => ({
		sinks: /* @__PURE__ */ new Set(),
		gone: /* @__PURE__ */ new Set(),
		held: []
	});
	const sides = [fresh(), fresh()];
	let open = true;
	const shut = () => {
		if (!open) return;
		open = false;
		for (const side of sides) {
			for (const fn of [...side.gone]) fn();
			side.gone.clear();
			side.sinks.clear();
			side.held.length = 0;
		}
	};
	const end = (i) => {
		const mine = sides[i];
		const other = sides[i === 0 ? 1 : 0];
		return {
			send: (msg) => {
				if (!open) return false;
				queueMicrotask(() => {
					if (!open) return;
					if (other.sinks.size === 0) return void other.held.push(msg);
					for (const fn of [...other.sinks]) fn(msg);
				});
				return true;
			},
			listen: (fn) => {
				mine.sinks.add(fn);
				for (const msg of mine.held.splice(0)) fn(msg);
				return () => void mine.sinks.delete(fn);
			},
			closed: (fn) => {
				if (!open) return fn(), () => {};
				mine.gone.add(fn);
				return () => void mine.gone.delete(fn);
			},
			close: shut
		};
	};
	return [end(0), end(1)];
};
/**
* Join your own hub. What you hold is a node; what the hooks see is a peer.
*
* @example
* ```ts
* const here = participant(h)
* here.listen((msg) => console.log('for me', msg))
* here.send({ t: 'want', c: 'tick', on: true })
* ```
*/
var participant = (hub, meta = {}) => {
	const [mine, theirs] = pair();
	hub.add(theirs, {
		...meta,
		local: true
	});
	return mine;
};
/**
* A node speaking `B` over one speaking `A`. `decode` returning null drops the message.
*
* @example
* ```ts
* const lines = mapNode<string, Frame>(
*   socket,
*   (frame) => `${JSON.stringify(frame)}\n`,
*   (line) => (line.trim() ? (JSON.parse(line) as Frame) : null),
* )
* ```
*/
var mapNode = (node, encode, decode) => ({
	send: (msg) => node.send(encode(msg)),
	listen: (fn) => node.listen((msg) => {
		const out = decode(msg);
		if (out !== null) fn(out);
	}),
	closed: (fn) => node.closed(fn),
	close: () => node.close()
});
/**
* {@link mapNode} with the tag-and-filter a shared transport ends up writing.
*
* @example
* ```ts
* const [x, y] = pair<unknown>()
* chat.add(tagged<ChatFrame>(x, 'chat'))
* store.add(tagged<StoreFrame>(x, 'store')) // same wire, neither sees the other
* ```
*/
var tagged = (node, tag) => mapNode(node, (msg) => ({
	...msg,
	$: tag
}), (raw) => {
	if (typeof raw !== "object" || raw === null) return null;
	const { $: seen, ...rest } = raw;
	return seen === tag ? rest : null;
});
//#endregion
exports.mapNode = mapNode;
exports.pair = pair;
exports.participant = participant;
exports.tagged = tagged;

//# sourceMappingURL=node.cjs.map