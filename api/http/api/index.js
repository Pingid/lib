import { validate } from "../route/context/extract.js";
import { open } from "../route/inject.js";
import { adapter } from "../route/index.js";
//#region lib/api/src/http/api/index.ts
/** Outermost first. */
var compose = (use, handler) => use.reduceRight((next, mw) => {
	const run = mw(next);
	return async (req) => run(req);
}, handler);
/** Continue only when `check` passes; otherwise answer with its `Response`, or 403. */
var guard = (check) => (next) => async (req) => {
	const ok = await check(req);
	if (ok === true) return next(req);
	return ok instanceof Response ? ok : new Response("Forbidden", { status: 403 });
};
/**
* @example
* const api = Router({
*   prefix: '/api',
*   use: [timing],
*   routes: [List, Router({ use: [guard(isSignedIn)], routes: [Create, Update] })],
* })
* Bun.serve({ fetch: api.fetch })
*/
var Router = (options) => {
	let compiled;
	const node = {
		options,
		fetch: (req) => (compiled ??= compile(node))(req)
	};
	return node;
};
/** The tree as one list, in declaration order. Adapters can mount this directly. */
var flatten = (node, parent = {
	path: "",
	use: [],
	override: []
}) => {
	const o = node.options;
	const scope = {
		path: join(parent.path, o.prefix ?? ""),
		use: o.use?.length ? [...parent.use, ...o.use] : parent.use,
		override: o.override?.length ? [...parent.override, ...o.override] : parent.override,
		context: o.context ?? parent.context
	};
	return o.routes.flatMap((r) => {
		if (isRouter(r)) return flatten(r, scope);
		if (r.spec.path === void 0) throw new Error("Router: a route needs a path to be mounted");
		return [{
			...scope,
			route: r,
			method: r.spec.method ?? "GET",
			path: join(scope.path, r.spec.path)
		}];
	});
};
var isRouter = (n) => "options" in n;
var NO_PARAMS = Object.freeze({});
var notFound = async () => new Response("Not Found", { status: 404 });
/**
* Static paths are one `Map` lookup. Dynamic paths are bucketed by their first segment when it is static,
* so `/apps/:slug` is only tried for `/apps/...`; those with a dynamic first segment are tried last.
*/
var compile = (root) => {
	const exact = /* @__PURE__ */ new Map();
	const buckets = /* @__PURE__ */ new Map();
	const patterns = /* @__PURE__ */ new Map();
	for (const e of flatten(root)) {
		const pattern = parse(e.path);
		let methods;
		if (!pattern) {
			methods = exact.get(e.path) ?? {};
			exact.set(e.path, methods);
		} else {
			let d = patterns.get(e.path);
			if (!d) {
				patterns.set(e.path, d = {
					...pattern,
					methods: {}
				});
				const key = bucketOf(e.path);
				buckets.set(key, [...buckets.get(key) ?? [], d]);
			}
			methods = d.methods;
		}
		if (methods[e.method]) throw new Error(`Router: ${e.method} ${e.path} is mounted twice`);
		methods[e.method] = dispatcher(e);
	}
	const fallback = root.options.notFound ?? notFound;
	const wildcard = buckets.get(":");
	return (req) => {
		const path = trimSlash(pathname(req.url));
		let methods = exact.get(path);
		let params = NO_PARAMS;
		if (!methods) {
			const hit = match(buckets.get(firstSegment(path)), path) ?? match(wildcard, path);
			if (!hit) return fallback(req);
			[methods, params] = hit;
		}
		const run = methods[req.method] ?? (req.method === "HEAD" ? methods["GET"] : void 0);
		if (run) return run(req, params);
		return Promise.resolve(new Response("Method Not Allowed", {
			status: 405,
			headers: { Allow: Object.keys(methods).join(", ") }
		}));
	};
};
/** Path params by request, for the route's `path` extractor. */
var matched = /* @__PURE__ */ new WeakMap();
var dispatcher = (e) => {
	const run = adapter({
		path: (req, schema) => {
			const p = matched.get(req) ?? NO_PARAMS;
			return schema ? validate(schema, p) : p;
		},
		...e.context && { context: e.context }
	})(e.route);
	const handle = compose(e.use, run);
	const overrides = e.override.length ? new Map(e.override) : void 0;
	return async (req, params) => {
		matched.set(req, params);
		if (overrides) open(req, overrides);
		try {
			return await handle(req);
		} catch (err) {
			if (err instanceof Response) return err;
			throw err;
		}
	};
};
var match = (list, path) => {
	if (list) for (const d of list) {
		const m = d.re.exec(path);
		if (!m) continue;
		const params = {};
		for (let i = 0; i < d.keys.length; i++) params[d.keys[i]] = decode(m[i + 1]);
		return [d.methods, params];
	}
};
/** `:name` captures a segment; `prefix...` matches the rest, as in the route extractor. */
var parse = (path) => {
	const keys = [];
	let dynamic = false;
	const source = path.split("/").map((part) => {
		if (part.startsWith(":")) {
			dynamic = true;
			keys.push(part.slice(1));
			return "([^/]+)";
		}
		if (part.endsWith("...")) {
			dynamic = true;
			return `${escape(part.slice(0, -3))}.*`;
		}
		return escape(part);
	}).join("/");
	return dynamic ? {
		re: new RegExp(`^${source}$`),
		keys
	} : void 0;
};
var bucketOf = (path) => {
	const first = firstSegment(path);
	return first.startsWith(":") || first.endsWith("...") ? ":" : first;
};
var firstSegment = (path) => {
	const end = path.indexOf("/", 1);
	return end < 0 ? path.slice(1) : path.slice(1, end);
};
/** The pathname of an absolute URL, without allocating a `URL`. */
var pathname = (url) => {
	const start = url.indexOf("/", url.indexOf("://") + 3);
	if (start < 0) return "/";
	const q = url.indexOf("?", start);
	const h = url.indexOf("#", start);
	const end = q < 0 ? h : h < 0 ? q : Math.min(q, h);
	return end < 0 ? url.slice(start) : url.slice(start, end);
};
var trimSlash = (p) => p.length > 1 && p.charCodeAt(p.length - 1) === 47 ? p.slice(0, -1) : p;
var join = (a, b) => trimSlash(`${a}/${b}`.replace(/\/{2,}/g, "/"));
var escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var decode = (s) => {
	try {
		return decodeURIComponent(s);
	} catch {
		return s;
	}
};
//#endregion
export { Router, compose, flatten, guard };

//# sourceMappingURL=index.js.map