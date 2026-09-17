import { Binding } from './resource.js';
import { Compose } from './compose.js';
import { ComposeSpecification } from './types.js';
/** A compose file. `name` is the project name, which the generated types predate. */
export type Spec = ComposeSpecification & {
    name: string;
};
export interface Options {
    /** Values for the `Var`s the definitions read. */
    vars?: readonly Binding<any>[];
    build?: boolean;
}
/** Every stack's file, and the order to bring them up in. */
export interface Project {
    /** Stack names, dependencies first. */
    readonly order: string[];
    /** `[dependency, dependent]` pairs, one per stack a `Ref` reaches into. */
    readonly edges: Array<[string, string]>;
    readonly specs: Record<string, Spec>;
    /** Docker project name per stack — the stack name. */
    readonly projects: Record<string, string>;
}
/** One stack's compose file. */
export declare const Resolve: (stack: Compose, options?: Options) => Promise<Spec>;
/** Every stack's compose file, ordered so each comes up after the stacks it refs into. */
export declare const Project: (stacks: readonly Compose[], options?: Options) => Promise<Project>;
