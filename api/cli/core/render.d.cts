export declare namespace Render {
    /** Minimal sink. A `NodeJS.WriteStream` satisfies this, and so does `Render.Sink`. */
    interface Out {
        write(chunk: string): unknown;
        columns?: number | undefined;
    }
    type Target = Render | Out;
    /** A label and its optional description, aligned as a column pair. */
    type Row = readonly [left: string, right?: string | undefined];
}
/** In-memory sink, for tests and for buffering before a single flush. */
export declare class Sink implements Render.Out {
    value: string;
    columns?: number | undefined;
    constructor(columns?: number);
    write(chunk: string): void;
}
export declare class Render {
    _out: Render.Out;
    _indent: number;
    /** True when nothing has been written to the current line yet. */
    private _fresh;
    static from(target?: Render.Target): Render;
    static create(out?: Render.Out): Render;
    private constructor();
    get width(): number;
    /** Scoped indentation — the level is restored even if `body` throws. */
    indent(body: (render: this) => void, amount?: number): this;
    write(value: string): this;
    line(value?: string): this;
    blank(): this;
    /** Two columns: labels padded to a common width, descriptions wrapped under themselves. */
    rows(rows: readonly Render.Row[], gap?: number): this;
    /** A titled block of rows. Nothing is written when `rows` is empty. */
    section(title: string, rows: readonly Render.Row[], gap?: number): this;
}
