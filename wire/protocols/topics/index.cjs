Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../../../_virtual/_rolldown/runtime.cjs");
const require_topic = require("./topic.cjs");
const require_wire = require("./wire.cjs");
//#region lib/wire/src/protocols/topics/index.ts
var topics_exports = /* @__PURE__ */ require_runtime.__exportAll({
	ChannelTopic: () => require_topic.ChannelTopic,
	Wire: () => require_wire.Wire
});
//#endregion
exports.ChannelTopic = require_topic.ChannelTopic;
exports.Wire = require_wire.Wire;
Object.defineProperty(exports, "topics_exports", {
	enumerable: true,
	get: function() {
		return topics_exports;
	}
});

//# sourceMappingURL=index.cjs.map