import { Context, Resource, Stack } from '../src/index.ts'
// In a real project: import { Context, Resource, stack } from 'compose-dsl'

const Registry = Context.define<string>('registry')
const Tag = Context.define<string>('tag')

// ---------------------------------------------------------------------------
// platform — shared edge network and proxy, brought up first
// ---------------------------------------------------------------------------

// `.shared()` pins the docker object name so other stacks can reference it.
// Without it compose would name this network `platform_edge`.
const edge = Resource.network('edge')
  .spec(() => ({ driver: 'bridge' }))
  .shared()

const proxy = Resource.service('proxy')
  .out({ port: 80 })
  .spec((c) => ({
    image: 'traefik:v3.1',
    command: ['--providers.docker=true', '--entrypoints.web.address=:80'],
    ports: [`${c.out.port}:80`],
    volumes: ['/var/run/docker.sock:/var/run/docker.sock:ro'],
    networks: [c.use(edge).name],
  }))

export const platform = Stack.create('platform', [edge, proxy])

// ---------------------------------------------------------------------------
// app — joins the platform network by reference, owns its own data
// ---------------------------------------------------------------------------

const pgData = Resource.volume('pg-data').spec(() => ({ driver: 'local' }))

const dbPassword = Resource.secret('db-password').spec(() => ({ file: './secrets/db-password' }))

const db = Resource.service('db')
  .out({ port: 5432, user: 'app', database: 'app' })
  .spec((c) => ({
    image: 'postgres:16-alpine',
    environment: {
      POSTGRES_USER: c.out.user,
      POSTGRES_DB: c.out.database,
      POSTGRES_PASSWORD_FILE: `/run/secrets/${c.use(dbPassword).name}`,
    },
    secrets: [c.use(dbPassword).name],
    volumes: [`${c.use(pgData).name}:/var/lib/postgresql/data`],
    healthcheck: { test: ['CMD-SHELL', `pg_isready -U ${c.out.user}`], interval: '5s', retries: 10 },
  }))

const api = Resource.service('api')
  .out({ port: 3000 })
  .spec((c) => ({
    image: `${c.use(Registry)}/api:${c.use(Tag)}`,
    // `use(db)` returns db's out handle — `name` is its DNS name on the network.
    environment: {
      DATABASE_URL: `postgres://${c.use(db).user}@${c.use(db).name}:${c.use(db).port}/${c.use(db).database}`,
    },
    depends_on: { [c.use(db).name]: { condition: 'service_healthy' } },
    networks: [c.ref(platform, edge).name, 'default'],
    labels: [`traefik.http.services.api.loadbalancer.server.port=${c.out.port}`],
  }))

// An overlay rather than a fork: same definition, more replicas.
const apiScaled = api.patch((def) => ({ ...def, deploy: { replicas: 3 } }))

const worker = Resource.service('worker').spec((c) => ({
  image: `${c.use(Registry)}/worker:${c.use(Tag)}`,
  depends_on: [c.use(db).name],
}))

const production = process.env['NODE_ENV'] === 'production'

export const app = Stack.create('app', [production ? apiScaled : api, worker])

export default [
  Registry.create(process.env['REGISTRY'] ?? 'ghcr.io/acme'),
  Tag.create(process.env['TAG'] ?? 'latest'),
  platform,
  app,
]
