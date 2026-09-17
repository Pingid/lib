//#region lib/wire/src/node/map.ts
/** Creates a node speaking B over one speaking A. A decode returning null drops the message. */
function mapNode(node, encode, decode) {
	return {
		send: (msg) => node.send(encode(msg)),
		listen: (fn) => node.listen((msg) => {
			const out = decode(msg);
			if (out !== null) fn(out);
		}),
		closed: (fn) => node.closed(fn),
		close: () => node.close()
	};
}
/**
* mapNode with the tag-and-filter a shared transport ends up writing.
*
* @example
* ```ts
* const [x, y] = pair<unknown>()
* chat.add(tagged<ChatFrame>(x, 'chat'))
* store.add(tagged<StoreFrame>(x, 'store')) // same wire, neither sees the other
* ```
*/
function tagged(node, tag) {
	return mapNode(node, (msg) => ({
		...msg,
		$: tag
	}), (raw) => {
		if (typeof raw !== "object" || raw === null) return null;
		const { $: seen, ...rest } = raw;
		return seen === tag ? rest : null;
	});
}
//#endregion
export { mapNode, tagged };

//# sourceMappingURL=map.js.map