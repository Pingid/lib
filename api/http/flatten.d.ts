import { Route } from './route.js';
import { Struct } from './util.js';
/**
 * The flat input, rebuilt from parts a framework has already parsed and validated.
 *
 * The alternative is to re-read the `Request` with `assemble`, which would work but would
 * decode and validate everything twice — once in the framework because we handed it the
 * schemas, once here. Reading the parts back is what makes handing them over worth doing.
 */
export declare const flatten: (route: Route.Node, parts: Partial<Record<Route.Source, unknown>>, request?: Request) => Struct;
