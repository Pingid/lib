import { pair } from "./pair.js";
//#region lib/wire/src/node/participant.ts
/**
* Joins your own hub. What you hold is a node; what the hooks see is a peer.
*
* @example
* ```ts
* const here = participant(hub)
* here.listen((msg) => console.log('for me', msg))
* here.send({ t: 'want', c: 'tick', on: true })
* ```
*/
function participant(hub, meta = {}) {
	const [mine, theirs] = pair();
	hub.add(theirs, {
		...meta,
		local: true
	});
	return mine;
}
//#endregion
export { participant };

//# sourceMappingURL=participant.js.map