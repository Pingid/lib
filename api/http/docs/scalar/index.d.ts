import { ApiReferenceConfiguration } from '@scalar/types';
import { InfoObject } from 'openapi-typescript';
export interface ScalarConfig extends Partial<ApiReferenceConfiguration> {
    css?: string;
    cdn?: string;
}
export declare const scalar: (info: InfoObject, config?: ScalarConfig) => string;
