const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
let typescript = require("typescript");
typescript = require_runtime.__toESM(typescript, 1);
let openapi_typescript = require("openapi-typescript");
//#region lib/openapi/src/gen/ast.ts
var ast_exports = /* @__PURE__ */ require_runtime.__exportAll({
	NEVER: () => openapi_typescript.NEVER,
	UNKNOWN: () => openapi_typescript.UNKNOWN,
	alias: () => alias,
	docs: () => docs,
	empty: () => empty,
	iface: () => iface,
	intersection: () => openapi_typescript.tsIntersection,
	literal: () => literal,
	name: () => name,
	obj: () => obj,
	pointerOf: () => pointerOf,
	print: () => print,
	prop: () => prop,
	ref: () => ref,
	rewrite: () => rewrite,
	union: () => openapi_typescript.tsUnion,
	walk: () => walk
});
var f = typescript.default.factory;
var obj = (fields) => f.createTypeLiteralNode(fields.map(prop));
var prop = (field) => docs(f.createPropertySignature(void 0, (0, openapi_typescript.tsPropertyIndex)(field.name), field.optional ? openapi_typescript.QUESTION_TOKEN : void 0, field.type), field.docs);
var alias = (name, type, description) => docs(f.createTypeAliasDeclaration((0, openapi_typescript.tsModifiers)({ export: true }), name, void 0, type), description);
var iface = (name, members) => f.createInterfaceDeclaration((0, openapi_typescript.tsModifiers)({ export: true }), name, void 0, void 0, members);
var literal = (value) => f.createLiteralTypeNode(f.createStringLiteral(value));
var ref = (name) => f.createTypeReferenceNode(f.createIdentifier(name));
/** openapi-typescript types its JSDoc helper for property signatures; the underlying API is not that narrow. */
var docs = (node, description) => {
	if (description) (0, openapi_typescript.addJSDocComment)({ description }, node);
	return node;
};
/**
* Bottom-up rewrite of a type tree. Children are rewritten before their parent,
* so `visitor` always sees nodes whose descendants are already final.
*/
var rewrite = (node, visitor) => {
	const result = typescript.default.transform(node, [(ctx) => {
		const step = (n) => visitor(typescript.default.visitEachChild(n, step, ctx));
		return (n) => step(n);
	}]);
	const [out] = result.transformed;
	result.dispose();
	return out ?? node;
};
/** Every node in a tree, parents before children. */
var walk = function* (node) {
	yield node;
	for (const child of children(node)) yield* walk(child);
};
/** Type nodes that carry no information: `never`, `{}`, `Record<string, never>`. */
var empty = (node) => {
	if (!node) return true;
	if (node.kind === typescript.default.SyntaxKind.NeverKeyword) return true;
	if (typescript.default.isTypeLiteralNode(node)) return node.members.length === 0;
	if (typescript.default.isTypeReferenceNode(node) && name(node) === "Record") return node.typeArguments?.[1]?.kind === typescript.default.SyntaxKind.NeverKeyword;
	return false;
};
/** The identifier a type reference points at, when it is a bare name. */
var name = (node) => typescript.default.isIdentifier(node.typeName) ? node.typeName.text : void 0;
/**
* A reference named by a JSON pointer: the placeholder a schema reference wears
* between `read` and `print`, while its final name is still up for grabs.
*/
var pointerOf = (node) => {
	if (!typescript.default.isTypeReferenceNode(node)) return void 0;
	const id = name(node);
	return id?.startsWith("#/") ? id : void 0;
};
var print = (nodes) => (0, openapi_typescript.astToString)([...nodes]);
var children = (node) => {
	const out = [];
	typescript.default.forEachChild(node, (child) => void out.push(child));
	return out;
};
//#endregion
Object.defineProperty(exports, "NEVER", {
	enumerable: true,
	get: function() {
		return openapi_typescript.NEVER;
	}
});
Object.defineProperty(exports, "UNKNOWN", {
	enumerable: true,
	get: function() {
		return openapi_typescript.UNKNOWN;
	}
});
exports.alias = alias;
Object.defineProperty(exports, "ast_exports", {
	enumerable: true,
	get: function() {
		return ast_exports;
	}
});
exports.docs = docs;
exports.empty = empty;
exports.iface = iface;
Object.defineProperty(exports, "intersection", {
	enumerable: true,
	get: function() {
		return openapi_typescript.tsIntersection;
	}
});
exports.literal = literal;
exports.name = name;
exports.obj = obj;
exports.pointerOf = pointerOf;
exports.print = print;
exports.prop = prop;
exports.ref = ref;
exports.rewrite = rewrite;
Object.defineProperty(exports, "union", {
	enumerable: true,
	get: function() {
		return openapi_typescript.tsUnion;
	}
});
exports.walk = walk;

//# sourceMappingURL=ast.cjs.map