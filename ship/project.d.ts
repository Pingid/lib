import { Spec } from './registry.js';
import { ContextValue } from './context.js';
import { Stack } from './stack.js';
export type ProjectEntry = Stack<any> | ContextValue<any>;
export declare class Project {
    /** Stack names in dependency order — dependencies first. */
    readonly order: string[];
    /** `[dependency, dependent]` pairs discovered through `ref()`. */
    readonly edges: Array<[string, string]>;
    /** Generated compose file per stack name. */
    readonly specs: Record<string, Spec>;
    /** Docker project name per stack name. */
    readonly projects: Record<string, string>;
    private constructor();
    /**
     * Build every stack in a project.
     *
     * Top-level context values are visible to all stacks; a stack may also declare its own.
     * Cross-stack `ref()` calls are collected into a dependency order for the CLI to bring
     * stacks up in (and down in reverse).
     */
    static build(...entries: ProjectEntry[]): Promise<Project>;
}
