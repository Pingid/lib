/** Payload types by channel name */
export type Channels = Record<string, unknown>;
/** The wire. Interest reads want, Directory stamps pub. */
export type Frame = {
    t: 'hello';
} | {
    t: 'want';
    c: string;
    on: boolean;
} | {
    t: 'pub';
    c: string;
    d: unknown;
    from?: string;
    to?: string;
    r?: true;
};
/** What came with a payload */
export interface Message {
    readonly channel: string;
    readonly from: string | null;
    readonly retained: boolean;
}
