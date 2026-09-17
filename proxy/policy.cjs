const require_cookie = require("./cookie.cjs");
const require_header = require("./header.cjs");
const require_request = require("./request.cjs");
//#region lib/proxy/src/policy.ts
/** Entry points for the policy builders, for callers who would rather not import four classes. */
var Policy = class {
	static request() {
		return require_request.RequestPolicy.create();
	}
	static response() {
		return require_request.ResponsePolicy.create();
	}
	static header() {
		return require_header.HeaderPolicy.create();
	}
	static setCookie() {
		return require_cookie.SetCookiePolicy.create();
	}
};
//#endregion
exports.Policy = Policy;

//# sourceMappingURL=policy.cjs.map