import { Config } from '@redocly/openapi-core';
import * as oas from 'openapi-typescript';
/** A document, the text of one, or somewhere to fetch one from. */
export type Source = string | URL | oas.OpenAPI3;
export type DocOptions = {
    /** Redocly config. Defaults to the `minimal` ruleset, matching openapi-typescript. */
    config?: Config;
    /** Base for relative locations. Defaults to `process.cwd()`. */
    cwd?: string;
    /** Swallows warnings. Errors always throw. */
    silent?: boolean;
};
/** The OpenAPI document itself: fetching it, validating it, and the context its transforms need. */
export declare const Doc: {
    /** The ruleset openapi-typescript runs with: enough to reject a broken document, not enough to be noisy. */
    config: () => Promise<Config>;
    /** Validates a document and bundles its external `$ref`s into `components`. */
    load: (source: Source, options?: DocOptions) => Promise<oas.OpenAPI3>;
    /**
     * The `GlobalContext` every openapi-typescript transform expects. Its own CLI builds
     * this inline; the flags below are that default set, all off bar the two named.
     */
    context: (doc: oas.OpenAPI3, redoc: Config, over?: Partial<oas.GlobalContext>) => oas.GlobalContext;
};
