import { RequestPolicy, ResponsePolicy } from './request.cjs';
import { SetCookiePolicy } from './cookie.cjs';
import { HeaderPolicy } from './header.cjs';
/** Entry points for the policy builders, for callers who would rather not import four classes. */
export declare class Policy {
    static request(): RequestPolicy;
    static response(): ResponsePolicy;
    static header(): HeaderPolicy;
    static setCookie(): SetCookiePolicy;
}
