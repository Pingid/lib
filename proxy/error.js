//#region lib/proxy/src/error.ts
/**
* A gateway-level failure — the upstream, not the app behind it, is what went wrong.
*
* Carrying the status on the error is what lets a policy step refuse a request
* (`readOnly()` throws a 405) and have the handler turn that into a real
* response, rather than an unhandled rejection the caller has to decode.
*/
var ProxyError = class extends Error {
	name = "ProxyError";
	status;
	constructor(status, message, options) {
		super(message, options);
		this.status = status;
	}
	/** The plain response to hand back to the client. */
	get response() {
		return new Response(this.message, {
			status: this.status,
			headers: { "content-type": "text/plain; charset=utf-8" }
		});
	}
};
//#endregion
export { ProxyError };

//# sourceMappingURL=error.js.map