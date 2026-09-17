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
/** openapi-typescript types its JSDoc helper for property signatures; the underlying API is not that narrow. */
export declare const docs: <T extends ts.Node>(node: T, description?: string) => T;
/**
 * Bottom-up rewrite of a type tree. Children are rewritten before their parent,
 * so `visitor` always sees nodes whose descendants are already final.
 */
export declare const rewrite: <T extends ts.Node>(node: T, visitor: (n: ts.Node) => ts.Node) => T;
/** Every node in a tree, parents before children. */
export declare const walk: (node: ts.Node) => Generator<ts.Node>;
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
