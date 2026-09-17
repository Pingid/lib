Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
const require_clock = require("./clock.cjs");
const require_keepalive = require("./keepalive.cjs");
const require_post_message = require("./post-message.cjs");
const require_reconnect = require("./reconnect.cjs");
const require_source = require("./source.cjs");
const require_sockets = require("./sockets.cjs");
//#region lib/wire/src/adapters/index.ts
var adapters_exports = /* @__PURE__ */ require_runtime.__exportAll({
	FakeClock: () => require_clock.FakeClock,
	ReconnectNode: () => require_reconnect.ReconnectNode,
	Sockets: () => require_sockets.Sockets,
	SystemClock: () => require_clock.SystemClock,
	adders: () => require_source.adders,
	fromPostMessage: () => require_post_message.fromPostMessage,
	keepalive: () => require_keepalive.keepalive,
	source: () => require_source.source,
	systemClock: () => require_clock.systemClock
});
//#endregion
exports.FakeClock = require_clock.FakeClock;
exports.ReconnectNode = require_reconnect.ReconnectNode;
exports.Sockets = require_sockets.Sockets;
exports.SystemClock = require_clock.SystemClock;
Object.defineProperty(exports, "adapters_exports", {
	enumerable: true,
	get: function() {
		return adapters_exports;
	}
});
exports.adders = require_source.adders;
exports.fromPostMessage = require_post_message.fromPostMessage;
exports.keepalive = require_keepalive.keepalive;
exports.source = require_source.source;
exports.systemClock = require_clock.systemClock;

//# sourceMappingURL=index.cjs.map