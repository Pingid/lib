import { ApiReferenceConfigurationWithSource } from '@scalar/types';
import { InfoObject } from 'openapi-typescript';
export interface ScalarConfig extends Partial<ApiReferenceConfigurationWithSource> {
    /** Stylesheet layered over Scalar's theme. Defaults to a monotone theme; pass `''` to keep Scalar's own. */
    css?: string;
    /** URL of the Scalar standalone bundle, which registers `window.Scalar`. */
    cdn?: string;
}
/**
 * Render a Scalar API reference page.
 *
 * Point it at a document with `url`, or inline one with `content`. Functions in the config are dropped, since it
 * crosses into the page as JSON.
 *
 * @example
 * scalar({ title: 'Items', version: '1.0.0' }, { url: '/docs/json' })
 */
export declare const scalar: (info: Partial<InfoObject>, config?: ScalarConfig) => string;
