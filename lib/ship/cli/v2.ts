#!/usr/bin/env tsx

import { c, Cli } from '../../api/src/cli/index.ts'

import type { Spec } from '../src/index.ts'
import * as Config from './load.ts'

type Config = Record<string, Spec> | Spec

const build = c.cmd({
  name: 'build',
  description: 'Build compose files',
  options: {
    stacks: c.list(c.str(), { description: 'The stacks to generate a compose file for defaults to all' }),
    config: c.str({ description: 'The config file to use defaults to finding one' }),
  },
  positionals: ['stacks'],
  handle: async (args) => {
    const config = await Config.load(await Config.find(args.config))
    console.log(config)
    // for (const spec of Object.values(config.specs)) {
    //   console.log(spec)
    //   // const compose = await generateCompose(spec)
    //   // console.log(compose)
    // }
  },
})

Cli.run(build)
