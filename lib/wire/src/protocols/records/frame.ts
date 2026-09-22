/*--------------------------------------------------------------------------

@pingid/lib-wire/protocols

The MIT License (MIT)

Copyright (c) 2026 Dan Beaven <dm.beaven@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/

// ------------------------------------------------------------------
// Key
// ------------------------------------------------------------------
/** A record address. id may be '*' for a whole collection. */
export type Key = readonly [collection: string, id: string]

// ------------------------------------------------------------------
// Frame
// ------------------------------------------------------------------
/** The wire. Interest reads watch; nothing else knows what a collection is. */
export type Frame = { t: 'hello' } | { t: 'watch'; k: [string, string]; on: boolean } | { t: 'patch'; c: string; id: string; d: unknown }

// ------------------------------------------------------------------
// Watch
// ------------------------------------------------------------------
/** Which record a patch was for — the one you asked about, or one in a collection you watch */
export interface Watch {
  readonly collection: string
  readonly id: string
}
