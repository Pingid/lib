//#region lib/proxy/src/forward.ts
/**
* Did the *client's* leg use TLS? Drives cookie `Secure` and the `proto` the
* upstream is told about.
*
* `X-Forwarded-Proto` is believed only from a trusted peer, and the asymmetry is
* the reason. A forged "https" over a plain-http leg only makes us keep `Secure`
* on a cookie the browser then drops — self-inflicted, and it escalates nothing.
* A forged "http" over a real https leg makes us strip `Secure` from every
* cookie the upstream issues, and those then travel in the clear on the next
* plain request to the same host. That is why the header sits in
* `HEADER_TYPE.FORWARDING` and is stripped from anyone else on the way in.
*
* An explicit `context.clientTls` outranks both: a deployment that terminates
* TLS in a sidecar knows what happened on that leg better than any header does.
*/
function isSecure(request, context = {}) {
	if (typeof context.clientTls === "boolean") return context.clientTls;
	if (context.trustedPeer === true) {
		const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
		if (proto) return proto === "https";
	}
	return new URL(request.url).protocol === "https:";
}
/**
* The provenance this hop can honestly assert: what the client asked for, and
* where this proxy put the upstream.
*
* The host is the client's view of the proxy, so an upstream can rebuild a
* public URL from the `X-Forwarded-*` family alone — which is the alternative to
* having the proxy rewrite its output for it.
*/
function forwardedInfo(request, context, u) {
	const url = new URL(request.url);
	return {
		for: context.clientIp,
		host: url.host,
		proto: isSecure(request, context) ? "https" : "http",
		port: url.port || void 0,
		prefix: u.stripPrefix || void 0
	};
}
//#endregion
exports.forwardedInfo = forwardedInfo;
exports.isSecure = isSecure;

//# sourceMappingURL=forward.cjs.map