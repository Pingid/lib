import { Context } from './context.js';
import { AnyResource } from './resource.js';
/**
 * Resolution scope.
 *
 * Context values resolve up the parent chain, so a project can supply configuration to every
 * stack. Resource handles are local only, so the same `Resource` used in two stacks is built
 * once per stack rather than shared between them.
 */
export declare class Scope {
    private readonly parent;
    private readonly contexts;
    private readonly handles;
    constructor(parent?: Scope);
    child(): Scope;
    setContext<T>(context: Context<T>, value: T): void;
    getContext<T>(context: Context<T>): T;
    hasHandle(r: AnyResource): boolean;
    getHandle(r: AnyResource): unknown;
    setHandle(r: AnyResource, handle: unknown): void;
}
