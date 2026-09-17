import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import { FakeClock, SystemClock, systemClock } from "./clock.js";
import { keepalive } from "./keepalive.js";
import { fromPostMessage } from "./post-message.js";
import { ReconnectNode } from "./reconnect.js";
import { adders, source } from "./source.js";
import { Sockets } from "./sockets.js";
//#region lib/wire/src/adapters/index.ts
var adapters_exports = /* @__PURE__ */ __exportAll({
	FakeClock: () => FakeClock,
	ReconnectNode: () => ReconnectNode,
	Sockets: () => Sockets,
	SystemClock: () => SystemClock,
	adders: () => adders,
	fromPostMessage: () => fromPostMessage,
	keepalive: () => keepalive,
	source: () => source,
	systemClock: () => systemClock
});
//#endregion
export { FakeClock, ReconnectNode, Sockets, SystemClock, adapters_exports, adders, fromPostMessage, keepalive, source, systemClock };

//# sourceMappingURL=index.js.map