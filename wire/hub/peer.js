//#region lib/wire/src/hub/peer.ts
/** The Peer a Hub wraps around an added node. Outbound sends run the hub's send chain. */
var HubPeer = class {
	#node;
	#meta;
	#dispatch;
	constructor(node, meta, dispatch) {
		this.#node = node;
		this.#meta = meta;
		this.#dispatch = dispatch;
	}
	get meta() {
		return this.#meta;
	}
	send(msg) {
		return this.#dispatch(this, msg);
	}
	listen(fn) {
		return this.#node.listen(fn);
	}
	closed(fn) {
		return this.#node.closed(fn);
	}
	close() {
		this.#node.close();
	}
};
//#endregion
export { HubPeer };

//# sourceMappingURL=peer.js.map