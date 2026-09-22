export declare namespace Render {
  /** Minimal sink. A `NodeJS.WriteStream` satisfies this, and so does `Render.Sink`. */
  interface Out {
    write(chunk: string): unknown
    columns?: number | undefined
  }

  type Target = Render | Out

  /** A label and its optional description, aligned as a column pair. */
  type Row = readonly [left: string, right?: string | undefined]
}

/** In-memory sink, for tests and for buffering before a single flush. */
export class Sink implements Render.Out {
  value = ''
  columns?: number | undefined

  constructor(columns?: number) {
    this.columns = columns
  }

  write(chunk: string): void {
    this.value += chunk
  }
}

export class Render {
  _out: Render.Out
  _indent: number = 0

  /** True when nothing has been written to the current line yet. */
  private _fresh = true

  static from(target?: Render.Target): Render {
    return target instanceof Render ? target : new Render(target)
  }

  static create(out: Render.Out = process.stdout): Render {
    return new Render(out)
  }

  private constructor(out: Render.Out = process.stdout) {
    this._out = out
  }

  get width(): number {
    return this._out.columns ?? 80
  }

  /** Scoped indentation — the level is restored even if `body` throws. */
  indent(body: (render: this) => void, amount: number = 2): this {
    this._indent += amount
    try {
      body(this)
    } finally {
      this._indent -= amount
    }
    return this
  }

  write(value: string): this {
    const pad = ' '.repeat(this._indent)
    const parts = value.split('\n')

    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        this._out.write('\n')
        this._fresh = true
      }

      const part = parts[i]!
      if (part.length === 0) continue

      if (this._fresh) {
        this._out.write(pad)
        this._fresh = false
      }

      this._out.write(part)
    }

    return this
  }

  line(value: string = ''): this {
    return this.write(`${value}\n`)
  }

  blank(): this {
    return this.line()
  }

  /** Two columns: labels padded to a common width, descriptions wrapped under themselves. */
  rows(rows: readonly Render.Row[], gap: number = 2): this {
    const label = rows.reduce((max, [left]) => Math.max(max, left.length), 0)
    const width = Math.max(24, this.width - this._indent - label - gap)

    for (const [left, right] of rows) {
      if (!right) {
        this.line(left)
        continue
      }

      const lines = wrap(right, width)
      this.line(`${left.padEnd(label)}${' '.repeat(gap)}${lines[0]}`)
      for (const extra of lines.slice(1)) this.line(`${' '.repeat(label + gap)}${extra}`)
    }

    return this
  }

  /** A titled block of rows. Nothing is written when `rows` is empty. */
  section(title: string, rows: readonly Render.Row[], gap?: number): this {
    if (rows.length === 0) return this
    this.blank().line(title)
    return this.indent((render) => render.rows(rows, gap))
  }
}

const wrap = (value: string, width: number): string[] => {
  const words = value.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    if (line.length === 0) line = word
    else if (line.length + 1 + word.length <= width) line += ` ${word}`
    else {
      lines.push(line)
      line = word
    }
  }

  if (line.length > 0) lines.push(line)
  return lines.length > 0 ? lines : ['']
}
