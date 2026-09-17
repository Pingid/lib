Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_wire_protocols_records_index = require("./records/index.cjs");
const require_wire_protocols_topics_index = require("./topics/index.cjs");
Object.defineProperty(exports, "Records", {
	enumerable: true,
	get: function() {
		return require_wire_protocols_records_index.records_exports;
	}
});
Object.defineProperty(exports, "Topics", {
	enumerable: true,
	get: function() {
		return require_wire_protocols_topics_index.topics_exports;
	}
});
