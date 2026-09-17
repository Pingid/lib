const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
let typescript = require("typescript");
typescript = require_runtime.__toESM(typescript, 1);
let openapi_typescript = require("openapi-typescript");
//#region lib/openapi/src/gen/ast.ts
var ast_exports = /* @__PURE__ */ require_runtime.__exportAll({
	NEVER: () => openapi_typescript.NEVER,
	UNKNOWN: () => openapi_typescript.UNKNOWN,
	alias: () => alias,
	arrow: () => arrow,
	call: () => call,
	collapse: () => collapse,
	constant: () => constant,
	covers: () => covers,
	docs: () => docs,
	empty: () => empty,
	id: () => id,
	iface: () => iface,
	intersection: () => openapi_typescript.tsIntersection,
	key: () => key,
	literal: () => literal,
	member: () => member,
	name: () => name,
	obj: () => obj,
	param: () => param,
	pointerOf: () => pointerOf,
	print: () => print,
	prop: () => prop,
	record: () => record,
	ref: () => ref,
	rewrite: () => rewrite,
	same: () => same,
	source: () => source,
	str: () => str,
	template: () => template,
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
/** A value object literal, `{ a: 1, ...rest }`. The type-level twin is `obj`. */
var record = (entries) => f.createObjectLiteralExpression(entries.map((entry) => "spread" in entry ? f.createSpreadAssignment(entry.spread) : f.createPropertyAssignment((0, openapi_typescript.tsPropertyIndex)(entry.name), entry.value)), true);
/** `export const name = value`. */
var constant = (name, value, type) => f.createVariableStatement((0, openapi_typescript.tsModifiers)({ export: true }), f.createVariableDeclarationList([f.createVariableDeclaration(name, void 0, type, value)], typescript.default.NodeFlags.Const));
/** `(a, b) => body`. An object literal body gets its parentheses from the printer. */
var arrow = (params, body) => f.createArrowFunction(void 0, void 0, params, void 0, void 0, body);
var param = (name, type, optional = false) => f.createParameterDeclaration(void 0, void 0, name, optional ? openapi_typescript.QUESTION_TOKEN : void 0, type);
var call = (target, args = []) => f.createCallExpression(target, void 0, args);
var id = (name) => f.createIdentifier(name);
var str = (value) => f.createStringLiteral(value);
/** `target.name`, falling back to `target["name"]` where the name is not a legal identifier. */
var member = (target, name) => IDENTIFIER_RE.test(name) ? f.createPropertyAccessExpression(target, name) : f.createElementAccessExpression(target, str(name));
/**
* A template literal from alternating text and expressions: `template(['/things/', expr, '/tags'])`.
* Text with no expressions beside it comes back as a plain string literal instead.
*/
var template = (parts) => {
	const spans = [];
	let head = "";
	for (const part of parts) if (typeof part !== "string") spans.push({
		value: part,
		after: ""
	});
	else if (spans.length) spans[spans.length - 1].after += part;
	else head += part;
	if (!spans.length) return str(head);
	return f.createTemplateExpression(f.createTemplateHead(head), spans.map((span, i) => f.createTemplateSpan(span.value, i === spans.length - 1 ? f.createTemplateTail(span.after) : f.createTemplateMiddle(span.after))));
};
/**
* Parses TypeScript into statements. Fixed runtime code — a helper the generated file calls —
* is far easier read and maintained as source than as a stack of factory calls.
*/
var source = (code) => [...typescript.default.createSourceFile("gen.ts", code, typescript.default.ScriptTarget.Latest, false, typescript.default.ScriptKind.TS).statements];
var IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
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
/**
* Collapses the matching members of every union and intersection in a tree.
*
* `tsUnion` only dedupes primitives by kind, so a union built from several responses that
* happen to share a shape keeps one member per response:
*
* ```ts
* // { message: string } | { message: string } | { message?: string } | { message?: string }
* collapse(type)                     // { message: string } | { message?: string }
* collapse(type, { subsume: true })  // { message?: string }
* ```
*
* Matching is structural and blind to the order of union, intersection and object members,
* so `{ a: string; b: number }` and `{ b: number; a: string }` count as one. A union left
* with a single member unwraps to that member.
*
* The members that carry nothing go either way: `never | T` and `unknown & T` reduce to `T`,
* and `unknown | T` and `never & T` to `unknown` and `never`. Those hold whatever `T` is,
* so they apply without `subsume` — a reply with no content intersected with a status tag
* leaves a `never` that would otherwise sit in the union unread.
*/
var collapse = (node, options = {}) => rewrite(node, (n) => {
	if (typescript.default.isUnionTypeNode(n)) return fold(n.types, options.subsume ? covers : same, Union);
	if (typescript.default.isIntersectionTypeNode(n)) return fold(n.types, options.subsume ? flip(covers) : same, Intersection);
	if (typescript.default.isParenthesizedTypeNode(n) && atomic(n.type)) return n.type;
	return n;
});
/** True when two types have the same shape, whatever order their members are written in. */
var same = (a, b) => key(a) === key(b);
/** True when every value of `narrow` is also a value of `wide`. Structural, and deliberately shy: unsure means false. */
var covers = (wide, narrow) => {
	if (same(wide, narrow)) return true;
	if (wide.kind === typescript.default.SyntaxKind.UnknownKeyword || wide.kind === typescript.default.SyntaxKind.AnyKeyword) return true;
	if (narrow.kind === typescript.default.SyntaxKind.NeverKeyword) return true;
	if (typescript.default.isParenthesizedTypeNode(wide)) return covers(wide.type, narrow);
	if (typescript.default.isParenthesizedTypeNode(narrow)) return covers(wide, narrow.type);
	if (typescript.default.isUnionTypeNode(narrow)) return narrow.types.every((type) => covers(wide, type));
	if (typescript.default.isUnionTypeNode(wide)) return wide.types.some((type) => covers(type, narrow));
	if (typescript.default.isArrayTypeNode(wide) && typescript.default.isArrayTypeNode(narrow)) return covers(wide.elementType, narrow.elementType);
	if (typescript.default.isTypeLiteralNode(wide)) return typescript.default.isTypeLiteralNode(narrow) && wide.members.every((m) => holds(m, narrow));
	if (typescript.default.isLiteralTypeNode(narrow)) return widens(wide, narrow.literal);
	return false;
};
/**
* A canonical string for a type: equal keys mean the same shape. Union, intersection and
* object members are sorted, so the key does not move when the order does.
*/
var key = (node) => {
	const cached = keys.get(node);
	if (cached !== void 0) return cached;
	const computed = canonical(node);
	keys.set(node, computed);
	return computed;
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
var Union = {
	identity: openapi_typescript.NEVER,
	absorbing: openapi_typescript.UNKNOWN,
	build: f.createUnionTypeNode
};
var Intersection = {
	identity: openapi_typescript.UNKNOWN,
	absorbing: openapi_typescript.NEVER,
	build: f.createIntersectionTypeNode
};
/**
* Reduces by the algebra, then drops every member another member makes redundant, then rebuilds.
*
* `redundant(a, b)` says that keeping `a` makes `b` unnecessary. Where two members make each
* other redundant the earlier one stays, so the result never empties out and never depends on
* which member happened to be visited first.
*/
var fold = (types, redundant, { identity, absorbing, build }) => {
	if (types.some((type) => type.kind === absorbing.kind)) return absorbing;
	const carrying = types.filter((type) => type.kind !== identity.kind);
	const kept = carrying.filter((type, i) => carrying.every((other, j) => j === i || !redundant(other, type) || redundant(type, other) && i < j));
	if (!kept.length) return identity;
	if (kept.length === 1) return kept[0] ?? identity;
	if (kept.length === types.length) return build(types);
	return build(kept);
};
/**
* Types that mean the same thing with their parentheses taken off, wherever they sit —
* the leftovers from a union that collapsed down to one member inside `(...)[]`. A union,
* a function type or a `keyof` still needs its parentheses in some positions, so they keep them.
*/
var atomic = (node) => typescript.default.isTypeLiteralNode(node) || typescript.default.isTypeReferenceNode(node) || typescript.default.isArrayTypeNode(node) || typescript.default.isTupleTypeNode(node) || typescript.default.isLiteralTypeNode(node) || typescript.default.isToken(node);
var flip = (f) => (a, b) => f(b, a);
/**
* Whether `narrow` carries a member that satisfies `want`.
*
* A property `narrow` does not mention counts as unsatisfied even where `want` has it
* optional: an object type is not exact, so a value of `{ a: string }` may carry a `b` of
* any type at all, and `{ b?: number }` does not admit every one of those.
*/
var holds = (want, narrow) => {
	if (!typescript.default.isPropertySignature(want) || !want.type) return narrow.members.some((m) => text(m) === text(want));
	const found = narrow.members.find((m) => typescript.default.isPropertySignature(m) && text(m.name) === text(want.name));
	if (!found || !typescript.default.isPropertySignature(found) || !found.type) return false;
	if (found.questionToken && !want.questionToken) return false;
	return covers(want.type, found.type);
};
/** Whether a keyword type admits a literal: `string` admits `"a"`. */
var widens = (wide, literal) => {
	if (wide.kind === typescript.default.SyntaxKind.StringKeyword) return typescript.default.isStringLiteral(literal);
	if (wide.kind === typescript.default.SyntaxKind.NumberKeyword) return typescript.default.isNumericLiteral(literal);
	if (wide.kind === typescript.default.SyntaxKind.BooleanKeyword) return literal.kind === typescript.default.SyntaxKind.TrueKeyword || literal.kind === typescript.default.SyntaxKind.FalseKeyword;
	return false;
};
var keys = /* @__PURE__ */ new WeakMap();
var canonical = (node) => {
	if (typescript.default.isParenthesizedTypeNode(node)) return key(node.type);
	if (typescript.default.isUnionTypeNode(node)) return `|(${sorted(node.types)})`;
	if (typescript.default.isIntersectionTypeNode(node)) return `&(${sorted(node.types)})`;
	if (typescript.default.isArrayTypeNode(node)) return `[${key(node.elementType)}]`;
	if (typescript.default.isTupleTypeNode(node)) return `(${node.elements.map(key).join(",")})`;
	if (typescript.default.isTypeLiteralNode(node)) return `{${[...node.members.map(entry)].sort().join(",")}}`;
	if (typescript.default.isTypeReferenceNode(node)) return `${text(node.typeName)}<${(node.typeArguments ?? []).map(key).join(",")}>`;
	return text(node);
};
var sorted = (types) => [...types.map(key)].sort().join(",");
var entry = (node) => typescript.default.isPropertySignature(node) && node.type ? `${text(node.name)}${node.questionToken ? "?" : ""}:${key(node.type)}` : text(node);
/** Synthetic nodes have no source file of their own; the printer only needs somewhere to hang them. */
var blank = typescript.default.createSourceFile("", "", typescript.default.ScriptTarget.Latest, false, typescript.default.ScriptKind.TS);
var printer = typescript.default.createPrinter({
	omitTrailingSemicolon: true,
	removeComments: true
});
var text = (node) => printer.printNode(typescript.default.EmitHint.Unspecified, node, blank);
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
exports.arrow = arrow;
Object.defineProperty(exports, "ast_exports", {
	enumerable: true,
	get: function() {
		return ast_exports;
	}
});
exports.call = call;
exports.collapse = collapse;
exports.constant = constant;
exports.covers = covers;
exports.docs = docs;
exports.empty = empty;
exports.id = id;
exports.iface = iface;
Object.defineProperty(exports, "intersection", {
	enumerable: true,
	get: function() {
		return openapi_typescript.tsIntersection;
	}
});
exports.key = key;
exports.literal = literal;
exports.member = member;
exports.name = name;
exports.obj = obj;
exports.param = param;
exports.pointerOf = pointerOf;
exports.print = print;
exports.prop = prop;
exports.record = record;
exports.ref = ref;
exports.rewrite = rewrite;
exports.same = same;
exports.source = source;
exports.str = str;
exports.template = template;
Object.defineProperty(exports, "union", {
	enumerable: true,
	get: function() {
		return openapi_typescript.tsUnion;
	}
});
exports.walk = walk;

//# sourceMappingURL=ast.cjs.map