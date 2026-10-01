import { Config, Ship } from '../src/index.ts'

// Plain TypeScript does the work a YAML file needs anchors for; what varies per deploy is
// context, declared by the definitions that read it and supplied to `Ship.Resolve`.
type Release = { registry: string; tag: string }

const db = { user: 'app', database: 'app', port: 5432 }

const edge = Ship.Network('edge', () => ({ driver: 'bridge' }))
const pgData = Ship.Volume('pg-data', () => ({}))
const dbPassword = Ship.Secret('db-password', () => ({ file: './secrets/db-password' }))

const postgres = Ship.Service('db', () => ({
  image: 'postgres:16-alpine',
  environment: {
    POSTGRES_USER: db.user,
    POSTGRES_DB: db.database,
    POSTGRES_PASSWORD_FILE: `/run/secrets/${dbPassword.name}`,
  },
  secrets: [dbPassword.name],
  volumes: [`${pgData.name}:/var/lib/postgresql/data`],
  healthcheck: { test: ['CMD-SHELL', `pg_isready -U ${db.user}`], interval: '5s', retries: 10 },
}))

const proxy = Ship.Service('proxy', () => ({
  image: 'traefik:v3.1',
  command: ['--providers.docker=true', '--entrypoints.web.address=:80'],
  ports: ['80:80'],
  volumes: ['/var/run/docker.sock:/var/run/docker.sock:ro'],
  networks: [edge.name],
}))

const api = Ship.Service('api', (cx: Release, name) => ({
  image: `${cx.registry}/${name}:${cx.tag}`,
  environment: { DATABASE_URL: `postgres://${db.user}@${postgres.name}:${db.port}/${db.database}` },
  depends_on: { [postgres.name]: { condition: 'service_healthy' } },
  networks: [edge.name, 'default'],
  deploy: process.env['NODE_ENV'] === 'production' ? { replicas: 3 } : undefined,
}))

const worker = Ship.Service('worker', (cx: Release, name) => ({
  image: `${cx.registry}/${name}:${cx.tag}`,
  depends_on: [postgres.name],
}))

export const app = Ship.Compose('app', [edge, pgData, dbPassword, postgres, proxy, api, worker])

// `ship app up -d` resolves the stack on demand; relative paths resolve against this directory.
export default Config.define({
  stacks: {
    app: () =>
      Ship.Resolve(app, {
        registry: process.env['REGISTRY'] ?? 'ghcr.io/acme',
        tag: process.env['TAG'] ?? 'latest',
      }),
  },
})
