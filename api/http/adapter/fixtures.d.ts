import * as Route from '../route/index.js';
export declare const Container: import('@sinclair/typebox').TObject<{
    id: import('@sinclair/typebox').TString;
    name: import('@sinclair/typebox').TString;
    stars: import('@sinclair/typebox').TInteger;
}>;
export declare const getContainer: Route.Route<{
    readonly path: "/containers/:id";
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
export declare const createContainer: Route.Route<{
    readonly path: "/containers";
    readonly method: "POST";
    readonly body: import('@sinclair/typebox').TObject<{
        name: import('@sinclair/typebox').TString;
    }>;
    readonly response: {
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
    response: import('@sinclair/typebox').TObject<{
        stars: import('@sinclair/typebox').TInteger;
    }>;
}, {
    db: {
        stars: number;
    };
}, Request>;
