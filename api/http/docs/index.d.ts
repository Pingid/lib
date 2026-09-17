import { OpenApiConfig } from './openapi/index.js';
import { ScalarConfig } from './scalar/index.js';
import * as Http from '../route/index.js';
/**
 * Build an OpenAPI 3.1 document from routes.
 *
 * Object bodies and responses are hoisted into `components.schemas` and deduplicated by structure.
 *
 * @example
 * openapi({ info: { title: 'Items', version: '1.0.0' }, routes: [getItem], models: { Item } })
 */
export declare const OpenApi: (config: OpenApiConfig) => import('openapi-typescript').OpenAPI3;
export declare const Scalar: <P extends string>(prefix: P, docs: OpenApiConfig & {
    scalar?: ScalarConfig;
    embed?: boolean;
}) => {
    handler: (req: Request) => Promise<Response> | undefined;
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
};
