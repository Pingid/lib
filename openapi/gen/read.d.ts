import { default as ts } from 'typescript';
import { DocOptions, Source } from './doc.js';
import { Api } from './model.js';
import * as oas from 'openapi-typescript';
export type ReadOptions = DocOptions & {
    /** Overrides for openapi-typescript's transform context, e.g. `{ immutable: true }`. */
    ts?: Partial<oas.GlobalContext>;
    /**
     * The type bytes are read as: a `format: binary` string anywhere, and the body of a binary
     * content type such as `application/octet-stream` that gives no schema or a plain string one.
     * Defaults to `Blob`; `false` leaves them as openapi-typescript types them.
     */
    binary?: ts.TypeNode | false;
};
/** Loads a document and flattens it into the editable model. */
export declare const read: (source: Source, options?: ReadOptions) => Promise<Api>;
