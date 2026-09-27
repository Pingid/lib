import { c, Cli } from '../../api/src/cli/index.ts'
import fs from 'node:fs/promises'
import path from 'node:path'

import { Api, Doc, Op, Emit } from '../src/index.ts'

const cmd = c.cmd({
  name: 'openapi-ts-generate',
  description: 'Generate TypeScript types and request builders from an OpenAPI 3.x document',
  options: {
    input: c.str({
      description: 'The source OpenAPI 3.x document: a path, URL or inline JSON/YAML',
      alias: 'i',
      required: true,
    }),
    output: c.str({ description: 'The output file', alias: 'o', required: false }),
  },
  positionals: ['input', 'output'],
  handle: async (i) => {
    const api = await Doc.load(i.input)
    const gen = Op.pipe()
    const types = await gen(await Api.read(api))
    const result = Api.print(types, { emit: (a) => [...Emit.file(a), ...Emit.requests(a)] })
    if (!i.output) return console.log(result)
    await fs.mkdir(path.dirname(i.output), { recursive: true })
    await fs.writeFile(i.output, result)
  },
})

Cli.run(cmd, process.argv.slice(2))
