//#region lib/api/src/http/error.ts
/**
* A failure the request caused, rather than the handler.
*
* Deliberately parallel to `CliError`: carries enough for the adapter to render a response and
* nothing about how. Anything that is not one of these is a bug and propagates untouched, which
* is what lets each framework's own error handling stay in charge.
*/
var HttpError = class HttpError extends Error {
	status;
	body;
	constructor(message, options = {}) {
		super(message);
		this.name = "HttpError";
		this.status = options.status ?? 500;
		this.body = options.body ?? { error: message };
	}
	/**
	* Validation failure, as 422.
	*
	* 422 because that is what Elysia's own validation returns, and one status across the three
	* adapters keeps a framework detail out of the client's error handling. The issues are passed
	* through unreshaped — the same `Schema.Issue[]` the CLI renders as text.
	*/
	static fromIssues(issues) {
		return new HttpError("validation", {
			status: 422,
			body: {
				error: "validation",
				issues
			}
		});
	}
	static notFound(body) {
		return new HttpError("not found", {
			status: 404,
			body: body ?? { error: "not found" }
		});
	}
};
//#endregion
exports.HttpError = HttpError;

//# sourceMappingURL=error.cjs.map