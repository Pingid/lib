import { default as ts } from 'typescript';
export { NEVER, UNKNOWN, tsIntersection as intersection, tsUnion as union } from 'openapi-typescript';
/** One member of an object type. */
export type Field = {
    name: string;
    type: ts.TypeNode;
    optional?: boolean;
    docs?: string;
};
export declare const obj: (fields: Field[]) => ts.TypeLiteralNode;
export declare const prop: (field: Field) => ts.PropertySignature;
export declare const alias: (name: string, type: ts.TypeNode, description?: string) => ts.TypeAliasDeclaration;
export declare const iface: (name: string, members: readonly ts.TypeElement[]) => ts.InterfaceDeclaration;
export declare const literal: (value: string) => ts.TypeNode;
export declare const ref: (name: string) => ts.TypeReferenceNode;
/**
 * The value half. Everything above builds types; a generated file that carries runtime code —
 * a table of request builders, a list of urls — needs expressions and statements as well.
 */
/** One member of a value object: a named property, or a spread of another object. */
export type Entry = {
    name: string;
    value: ts.Expression;
} | {
    spread: ts.Expression;
};
/** A value object literal, `{ a: 1, ...rest }`. The type-level twin is `obj`. */
export declare const record: (entries: Entry[]) => ts.ObjectLiteralExpression;
/** `export const name = value`. */
export declare const constant: (name: string, value: ts.Expression, type?: ts.TypeNode) => ts.VariableStatement;
/** `(a, b) => body`. An object literal body gets its parentheses from the printer. */
export declare const arrow: (params: readonly ts.ParameterDeclaration[], body: ts.Expression) => ts.ArrowFunction;
export declare const param: (name: string, type?: ts.TypeNode, optional?: boolean) => ts.ParameterDeclaration;
export declare const call: (target: ts.Expression, args?: readonly ts.Expression[]) => ts.CallExpression;
export declare const id: (name: string) => ts.Identifier;
export declare const str: (value: string) => ts.StringLiteral;
/** `target.name`, falling back to `target["name"]` where the name is not a legal identifier. */
export declare const member: (target: ts.Expression, name: string) => ts.Expression;
/**
 * A template literal from alternating text and expressions: `template(['/things/', expr, '/tags'])`.
 * Text with no expressions beside it comes back as a plain string literal instead.
 */
export declare const template: (parts: (string | ts.Expression)[]) => ts.Expression;
/**
 * Parses TypeScript into statements. Fixed runtime code — a helper the generated file calls —
 * is far easier read and maintained as source than as a stack of factory calls.
 */
export declare const source: (code: string) => ts.Statement[];
/** openapi-typescript types its JSDoc helper for property signatures; the underlying API is not that narrow. */
export declare const docs: <T extends ts.Node>(node: T, description?: string) => T;
/**
 * Bottom-up rewrite of a type tree. Children are rewritten before their parent,
 * so `visitor` always sees nodes whose descendants are already final.
 */
export declare const rewrite: <T extends ts.Node>(node: T, visitor: (n: ts.Node) => ts.Node) => T;
/** Every node in a tree, parents before children. */
export declare const walk: (node: ts.Node) => Generator<ts.Node>;
export type CollapseOptions = {
    /**
     * Also drops union members another member already admits, and intersection members
     * another member already implies: `{ a: string } | { a?: string }` becomes `{ a?: string }`,
     * because every value of the first is a value of the second.
     *
     * The result is the same type, but a less descriptive one — `{ id: string; at: string }`
     * folds into `{ id: string }`, and `"a" | string` into `string`. Off by default.
     */
    subsume?: boolean;
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
export declare const collapse: <T extends ts.Node>(node: T, options?: CollapseOptions) => T;
/** True when two types have the same shape, whatever order their members are written in. */
export declare const same: (a: ts.TypeNode, b: ts.TypeNode) => boolean;
/** True when every value of `narrow` is also a value of `wide`. Structural, and deliberately shy: unsure means false. */
export declare const covers: (wide: ts.TypeNode, narrow: ts.TypeNode) => boolean;
/**
 * A canonical string for a type: equal keys mean the same shape. Union, intersection and
 * object members are sorted, so the key does not move when the order does.
 */
export declare const key: (node: ts.TypeNode) => string;
/** Type nodes that carry no information: `never`, `{}`, `Record<string, never>`. */
export declare const empty: (node: ts.TypeNode | undefined) => boolean;
/** The identifier a type reference points at, when it is a bare name. */
export declare const name: (node: ts.TypeReferenceNode) => string | undefined;
/**
 * A reference named by a JSON pointer: the placeholder a schema reference wears
 * between `read` and `print`, while its final name is still up for grabs.
 */
export declare const pointerOf: (node: ts.Node) => string | undefined;
export declare const print: (nodes: readonly ts.Node[]) => string;
