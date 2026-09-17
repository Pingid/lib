Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_ast = require("./gen/ast.cjs");
const require_model = require("./gen/model.cjs");
const require_ops = require("./gen/ops.cjs");
const require_emit = require("./gen/emit.cjs");
const require_doc = require("./gen/doc.cjs");
const require_index = require("./gen/index.cjs");
exports.Api = require_index.Api;
Object.defineProperty(exports, "Ast", {
	enumerable: true,
	get: function() {
		return require_ast.ast_exports;
	}
});
exports.Decl = require_model.Decl;
exports.Doc = require_doc.Doc;
exports.Emit = require_emit.Emit;
exports.Is = require_model.Is;
exports.Name = require_model.Name;
exports.Op = require_ops.Op;
exports.Pattern = require_model.Pattern;
exports.Route = require_model.Route;
exports.bind = require_emit.bind;
exports.generate = require_index.generate;
