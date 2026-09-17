export declare const trimEnd: (p: string) => string;
export declare const underPrefix: (path: string, prefix: string) => boolean;
export type Pattern = string | RegExp;
export type PatternArg = Pattern | readonly Pattern[];
export declare function matchesAny(patterns: readonly Pattern[], value: string): boolean;
