import "./types.js";
import { contextFactory } from "./context/index.js";
import { inject, once, open, override, resolver, scope, slot } from "./inject.js";
//#region lib/api/src/http/route/index.ts
/**
* A route's contract without its handler, for sharing between server, client and docs.
* `params` is required, and checked against the path, whenever the path has `:params`.
*
* @example
* const getItem = Spec('/items/:id', {
*   method: 'GET',
*   params: Type.Object({ id: Type.String() }),
*   response: { 200: { 'application/json': Item }, 404: { 'text/plain': Type.String() } },
* })
* const GetItem = Route(getItem, (c) => c.json(items.get(c.params.path.id)))
*/
var Spec = (path, params) => ({
	path,
	...params
});
/**
* A route: a spec plus its handler, with a `fetch` that validates and answers on its own.
*
* @example
* const Update = Route('/apps/:slug', {
*   method: 'PUT',
*   params: Type.Object({ slug: Type.String() }),
*   body: App,
*   response: Type.Object({ id: Type.String() }),
*   inject: { user, apps },
*   handle: async (c, { user, apps }) => c.json(await apps.put(c.params.path.slug, user)),
* })
*/
var Route = (schema, handler) => {
	if (typeof schema !== "string") return make(schema, handler);
	const { handle, inject, ...spec } = handler;
	return make({
		...spec,
		path: schema
	}, inject ? bind(inject, handle) : handle, inject);
};
var make = (spec, handler, inject) => {
	const rt = {
		spec,
		handler,
		...inject && { inject }
	};
	rt.fetch = adapt(rt).fetch;
	return rt;
};
/**
* A handler that receives its injected values, as a handler that does not. The route's context type then
* only names what the host must supply, so adapters mount it unchanged.
*/
var bind = (inject, handle) => {
	const resolve = resolver(inject);
	return async (ctx, context) => handle(ctx, Object.assign({}, context, await resolve(ctx.request)));
};
/**
* Type a handler against a spec before it has a route, e.g. to define it in another file.
*
* @example
* const handleGetItem = Handler<typeof getItem>((c) => c.json(items.get(c.params.path.id)))
* const GetItem = Route(getItem, handleGetItem)
*/
var Handler = (handler) => handler;
/**
* Give a route its outside context, or custom extractors, and get back a route whose `fetch` needs nothing more.
*
* @example
* const Me = adapt(Route(meSpec, (c, cx: { user: string }) => c.json({ user: cx.user })), {
*   context: (req) => ({ user: req.headers.get('x-user')! }),
* })
* await Me.fetch(new Request('http://localhost/me'))
*/
var adapt = (rt, e = {}) => ({
	...rt,
	fetch: adapter(e)(rt)
});
var adapter = (e) => {
	const ctx = contextFactory(e);
	return (rt) => {
		const c = ctx(rt.spec);
		return (req) => c(req).then(([ctx, context]) => rt.handler(ctx, context), (e) => e instanceof Response ? e : Promise.reject(e));
	};
};
/**
* Prepend `prefix` to every spec's path, keeping the literal path types.
*
* @example
* const [list, get] = PrefixSpecs('/v1', listItems, getItem) // paths '/v1/items', '/v1/items/:id'
*/
var PrefixSpecs = (prefix, ...routes) => routes.map((r) => ({
	...r,
	path: prefix + r.path
}));
/**
* Prepend `prefix` to every route's path. Inside a `Router`, prefer its `prefix` option.
*
* @example
* const v1 = Prefix('/v1', List, Update)
*/
var Prefix = (prefix, ...routes) => routes.map((r) => ({
	...r,
	schema: {
		...r.spec,
		path: prefix + r.spec.path
	}
}));
//#endregion
export { Handler, Prefix, PrefixSpecs, Route, Spec, adapt, adapter, bind, inject, once, open, override, resolver, scope, slot };

//# sourceMappingURL=index.js.map