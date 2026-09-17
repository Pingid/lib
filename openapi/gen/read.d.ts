import { DocOptions, Source } from './doc.js';
import { Api } from './model.js';
import * as oas from 'openapi-typescript';
export type ReadOptions = DocOptions & {
    /** Overrides for openapi-typescript's transform context, e.g. `{ immutable: true }`. */
    ts?: Partial<oas.GlobalContext>;
};
/** Loads a document and flattens it into the editable model. */
export declare const read: (source: Source, options?: ReadOptions) => Promise<Api>;
