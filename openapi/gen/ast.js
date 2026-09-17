import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import ts from "typescript";
import { NEVER, NEVER as NEVER$1, QUESTION_TOKEN, UNKNOWN, UNKNOWN as UNKNOWN$1, addJSDocComment, astToString, tsIntersection as intersection, tsModifiers, tsPropertyIndex, tsUnion as union } from "openapi-typescript";
//#region lib/openapi/src/gen/ast.ts
var ast_exports = /* @__PURE__ */ __exportAll({
	NEVER: () => NEVER$1,
	UNKNOWN: () => UNKNOWN$1,
	alias: () => alias,
	arrow: () => arrow,
	call: () => call,
	collapse: () => collapse,
	constant: () => constant,
	covers: () => covers,
	dict: () => dict,
	docs: () => docs,
	empty: () => empty,
	id: () => id,
	iface: () => iface,
	index: () => index,
	intersection: () => intersection,
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
/** `Target["a"]["b"]` — the type-level read of a nested member. */
var index = (target, path) => path.reduce((node, key) => f.createIndexedAccessTypeNode(node, literal(key)), target);
/** `Record<K, V>`, with `Record<string, string>` the usual case. */
var dict = (key = STRING, value = STRING) => f.createTypeReferenceNode(f.createIdentifier("Record"), [key, value]);
var STRING = f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
/** A value object literal, `{ a: 1, ...rest }`. The type-level twin is `obj`. */
var record = (entries) => f.createObjectLiteralExpression(entries.map((entry) => "spread" in entry ? f.createSpreadAssignment(entry.spread) : f.createPropertyAssignment(tsPropertyIndex(entry.name), entry.value)), true);
/** `export const name = value`. */
var constant = (name, value, type) => f.createVariableStatement(tsModifiers({ export: true }), f.createVariableDeclarationList([f.createVariableDeclaration(name, void 0, type, value)], ts.NodeFlags.Const));
/** `(a, b) => body`. An object literal body gets its parentheses from the printer. */
var arrow = (params, body) => f.createArrowFunction(void 0, void 0, params, void 0, void 0, body);
var param = (name, type, options = {}) => f.createParameterDeclaration(void 0, void 0, name, options.optional ? QUESTION_TOKEN : void 0, type, options.fallback);
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
var source = (code) => [...ts.createSourceFile("gen.ts", code, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS).statements];
var IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
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
	if (ts.isUnionTypeNode(n)) return fold(n.types, options.subsume ? covers : same, Union);
	if (ts.isIntersectionTypeNode(n)) return fold(n.types, options.subsume ? flip(covers) : same, Intersection);
	if (ts.isParenthesizedTypeNode(n) && atomic(n.type)) return n.type;
	return n;
});
/** True when two types have the same shape, whatever order their members are written in. */
var same = (a, b) => key(a) === key(b);
/** True when every value of `narrow` is also a value of `wide`. Structural, and deliberately shy: unsure means false. */
var covers = (wide, narrow) => {
	if (same(wide, narrow)) return true;
	if (wide.kind === ts.SyntaxKind.UnknownKeyword || wide.kind === ts.SyntaxKind.AnyKeyword) return true;
	if (narrow.kind === ts.SyntaxKind.NeverKeyword) return true;
	if (ts.isParenthesizedTypeNode(wide)) return covers(wide.type, narrow);
	if (ts.isParenthesizedTypeNode(narrow)) return covers(wide, narrow.type);
	if (ts.isUnionTypeNode(narrow)) return narrow.types.every((type) => covers(wide, type));
	if (ts.isUnionTypeNode(wide)) return wide.types.some((type) => covers(type, narrow));
	if (ts.isArrayTypeNode(wide) && ts.isArrayTypeNode(narrow)) return covers(wide.elementType, narrow.elementType);
	if (ts.isTypeLiteralNode(wide)) return ts.isTypeLiteralNode(narrow) && wide.members.every((m) => holds(m, narrow));
	if (ts.isLiteralTypeNode(narrow)) return widens(wide, narrow.literal);
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
var Union = {
	identity: NEVER,
	absorbing: UNKNOWN,
	build: f.createUnionTypeNode
};
var Intersection = {
	identity: UNKNOWN,
	absorbing: NEVER,
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
var atomic = (node) => ts.isTypeLiteralNode(node) || ts.isTypeReferenceNode(node) || ts.isArrayTypeNode(node) || ts.isTupleTypeNode(node) || ts.isLiteralTypeNode(node) || ts.isToken(node);
var flip = (f) => (a, b) => f(b, a);
/**
* Whether `narrow` carries a member that satisfies `want`.
*
* A property `narrow` does not mention counts as unsatisfied even where `want` has it
* optional: an object type is not exact, so a value of `{ a: string }` may carry a `b` of
* any type at all, and `{ b?: number }` does not admit every one of those.
*/
var holds = (want, narrow) => {
	if (!ts.isPropertySignature(want) || !want.type) return narrow.members.some((m) => text(m) === text(want));
	const found = narrow.members.find((m) => ts.isPropertySignature(m) && text(m.name) === text(want.name));
	if (!found || !ts.isPropertySignature(found) || !found.type) return false;
	if (found.questionToken && !want.questionToken) return false;
	return covers(want.type, found.type);
};
/** Whether a keyword type admits a literal: `string` admits `"a"`. */
var widens = (wide, literal) => {
	if (wide.kind === ts.SyntaxKind.StringKeyword) return ts.isStringLiteral(literal);
	if (wide.kind === ts.SyntaxKind.NumberKeyword) return ts.isNumericLiteral(literal);
	if (wide.kind === ts.SyntaxKind.BooleanKeyword) return literal.kind === ts.SyntaxKind.TrueKeyword || literal.kind === ts.SyntaxKind.FalseKeyword;
	return false;
};
var keys = /* @__PURE__ */ new WeakMap();
var canonical = (node) => {
	if (ts.isParenthesizedTypeNode(node)) return key(node.type);
	if (ts.isUnionTypeNode(node)) return `|(${sorted(node.types)})`;
	if (ts.isIntersectionTypeNode(node)) return `&(${sorted(node.types)})`;
	if (ts.isArrayTypeNode(node)) return `[${key(node.elementType)}]`;
	if (ts.isTupleTypeNode(node)) return `(${node.elements.map(key).join(",")})`;
	if (ts.isTypeLiteralNode(node)) return `{${[...node.members.map(entry)].sort().join(",")}}`;
	if (ts.isTypeReferenceNode(node)) return `${text(node.typeName)}<${(node.typeArguments ?? []).map(key).join(",")}>`;
	return text(node);
};
var sorted = (types) => [...types.map(key)].sort().join(",");
var entry = (node) => ts.isPropertySignature(node) && node.type ? `${text(node.name)}${node.questionToken ? "?" : ""}:${key(node.type)}` : text(node);
/** Synthetic nodes have no source file of their own; the printer only needs somewhere to hang them. */
var blank = ts.createSourceFile("", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
var printer = ts.createPrinter({
	omitTrailingSemicolon: true,
	removeComments: true
});
var text = (node) => printer.printNode(ts.EmitHint.Unspecified, node, blank);
//#endregion
export { NEVER$1 as NEVER, UNKNOWN$1 as UNKNOWN, alias, arrow, ast_exports, call, collapse, constant, covers, dict, docs, empty, id, iface, index, intersection, key, literal, member, name, obj, param, pointerOf, print, prop, record, ref, rewrite, same, source, str, template, union, walk };

//# sourceMappingURL=ast.js.map