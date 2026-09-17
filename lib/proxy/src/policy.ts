import { RequestPolicy, ResponsePolicy } from './request.ts'
import { SetCookiePolicy } from './cookie.ts'
import { HeaderPolicy } from './header.ts'

/** Entry points for the policy builders, for callers who would rather not import four classes. */
export class Policy {
  static request() {
    return RequestPolicy.create()
  }
  static response() {
    return ResponsePolicy.create()
  }
  static header() {
    return HeaderPolicy.create()
  }
  static setCookie() {
    return SetCookiePolicy.create()
  }
}
