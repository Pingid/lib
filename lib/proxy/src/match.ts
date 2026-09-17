/** Named segments captured by a pattern, e.g. `{ name: "web" }` for `/proxy/:name`. */
export type Params = Record<string, string>;

export type Match = {
  /** The portion of the pathname the pattern consumed, e.g. `/proxy/web`. */
  prefix: string;
  /** Everything after it, leading slash kept, e.g. `/assets/app.js`. Never empty. */
  path: string;
  params: Params;
};

/**
 * Match a pathname against a pattern of literal and `:named` segments.
 *
 * A pattern matches a *prefix* of the path — `/proxy/:name` matches
 * `/proxy/web/assets/app.js` and leaves `/assets/app.js` as {@link Match.path} —
 * which is what a mount point is. The tail is handed back verbatim, so a
 * trailing slash survives the round trip and an upstream that cares about one
 * still gets it.
 */
export const match = (pattern: string, pathname: string): Match | null => {
  const params: Params = {};
  let at = 0; // index of the "/" starting the next unconsumed segment

  for (const expected of pattern.split("/")) {
    if (!expected) continue;
    if (pathname[at] !== "/") return null;

    const next = pathname.indexOf("/", at + 1);
    const end = next === -1 ? pathname.length : next;
    const segment = pathname.slice(at + 1, end);

    if (expected[0] === ":") {
      if (!segment) return null;
      params[expected.slice(1)] = decode(segment);
    } else if (segment !== expected) return null;

    at = end;
  }

  return { prefix: pathname.slice(0, at), path: pathname.slice(at) || "/", params };
};

const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};
