/** The pieces of a remote: who owns it, what it is called, and where it lives. */
export type Origin = {
    owner: string;
    repo: string;
    origin: string;
};
/**
 * The token to authenticate with, from the environment or from a signed-in `gh`.
 * Throws rather than returning an empty string, since every caller needs a real one.
 */
export declare const discover_token: () => Promise<string>;
/**
 * Work out which repository `cwd` belongs to: what CI says, else the `origin` remote,
 * else whatever `gh` believes. Returns `undefined` when none of them can answer, leaving
 * the decision of how loudly to fail to the caller.
 */
export declare const discover_name: (cwd?: string) => Promise<Origin | undefined>;
/**
 * The URL to push to for `owner/repo`. Prefers the checkout's own `origin`, so a fork, a
 * mirror or an SSH remote is kept, and only falls back to the canonical URL when `origin`
 * points somewhere else entirely.
 */
export declare const origin_of: (owner: string, repo: string, cwd?: string) => Promise<string>;
/** The canonical URL for `owner/repo` on the configured server. */
export declare const default_origin: (owner: string, repo: string) => string;
/**
 * Parse anything that names a repository: `owner/repo`, `https://host/owner/repo.git`,
 * `git@host:owner/repo`, `ssh://git@host:2222/owner/repo.git`.
 *
 * The owner is the segment before the repository, so a nested group (`group/sub/repo`)
 * reports `sub` — which is what the GitHub-shaped APIs this is fed to expect.
 */
export declare const parse_origin: (url: string) => Origin | undefined;
