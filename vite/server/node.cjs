Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let node_stream_promises = require("node:stream/promises");
let node_stream = require("node:stream");
//#region lib/vite/src/server/node.ts
/**
* Node request → WHATWG `Request`.
*
* Vite ships nothing for this — the only `new Request(` in its dist is inside a
* bundled proxy dependency — so the awkward parts are ours to get right.
*/
var toRequest = (req, options = {}) => {
	const url = `${scheme(req)}://${authority(req)}${options.url ?? req.url ?? "/"}`;
	const headers = new Headers();
	for (const [key, value] of Object.entries(req.headers)) {
		if (value === void 0 || key.startsWith(":")) continue;
		if (Array.isArray(value)) for (const v of value) headers.append(key, v);
		else headers.set(key, value);
	}
	const method = req.method ?? "GET";
	const bodied = method !== "GET" && method !== "HEAD";
	return new Request(url, {
		method,
		headers,
		signal: options.signal,
		body: bodied ? node_stream.Readable.toWeb(req) : void 0,
		duplex: "half"
	});
};
/** WHATWG `Response` → Node response. Resolves once the body is flushed. */
var sendResponse = async (res, response) => {
	const headers = {};
	response.headers.forEach((value, key) => {
		if (key !== "set-cookie") headers[key] = value;
	});
	const cookies = getSetCookie(response.headers);
	if (cookies.length) headers["set-cookie"] = cookies;
	res.writeHead(response.status, response.statusText || void 0, headers);
	if (!response.body) return void res.end();
	await (0, node_stream_promises.pipeline)(node_stream.Readable.fromWeb(response.body), res);
};
/**
* Aborted when the client goes away before the response finished.
*
* Keyed on the *response* closing unfinished rather than the request stream,
* which also closes on a perfectly normal completed request.
*/
var disconnect = (res) => {
	const controller = new AbortController();
	res.once("close", () => {
		if (!res.writableFinished) controller.abort();
	});
	return controller.signal;
};
/** Mounts a fetch handler as Node middleware. */
var toNode = (fetch, options = {}) => (req, res, next) => {
	(async () => {
		await sendResponse(res, await fetch(toRequest(req, {
			url: options.url?.(req),
			signal: disconnect(res)
		})));
	})().catch((error) => {
		if (res.headersSent) res.destroy(error instanceof Error ? error : new Error(String(error)));
		else next(error);
	});
};
/** Honours `x-forwarded-proto` so a tunnelled dev server still builds https URLs. */
var scheme = (req) => {
	const forwarded = one(req.headers["x-forwarded-proto"]);
	if (forwarded) return forwarded.split(",")[0]?.trim() || "http";
	return req.socket.encrypted ? "https" : "http";
};
var authority = (req) => one(req.headers["host"]) ?? one(req.headers[":authority"]) ?? "localhost";
var one = (value) => Array.isArray(value) ? value[0] : value;
var getSetCookie = (headers) => {
	const get = headers.getSetCookie;
	if (typeof get === "function") return get.call(headers);
	const single = headers.get("set-cookie");
	return single ? [single] : [];
};
//#endregion
exports.disconnect = disconnect;
exports.sendResponse = sendResponse;
exports.toNode = toNode;
exports.toRequest = toRequest;

//# sourceMappingURL=node.cjs.map