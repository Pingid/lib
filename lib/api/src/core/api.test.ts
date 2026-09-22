import { it } from 'vitest'
import { z } from 'zod'

import * as Api from './api.ts'

it('should generate a method', () => {
  const schema = Api.method({
    name: 'test',
    in: z.object({ f: z.string() }),
    out: z.object({ f: z.string() }),
    handle: (input, _: { f: string }) => {
      return { f: input.f }
    },
  })
  void schema
})
