import { expect, test } from 'vitest'

import { Stack, Resource } from '../src/index.ts'
import type { Composed } from '../src/index.ts'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

const api = Resource.service('api').spec(() => ({ image: 'api:1', ports: ['3000:3000'] }))
const web = Resource.network('web').spec(() => ({ driver: 'bridge' }))
const bare = Resource.volume('data')

type Result = Composed<[typeof api, typeof web, typeof bare]>

// Groups exist only for the resource types actually present.
export type _Keys = Expect<Equal<keyof Result, 'services' | 'networks' | 'volumes'>>

// Resource keys are literal, so `spec.services.api` is checked rather than `any`.
export type _ServiceKeys = Expect<Equal<keyof Result['services'], 'api'>>
export type _NetworkKeys = Expect<Equal<keyof Result['networks'], 'web'>>

// The body's inferred shape survives to the output type.
export type _Image = Expect<Equal<Result['services']['api']['image'], string>>
export type _Driver = Expect<Equal<Result['networks']['web']['driver'], string>>

// A resource with no body falls back to the full compose definition for its type.
export type _Bare = Expect<Equal<Result['volumes']['data'], import('../src/types.d.ts').DefinitionsVolume>>

test('the inferred output type matches what compose actually returns', async () => {
  const spec = await Stack.compose(api, web, bare)

  expect(Object.keys(spec).sort()).toStrictEqual(['networks', 'services', 'volumes'])
  expect(spec.services.api.image).toBe('api:1')
  expect(spec.networks.web.driver).toBe('bridge')
  expect(spec.volumes.data).toStrictEqual({}) // a resource with no body emits an empty definition
})
