import { type Source, Op, Ast, Decl, Route, Name, Api, Emit, Doc } from './src/gen/index.ts'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'

const gen = Op.pipe(
  Op.compact,
  Op.sort,
  Op.extract((type, at) => (at.in === 'reply' && at.reply.status === '200' ? Name.pascal(Route.name(at.route)) : null)),
  Op.declare((api) => ({
    id: '#/emit/Schemas',
    name: 'Schemas',
    kind: 'interface',
    type: Ast.obj(Decl.schemas(api).map((d) => ({ name: d.origin.name, type: Decl.ref(d), docs: d.docs }))),
  })),
  Op.declare((api) => ({
    id: '#/emit/Responses',
    name: 'Responses',
    kind: 'interface',
    type: Ast.obj(
      api.routes.map((d) => ({
        name: `${Name.pascal(Route.name(d))}`,
        type: Ast.union(
          d.replies.filter((r) => r.status === '200').map((r) => Decl.ref(`${Name.pascal(Route.name(d))}`)),
        ),
        docs: d.replies
          .filter((r) => r.status === '200')
          .map((r) => r.docs)
          .join('\n'),
      })),
    ),
  })),
  Op.collapse(),
)

export const openapi = (p: { source: Source; output: string }) => {
  let last: string | undefined
  const hash = crypto.createHash('sha256')
  let loading = false
  return async () => {
    if (loading) return
    loading = true
    try {
      const data = await Doc.load(p.source)
      const hashed = hash.update(JSON.stringify(data)).digest('hex')
      if (last === hashed) return
      last = hashed
      console.log(data, await Api.read(data))
      const x = await gen(await Api.read(data))
      await fs.writeFile(p.output, Api.print(x, { emit: (a) => [...Emit.file(a), ...Emit.requests(a)] }))
      console.log('updated', p.output)
    } catch (error) {
      console.error(error)
    } finally {
      loading = false
    }
  }
}
openapi({ source: 'http://localhost:3000/api/json', output: 'out.ts' })()
