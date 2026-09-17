import { OpenApiConfig } from './openapi/index.js';
import { ScalarConfig } from './scalar/index.js';
import * as Http from '../route/index.js';
export type { OpenApiConfig, NameContext } from './openapi/index.js';
export type { ScalarConfig } from './scalar/index.js';
/**
 * Build an OpenAPI 3.1 document from routes.
 *
 * Object bodies and responses are hoisted into `components.schemas` and deduplicated by structure.
 *
 * @example
 * OpenApi({ info: { title: 'Items', version: '1.0.0' }, routes: [getItem], models: { Item } })
 */
export declare const OpenApi: (config: OpenApiConfig) => import('openapi-typescript').OpenAPI3;
export interface ScalarDocsConfig extends OpenApiConfig {
    /** Page options. `url` defaults to the `json` route beside the page. */
    scalar?: ScalarConfig;
    /** Inline the document in the page rather than fetching it from the `json` route. */
    embed?: boolean;
}
/**
 * Serve a Scalar API reference at `prefix`, and its OpenAPI document at `${prefix}/json`.
 *
 * The docs routes stay out of the document. Mount `handler` directly, or `Page` and `Docs` through an adapter.
 *
 * @example
 * const docs = Scalar('/docs', { info: { title: 'Items', version: '1.0.0' }, routes: [getItem] })
 * Bun.serve({ routes: bunRoutes([docs.Page, docs.Docs]) })
 */
export declare const Scalar: <P extends string>(prefix: P, docs: ScalarDocsConfig) => {
    handler: (req: Request) => Promise<Response>;
    Page: Http.Route<{
        method: "GET";
        path: P;
        response: {
            200: {
                'text/html': import('@sinclair/typebox').TString;
            };
        };
    }, {}, Request>;
    Docs: Http.Route<{
        method: "GET";
        path: string;
        response: {
            200: {
                'application/json': import('@sinclair/typebox').TObject<{}>;
            };
        };
    }, {}, Request>;
    document: import('openapi-typescript').OpenAPI3;
};
