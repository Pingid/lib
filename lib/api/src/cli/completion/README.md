# Shell completions

`app completion bash|zsh|fish` prints a script with the command tree baked in. Subcommands,
flags, aliases, descriptions and `enum` choices are answered from that table with no
subprocess. Anything the table cannot answer — a value computed at runtime, or a word shape
the driver cannot place — is handed back to the binary over a small protocol.

```ts
import { Cli, Completion } from '@pingid/lib-api/cli'

Cli.for(api, { binary: 'app', version: '1.0.0' })
  .with(Completion.command({ version: true }))
  .main()
```

`completion` is opt-in rather than auto-mounted: mounting a child makes
`cmd.commands.length > 0`, which would turn a single-command CLI's usage line into
`app <command>` and its `Unexpected argument` errors into `Unknown command`.

## Install

The script registers against a binary name, which is not always the root command's name.
Pass `--name` when they differ — this repo's own CLI is rooted at `workspace` but invoked
as `ws`:

```bash
ws completion zsh --name ws > "${fpath[1]}/_ws" && rm -f ~/.zcompdump
```

```bash
app completion bash > "$(brew --prefix)/etc/bash_completion.d/app"
```

```bash
app completion fish > ~/.config/fish/completions/app.fish
```

zsh needs `autoload -Uz compinit && compinit` already in `~/.zshrc`, and caches
aggressively — drop `~/.zcompdump` and restart after installing. bash sources everything in
`bash_completion.d` at startup, so `eval "$(app completion bash)"` in `~/.bashrc` works too.
fish autoloads lazily by filename and needs no rc change.

The baked table is a snapshot: regenerate after upgrading the CLI. Dynamic values are
unaffected, since they are computed on each keystroke.

## Declaring values

Subcommands, flags, aliases, descriptions and `enum` choices are picked up with no
annotation. Say where the rest come from with `complete`:

```ts
Arg.string('config', { complete: 'file' })
Arg.string('out', { complete: 'dir' })
Arg.string('env', { complete: ['dev', 'staging', 'prod'] })
Arg.string('branch', { complete: () => branches() })
```

A function is called when the shell asks, in the CLI's own process, and may be async. It is
told the partial word and the whole line, and may return descriptions:

```ts
Arg.string('pod', {
  complete: async ({ word, cmd }) => (await pods()).map((p) => ({ value: p.name, description: p.status })),
})
```

The context is deliberately small — `{ cmd, arg, word, words }`. It carries no sibling flag
values because the line is mid-edit and cannot be strictly parsed; promising them would be a
signature that could not be honoured. Members are only ever added, so a source written today
keeps compiling.

A source that throws, rejects, or returns a value containing a tab or newline degrades to
"offer nothing" rather than wedging the TAB key.

`Arg` is built to be declared once and reused across commands, so a source can also be
attached per command — and this is the only route for args that came from a schema, since
`.in()` and `c.cmd()` build their args from JSON Schema:

```ts
Cmd.build('deploy')
  .in(Input)
  .complete({ env: ['dev', 'prod'], config: 'file' })
```

An override on the declaring command wins, so a global option's source can be set once at
the root and applies to the whole subtree.

## The callback

Every `Cli` answers `app __complete -- <words...>` whether or not `completion` is mounted.
It is intercepted in `Cli.run` before routing, so it never enters the command tree and none
of the above regressions apply. Output is one candidate per line as `value<TAB>description`,
then a `:directive` trailer that is always present:

```
$ app __complete -- build --env ''
dev
prod
:none
```

Directives are `none`, `default` (offer nothing; let the shell complete filenames), `file`
and `dir`. It always exits 0 — a non-zero exit is indistinguishable from a missing binary
and would make drivers fall back for the wrong reason.

The driver escapes to it when the baked table cannot answer correctly:

- the arg declares a function
- a settled word was a short cluster of three or more characters (`-abc`, `-n5`), so the
  walk cannot know whether its last letter ate the following word
- a settled `--` terminator was seen
- the cursor word is dash-led and contains `=` (bash shatters these on `COMP_WORDBREAKS`)
- the cursor word is a short cluster, or starts with `--no`

It does **not** escape merely because the table produced nothing — that would spawn a
process on every unproductive TAB.

Values are prefixed by the callback, so a driver inserts them verbatim: completing
`--env=d` yields `--env=dev`, not `dev`. The exception is a path source behind a prefix,
where the callback emits `:default` and lets the shell complete the word — it knows the real
word boundary and we do not.

### Cost, and how to avoid it

One subprocess per escaping keystroke, which is the CLI's own start-up time. Measured here
at ~34ms for `test-app` under bun; node is nearer 100ms and `tsx` nearer 340ms. Nothing in
the framework can lower that, so keep handler imports lazy if TAB latency matters.

`--static` emits a script that never calls back, at the cost of the forms above:

```bash
app completion zsh --static
```

`--invoke` sets the command the script re-execs. It defaults to the registered binary name,
which is right whenever completion is installed for a real binary — and wrong in
development, where the entry point is not on `PATH`:

```bash
test-app completion bash --invoke "bun $PWD/lib/api/example/testing.ts"
```

The string is split on whitespace at generation time and each word is quoted into a shell
array, so there is no runtime word-splitting or globbing. A path containing spaces needs the
TS API, which takes `readonly string[]`.

## Limits

Short-cluster _continuation_ (`-w` → `-wv`, `-wc`) is not offered, and `--no-<bool>` is kept
out of the flag list until the word starts with `--no` — both would roughly double a list
for a form nobody tab-completes.

Values containing whitespace are dropped on the bash and zsh paths, which carry candidate
lists as space-separated words.

## Testing

`table.test.ts` covers the tree walk and `resolve.test.ts` the cursor placement, including a
fuzz pass asserting neither ever throws. `script.test.ts` syntax-checks all six scripts
(static and dynamic, three shells) with the real shells, drives the bash driver through
`COMP_WORDS`/`COMPREPLY`, and drives fish end to end via `complete -C`; both callback paths
run against a stub binary rather than the real CLI, so they cannot go flaky on a runtime's
resolution. `callback.test.ts` pins the wire format and runs the installed `test-app` over a
real process boundary when it is available.

zsh is covered by a syntax check only — a functional harness needs a synthetic `compinit`
and a stubbed `compadd`, which is more fixture than a 50-line driver is worth.

Two traps worth knowing, both already load-bearing in the emitters:

- bash 3.2 is the floor (macOS `/bin/bash`), so tables are `case` blocks rather than
  associative arrays, `compopt` and `__ltrim_colon_completions` are guarded, `mapfile` is
  avoided, and the callback is read through process substitution rather than a pipe, which
  would run the loop in a subshell.
- zsh ties `path` to `PATH`, so a `local path` in the driver silently blanks the PATH and the
  callback binary stops resolving. The zsh driver uses `at` instead.
