import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import ts from "typescript";
import { NEVER, QUESTION_TOKEN, UNKNOWN, addJSDocComment, astToString, tsIntersection as intersection, tsModifiers, tsPropertyIndex, tsUnion as union } from "openapi-typescript";
//#region lib/openapi/src/gen/ast.ts
var ast_exports = /* @__PURE__ */ __exportAll({
	NEVER: () => NEVER,
	UNKNOWN: () => UNKNOWN,
	alias: () => alias,
	docs: () => docs,
	empty: () => empty,
	iface: () => iface,
	intersection: () => intersection,
	literal: () => literal,
	name: () => name,
	obj: () => obj,
	pointerOf: () => pointerOf,
	print: () => print,
	prop: () => prop,
	ref: () => ref,
	rewrite: () => rewrite,
	union: () => union,
	walk: () => walk
});
var f = ts.factory;
var obj = (fields) => f.createTypeLiteralNode(fields.map(prop));
var prop = (field) => docs(f.createPropertySignature(void 0, tsPropertyIndex(field.name), field.optional ? QUESTION_TOKEN : void 0, field.type), field.docs);
var alias = (name, type, description) => docs(f.createTypeAliasDeclaration(tsModifiers({ export: true }), name, void 0, type), description);
var iface = (name, members) => f.createInterfaceDeclaration(tsModifiers({ export: true }), name, void 0, void 0, members);
var literal = (value) => f.createLiteralTypeNode(f.createStringLiteral(value));
var ref = (name) => f.createTypeReferenceNode(f.createIdentifier(name));
/** openapi-typescript types its JSDoc helper for property signatures; the underlying API is not that narrow. */
var docs = (node, description) => {
	if (description) addJSDocComment({ description }, node);
	return node;
};
/**
* Bottom-up rewrite of a type tree. Children are rewritten before their parent,
* so `visitor` always sees nodes whose descendants are already final.
*/
var rewrite = (node, visitor) => {
	const result = ts.transform(node, [(ctx) => {
		const step = (n) => visitor(ts.visitEachChild(n, step, ctx));
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
	if (node.kind === ts.SyntaxKind.NeverKeyword) return true;
	if (ts.isTypeLiteralNode(node)) return node.members.length === 0;
	if (ts.isTypeReferenceNode(node) && name(node) === "Record") return node.typeArguments?.[1]?.kind === ts.SyntaxKind.NeverKeyword;
	return false;
};
/** The identifier a type reference points at, when it is a bare name. */
var name = (node) => ts.isIdentifier(node.typeName) ? node.typeName.text : void 0;
/**
* A reference named by a JSON pointer: the placeholder a schema reference wears
* between `read` and `print`, while its final name is still up for grabs.
*/
var pointerOf = (node) => {
	if (!ts.isTypeReferenceNode(node)) return void 0;
	const id = name(node);
	return id?.startsWith("#/") ? id : void 0;
};
var print = (nodes) => astToString([...nodes]);
var children = (node) => {
	const out = [];
	ts.forEachChild(node, (child) => void out.push(child));
	return out;
};
//#endregion
export { NEVER, UNKNOWN, alias, ast_exports, docs, empty, iface, intersection, literal, name, obj, pointerOf, print, prop, ref, rewrite, union, walk };

//# sourceMappingURL=ast.js.map