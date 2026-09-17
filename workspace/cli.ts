import path from 'node:path'

import { op, ns, optional, string } from '@pingid/lib-api'
import { git } from '@pingid/lib-workspace'
import { run } from '@pingid/lib-api/cli'

const root = (...parts: string[]) => path.join(import.meta.dirname, '../', ...parts)

const build = op({
  name: 'build',
  description: 'Build the source',
  handle: async () => {
    await Bun.$`vite build --config ${root('workspace/package/vite.config.ts')}`
  },
})

const sync_branch = op({
  name: 'sync-branch',
  description: 'Build source and commit flattened into a branch',
  in: {
    branch: optional(string()).describe('The branch to push the build to'),
  },
  handle: async () => {
    const repo = await git.Repo.discover()

    const tree = await git.WorkTree.create(repo, 'pkg', root('.cache/.worktrees/pkg'))

    try {
      await Bun.$.cwd(tree.path)`find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +`
      await Bun.$.cwd(root())`cp -R ./pkg/ ${tree.path}`
      await Bun.$.cwd(tree.path)`git add .`
      await Bun.$.cwd(tree.path)`git commit --amend --no-edit`
      await Bun.$.cwd(tree.path)`git push --force`
    } catch (e) {
      console.error(e)
    } finally {
      await tree.remove()
    }
  },
})

const api = ns({
  name: 'workspace',
  description: 'Workspace CLI',
  operations: [build, sync_branch],
})

run(api, process.argv.slice(2))
