import { RequestPolicy, ResponsePolicy } from './request.js';
import { SetCookiePolicy } from './cookie.js';
import { HeaderPolicy } from './header.js';
/** Entry points for the policy builders, for callers who would rather not import four classes. */
export declare class Policy {
    static request(): RequestPolicy;
    static response(): ResponsePolicy;
    static header(): HeaderPolicy;
    static setCookie(): SetCookiePolicy;
}
