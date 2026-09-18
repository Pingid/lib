import path from 'node:path'

import { op, ns, optional, string } from '@pingid/lib-api'
import { git, Shell } from '@pingid/lib-workspace'
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
  handle: async ({ branch = 'pkg' }) => {
    const repo = await git.Repo.discover()

    await using tree = await repo.worktree(branch, { path: root('.cache/.worktrees', branch) })

    await Shell.io`find ${tree.dir} -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +`
    await Shell.io`cp -R ${repo.dir}/pkg/ ${tree.dir}`

    await tree.add()

    // Skip when the staged tree matches the last build.
    if (!(await tree.staged())) return console.log('No changes; skipping build')

    const tags = await tree.tags('build-*')
    const last = tags.map((t) => parseInt(t.slice('build-'.length), 10)).filter(Number.isFinite)
    const tag = `build-${Math.max(0, ...last) + 1}`

    // The branch carries one flattened commit, so each build amends it rather than stacking.
    await tree.commit().amend().no_edit()
    await tree.tag(tag)
    await tree.push('origin', `HEAD:${branch}`).force()
    await tree.push('origin', tag)
  },
})

const api = ns({
  name: 'workspace',
  description: 'Workspace CLI',
  operations: [build, sync_branch],
})

run(api, process.argv.slice(2))
