import { SetCookiePolicy } from "./cookie.js";
import { HeaderPolicy } from "./header.js";
import { RequestPolicy, ResponsePolicy } from "./request.js";
//#region lib/proxy/src/policy.ts
/** Entry points for the policy builders, for callers who would rather not import four classes. */
var Policy = class {
	static request() {
		return RequestPolicy.create();
	}
	static response() {
		return ResponsePolicy.create();
	}
	static header() {
		return HeaderPolicy.create();
	}
	static setCookie() {
		return SetCookiePolicy.create();
	}
};
//#endregion
export { Policy };

//# sourceMappingURL=policy.js.map