import { execFileSync } from 'node:child_process'
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

import { Arg } from '../arg.ts'
import { Cli } from '../cli.ts'
import { Cmd } from '../cmd.ts'
import { Sink } from '../core/render.ts'
import { command, script, type Completion } from './index.ts'

const tree = (): Cmd.Node =>
  Cmd.build('app')
    .option(Arg.string('config', { alias: 'c', description: 'Config path', complete: 'file' }))
    .with(
      Cmd.build('build')
        .describe('Build the project')
        .arg(
          Arg.boolean('watch', { alias: 'w', description: "Rebuild on change (it's live)" }),
          Arg.enum(['dev', 'prod'] as const, 'env', { description: 'Target environment', default: 'dev' }),
          Arg.string('target', { positional: true }),
        ),
      Cmd.build('deployApi')
        .describe('Deploy the api')
        .arg(Arg.string('out', { complete: 'dir' }), Arg.array(Arg.string(), 'services', { positional: true })),
      Cmd.build('checkout').arg(Arg.string('branch', { complete: () => ['main', 'next'] })),
      Cmd.build('run').arg(Arg.array(Arg.string(), 'args', { positional: true })),
    )

const dir = mkdtempSync(join(tmpdir(), 'completion-'))
mkdirSync(join(dir, 'sub1'), { recursive: true })
mkdirSync(join(dir, 'sub2'), { recursive: true })

const write = (shell: Completion.Shell, options: Completion.Options = {}): string => {
  const path = join(dir, `app.${shell}`)
  writeFileSync(path, script(shell, tree(), { version: true, static: true, ...options }))
  return path
}

/** A fake binary speaking the wire format, so the driver is what the test exercises. */
const stub = (payload: string, name = 'stub'): string => {
  const path = join(dir, name)
  writeFileSync(path, `#!/bin/sh\nprintf '%s' "$*" > "${join(dir, `${name}.argv`)}"\ncat <<'EOF'\n${payload}\nEOF\n`)
  chmodSync(path, 0o755)
  return path
}

const argv = (name = 'stub'): string => readFileSync(join(dir, `${name}.argv`), 'utf8')

