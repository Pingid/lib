import { Route } from './route.js';
import { Struct } from './util.js';
/**
 * The flat input a handler receives, drawn from wherever the bindings say.
 *
 * Sources are disjoint by construction — the spec is checked for overlap — so there is no
 * precedence rule here. Nothing ever writes `undefined`: an absent value means the key is
 * *omitted*, so a schema's `required` fires and its `default` applies, both of which writing
 * `undefined` would defeat.
 */
export declare const assemble: (route: Route.Node, request: Request, matched?: Record<string, string>) => Promise<Struct>;
