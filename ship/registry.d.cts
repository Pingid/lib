import { Definitions, Item, ResourceType, StackRef, Resource } from './resource.cjs';
import { ComposeSpecification } from './types.cjs';
import { Scope } from './scope.cjs';
/** A compose file. `name` is the project name, which the generated types predate. */
export type Spec = ComposeSpecification & {
    name?: string;
};
/**
 * Collects resources for a single compose file.
 *
 * Registration is idempotent and keyed on resource identity, so a resource pulled in by
 * three different services is built once. Two distinct resources claiming the same
 * `type.name` is an error rather than a silent overwrite.
 */
export declare class Registry {
    /** Names of other stacks this one referenced via `ref()`. */
    readonly dependsOn: Set<string>;
    /** The stack this registry is building, when there is one. Lets `ref()` spot a self-reference. */
    self: StackRef | undefined;
    private readonly scope;
    private readonly entries;
    private readonly owners;
    constructor(scope: Scope);
    /** Register every item, context values first so `use()` never depends on argument order. */
    registerAll(items: readonly Item[]): void;
    register(item: Item): unknown;
    private claim;
    private readonly use;
    private readonly ref;
    /**
     * Drain every registered resource.
     *
     * Bodies may be async and may register further resources after awaiting, so this keeps
     * draining until no new entries appear.
     */
    resolve(): Promise<Spec>;
}
type Group<U, T extends ResourceType> = {
    [K in Extract<U, Resource<T, any, any, any>> as K extends Resource<T, infer N extends string, any, any> ? N : never]: K extends Resource<T, any, any, infer S> ? (undefined extends S ? Definitions[T] : S) : never;
};
/**
 * The compose file a set of items produces.
 *
 * Only resources passed to `compose()` appear here. Resources pulled in transitively through
 * `use()` are present at runtime but not in the type — declare them if you want them typed.
 */
export type Composed<R extends readonly Item[]> = {
    [T in ResourceType as [Extract<R[number], Resource<T, any, any, any>>] extends [never] ? never : `${T}s`]: Group<R[number], T>;
};
/** Build a single compose file. Registration errors surface as a rejection, not a sync throw. */
export declare const compose: <R extends readonly Item[]>(...items: R) => Promise<Composed<R>>;
export {};