const has = (shell: string): boolean => {
  try {
    execFileSync('which', [shell], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const run = (shell: string, args: string[]): string =>
  execFileSync(shell, args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

describe('script', () => {
  test('interpolates the binary name into a valid shell identifier', () => {
    const text = script('bash', tree(), { name: 'my-app' })

    expect(text).toContain('_my_app_table()')
    expect(text).toContain(`complete -o default -F _my_app 'my-app'`)
    expect(text).not.toContain('my-app_table')
  })

  // `${COMP_WORDS[i]}` is real shell, so only a TS binding name signals a leaked literal.
  test('leaves no unexpanded template placeholder', () => {
    for (const shell of ['bash', 'zsh', 'fish'] as const) {
      const text = script(shell, tree(), { invoke: 'app' })
      expect(text).not.toMatch(
        /\$\{(fn|name|entry|spec|keys|list|values|invoke|track|escape|redo|branch|call|body|pairs)\}/,
      )
    }
  })

  test('only zsh carries the compdef header', () => {
    expect(script('zsh', tree(), { name: 'app' })).toMatch(/^#compdef app\n/)
    expect(script('bash', tree())).not.toContain('#compdef')
  })
})

describe.each(['bash', 'zsh', 'fish'] as const)('%s', (shell) => {
  const check = { bash: ['-n'], zsh: ['-n'], fish: ['--no-execute'] }[shell]

  test.runIf(has(shell))('parses, static and dynamic', () => {
    expect(() => run(shell, [...check, write(shell)])).not.toThrow()
    expect(() => run(shell, [...check, write(shell, { static: false, invoke: 'app x' })])).not.toThrow()
  })

  test('a static script never calls back', () => {
    expect(script(shell, tree(), { static: true })).not.toContain('__complete')
  })
})

// bash is the only driver with non-obvious logic of its own — the COMP_WORDBREAKS rejoin.
describe.runIf(has('bash'))('bash', () => {
  const complete = (words: string[]): string[] => {
    const harness = join(dir, 'harness.bash')
    const args = words.map((word) => `'${word.replace(/'/g, `'\\''`)}'`).join(' ')

    writeFileSync(
      harness,
      [
        `source ${write('bash')}`,
        `COMP_WORDS=(${args})`,
        `COMP_CWORD=${words.length - 1}`,
        `COMPREPLY=()`,
        `_app`,
        `printf '%s\\n' "\${COMPREPLY[@]}"`,
      ].join('\n'),
    )

    return run('bash', [harness]).split('\n').filter(Boolean)
  }

  test('offers subcommands at the root', () => {
    expect(complete(['app', ''])).toEqual(['build', 'deploy-api', 'checkout', 'run'])
  })

  test('filters by the partial word', () => {
    expect(complete(['app', 'b'])).toEqual(['build'])
  })

  test("offers a command's own and inherited flags", () => {
    expect(complete(['app', 'build', '-'])).toEqual(['--watch', '-w', '--env', '--config', '-c', '--help', '-h'])
  })

  test("offers a flag's declared choices", () => {
    expect(complete(['app', 'build', '--env', ''])).toEqual(['dev', 'prod'])
    expect(complete(['app', 'build', '--env', 'd'])).toEqual(['dev'])
  })

  test('a boolean consumes no token, so the next word is still positional', () => {
    expect(complete(['app', 'build', '-w', ''])).toEqual([])
  })

  test('a value-taking global before a subcommand does not derail the walk', () => {
    expect(complete(['app', '--config', 'x', ''])).toEqual(['build', 'deploy-api', 'checkout', 'run'])
  })

  test(`'dir' completes directories`, () => {
    expect(complete(['app', 'deploy-api', '--out', ''])).toEqual(['sub1', 'sub2'])
  })

  test('drops subcommands once a positional has been taken', () => {
    expect(complete(['app', 'nosuch', ''])).toEqual([])
  })

  // bash shatters `--env=d` on COMP_WORDBREAKS; stage 1 hands it to `-o default`.
  test('leaves --flag=value to the filename fallback', () => {
    expect(complete(['app', 'build', '--env', '=', 'd'])).toEqual([])
  })
})

describe.runIf(has('fish'))('fish', () => {
  const complete = (line: string): string[] =>
    run('fish', ['--no-config', '-c', `source ${write('fish')}; complete -C '${line}'`])
      .split('\n')
      .filter(Boolean)

  test('offers subcommands with descriptions', () => {
    // fish sorts its own candidates, so only membership is meaningful here.
    expect(complete('app ')).toContain('build\tBuild the project')
    expect(complete('app ')).toContain('deploy-api\tDeploy the api')
  })

  test("offers a flag's declared choices", () => {
    expect(complete('app build --env ')).toEqual(['dev', 'prod'])
  })

  test(`'dir' completes directories`, () => {
    expect(complete('app deploy-api --out ').map((line) => line.split('\t')[0])).toEqual(['sub1/', 'sub2/'])
  })

  // fish is registered `-f`, so the fallback has to be explicit to match `-o default`.
  test('falls back to paths where nothing is declared', () => {
    expect(complete('app build ').map((line) => line.split('\t')[0])).toContain('sub1/')
    expect(
      complete('app ')
        .map((line) => line.split('\t')[0])
        .sort(),
    ).toEqual(['build', 'checkout', 'deploy-api', 'run'])
  })
})

// The driver is what is under test here, so the callback is a stub rather than the real
// CLI: hanging these on a runtime's resolution would make them flaky for unrelated reasons.
// Payloads carry the cursor word as a prefix, because that is what the resolver emits and
// what every shell filters against.
describe.runIf(has('bash'))('bash callback', () => {
  const wire = (...lines: string[]): string => [...lines, ':none'].join('\n')

  const complete = (cw: string[], body: string): string[] => {
    const harness = join(dir, 'callback.bash')
    const quoted = cw.map((word) => `'${word.replace(/'/g, `'\\''`)}'`).join(' ')
    const path = write('bash', { static: false, invoke: [stub(body)] })

    writeFileSync(
      harness,
      [
        `source ${path}`,
        `COMP_WORDS=(${quoted})`,
        `COMP_CWORD=${cw.length - 1}`,
        `COMPREPLY=()`,
        `_app`,
        `printf '%s\\n' "\${COMPREPLY[@]}"`,
      ].join('\n'),
    )

    return run('bash', [harness]).split('\n').filter(Boolean)
  }

  test('rejoins a `=`-shattered word and hands the whole line to the callback', () => {
    expect(complete(['app', 'build', '--env', '=', 'x'], wire('--env=xa', '--env=xb'))).toEqual([
      '--env=xa',
      '--env=xb',
    ])
    expect(argv()).toBe('__complete -- build --env=x')
  })

  test('a dynamic spec escapes even though the word shape is ordinary', () => {
    expect(complete(['app', 'checkout', '--branch', ''], wire('main', 'next'))).toEqual(['main', 'next'])
    expect(argv()).toBe('__complete -- checkout --branch ')
  })

  test('escapes on a short cluster, after a terminator, and on a negation', () => {
    expect(complete(['app', '-abc'], wire('-abcx'))).toEqual(['-abcx'])
    expect(complete(['app', '--', 'x'], wire('xy'))).toEqual(['xy'])
    expect(complete(['app', '--no'], wire('--no-force'))).toEqual(['--no-force'])
  })

  test('drops descriptions and values it cannot carry', () => {
    // bash inserts COMPREPLY literally, and `compgen -W` word-splits on whitespace.
    expect(complete(['app', 'checkout', '--branch', ''], wire('alpha\tfirst', 'has space', 'beta'))).toEqual([
      'alpha',
      'beta',
    ])
  })

  test('honours a :dir directive over the values', () => {
    expect(complete(['app', 'checkout', '--branch', ''], 'ignored\n:dir')).toEqual(['sub1', 'sub2'])
  })

  test('survives an empty payload, a missing trailer, and a callback that fails', () => {
    expect(complete(['app', 'checkout', '--branch', ''], ':none')).toEqual([])
    expect(complete(['app', 'checkout', '--branch', ''], '')).toEqual([])
    expect(complete(['app', 'checkout', '--branch', ''], 'main')).toEqual(['main'])
  })

  test('the static path never reaches the callback', () => {
    expect(complete(['app', ''], wire('nonsense'))).toEqual(['build', 'deploy-api', 'checkout', 'run'])
  })
})

describe.runIf(has('fish'))('fish callback', () => {
  const complete = (line: string, body: string): string[] => {
    const path = write('fish', { static: false, invoke: [stub(body, 'fstub')] })
    return run('fish', ['--no-config', '-c', `source ${path}; complete -C '${line}'`])
      .split('\n')
      .filter(Boolean)
  }

  test('passes descriptions through, which bash cannot', () => {
    expect(complete('app checkout --branch ', 'main\ttrunk\nnext\n:none')).toEqual(['main\ttrunk', 'next'])
  })

  test('escapes on a short cluster', () => {
    expect(complete('app -abc', '-abcx\n:none')).toEqual(['-abcx'])
    expect(argv('fstub')).toBe('__complete -- -abc')
  })
})

describe('command', () => {
  const cli = (): [Cli, Sink] => {
    const out = new Sink()
    return [Cli.for(tree(), { out, binary: 'app' }).with(command()), out]
  }

  test('prints the script for the shell it was asked for', async () => {
    const [app, out] = cli()

    expect(await app.run(['completion', 'zsh'])).toBe(0)
    expect(out.value).toMatch(/^#compdef app\n/)
  })

  test('registers against the renamed binary, not the root command', async () => {
    const out = new Sink()
    const app = Cli.for(tree(), { out, binary: 'ws' }).with(command())

    await app.run(['completion', 'bash'])
    expect(out.value).toContain(`complete -o default -F _ws 'ws'`)
  })

  test('--name overrides the binary the script registers against', async () => {
    const [app, out] = cli()

    await app.run(['completion', 'bash', '--name', 'other'])
    expect(out.value).toContain(`complete -o default -F _other 'other'`)
  })

  test('rejects a shell it cannot generate', async () => {
    const out = new Sink()
    const err = new Sink()
    const app = Cli.for(tree(), { out, err, binary: 'app' }).with(command())

    expect(await app.run(['completion', 'nushell'])).toBeGreaterThan(0)
    expect(err.value).toContain('nushell')
  })

  test('completes itself, since the shell arg is an enum', async () => {
    const [app] = cli()
    const entry = script('bash', app.root)

    expect(entry).toContain(`'completion|@0') spec='bash zsh fish'`)
  })
})
