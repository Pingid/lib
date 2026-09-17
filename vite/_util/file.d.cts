export declare class File {
    static project(meta: ImportMeta, pth: string): File;
    static for(...paths: string[]): File;
    private readonly _path;
    private constructor();
    get dir(): string;
    get path(): string;
    write(content: string): Promise<void>;
    toString(): string;
    [Symbol.toPrimitive](): string;
}
