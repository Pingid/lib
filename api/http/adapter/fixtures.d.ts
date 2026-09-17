import * as Route from '../route/index.js';
export declare const Item: import('@sinclair/typebox').TObject<{
    id: import('@sinclair/typebox').TString;
    name: import('@sinclair/typebox').TString;
    stars: import('@sinclair/typebox').TInteger;
}>;
export declare const getItem: Route.Route<{
    readonly path: "/items/:id";
    readonly method: "GET";
    readonly params: import('@sinclair/typebox').TObject<{
        id: import('@sinclair/typebox').TString;
    }>;
    readonly query: import('@sinclair/typebox').TObject<{
        bonus: import('@sinclair/typebox').TOptional<import('@sinclair/typebox').TInteger>;
    }>;
    readonly response: {
        readonly 200: {
            readonly 'application/json': import('@sinclair/typebox').TObject<{
                id: import('@sinclair/typebox').TString;
                name: import('@sinclair/typebox').TString;
                stars: import('@sinclair/typebox').TInteger;
            }>;
        };
        readonly 404: {
            readonly 'application/json': import('@sinclair/typebox').TObject<{
                error: import('@sinclair/typebox').TString;
            }>;
        };
    };
}, {}, Request>;
export declare const createItem: Route.Route<{
    path: "/items";
    method: "POST";
    params: undefined;
    query: undefined;
    body: import('@sinclair/typebox').TObject<{
        name: import('@sinclair/typebox').TString;
    }>;
    response: {
        readonly 201: {
            readonly 'application/json': import('@sinclair/typebox').TObject<{
                id: import('@sinclair/typebox').TString;
                name: import('@sinclair/typebox').TString;
                stars: import('@sinclair/typebox').TInteger;
            }>;
        };
    };
}, {}, Request>;
/** Needs `db` from the host framework's context. */
export declare const getStars: Route.Route<{
    path: "/stars";
    method: undefined;
    params: undefined;
    query: undefined;
    body: undefined;
    response: import('@sinclair/typebox').TObject<{
        stars: import('@sinclair/typebox').TInteger;
    }>;
}, {
    db: {
        stars: number;
    };
}, Request>;
export declare const getFile: Route.Route<{
    path: "/files/:id";
    method: undefined;
    params: undefined;
    query: undefined;
    body: undefined;
    response: {
        readonly 200: {
            readonly 'application/octet-stream': {};
        };
        readonly 404: {
            readonly 'application/json': import('@sinclair/typebox').TObject<{
                error: import('@sinclair/typebox').TString;
            }>;
        };
    };
}, {}, Request>;
export declare const uploadFile: Route.Route<{
    path: "/files";
    method: "POST";
    params: undefined;
    query: undefined;
    body: {
        'application/octet-stream': {};
    };
    response: {
        readonly 201: {
            readonly 'application/json': import('@sinclair/typebox').TObject<{
                size: import('@sinclair/typebox').TInteger;
            }>;
        };
    };
}, {}, Request>;
