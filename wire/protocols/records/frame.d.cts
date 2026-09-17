/** A record address. id may be '*' for a whole collection. */
export type Key = readonly [collection: string, id: string];
/** The wire. Interest reads watch; nothing else knows what a collection is. */
export type Frame = {
    t: 'hello';
} | {
    t: 'watch';
    k: [string, string];
    on: boolean;
} | {
    t: 'patch';
    c: string;
    id: string;
    d: unknown;
};
/** Which record a patch was for — the one you asked about, or one in a collection you watch */
export interface Watch {
    readonly collection: string;
    readonly id: string;
}
