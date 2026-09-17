import { default as ts } from 'typescript';
import { Shape } from './emit.cjs';
import { Api } from './model.cjs';
export type PrintOptions = Shape & {
    /** Text placed above the output. */
    banner?: string;
    /**
     * The whole file, for layouts `root` and `route` do not reach. It receives the model with
     * every name settled and every reference bound, so `Emit.*` and `Decl.ref` are interchangeable
     * with hand-built nodes here. Defaults to `Emit.file`.
     */
    emit?: (api: Api) => ts.Node[];
};
/** Renders the model as TypeScript source. */
export declare const print: (api: Api, options?: PrintOptions) => string;
/** Renders the model as AST, for callers splicing it into a larger file. */
export declare const nodes: (api: Api, options?: PrintOptions) => ts.Node[];
