import { validate } from '../route/context/extract.ts'
import * as Route from '../route/index.ts'

interface BunRequest extends Request {
  readonly params: Record<string, string>
}

export const bunRoutes = <const R extends Route.Route<any, any>[]>(
  routes: R,
): Route.Compute<BunRoutes<R[number]['spec']>> => {
  let r: any = {}
  for (const route of routes) {
    if (!route.spec.path) continue
    if (!r[route.spec.path]) r[route.spec.path] = {}
    if (!r[route.spec.path][route.spec.method]) r[route.spec.path][route.spec.method] = bunRoute(route)
  }
  return r
}

export type BunRoutes<R extends Route.RouteSpec> = {
  [K in R['path'] & string]: {
    [M in Extract<R, { path: K }>['method'] & string]: (req: BunRequest) => Promise<Response>
  }
}

export const bunRoute = <I extends Route.RouteSpec, C>(rt: Route.Route<I, C>) =>
  Route.adapt<BunRequest, any, I>(rt, { path: extractPath(rt) })

const extractPath = <I extends Route.RouteSpec>(rt: Route.Route<I>) => {
  const schema = rt.spec.params
  if (schema === undefined) return () => undefined
  return async (req: BunRequest) => validate(schema, req.params)
}
