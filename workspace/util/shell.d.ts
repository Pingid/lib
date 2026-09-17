type ShOptions = {
    cwd?: string;
};
type ShResult = {
    stdout: string;
    stderr: string;
    code: number;
};
export declare class Shell {
    static sho: (cmd: string, args: string[], options?: ShOptions) => Promise<string>;
    static sh: (cmd: string, args: string[], options?: ShOptions) => Promise<ShResult>;
}
export {};
