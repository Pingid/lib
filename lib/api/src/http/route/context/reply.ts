import type { BinaryBody, ReplyHandlers, ResponseTypes, RouteSpec, StatusResponseInit } from '../types.ts'

// ------------------------------------------------------------------
// Reply Handlers
// ------------------------------------------------------------------
export const handlers = <I extends RouteSpec>(req: Request): ReplyHandlers<ResponseTypes<I>> => ({
  sse: (data, status) => sse(req, typeof data === 'function' ? data() : data, statusInit(status as any)),
  json: (data: any, status: any) => json(data, statusInit(status as any)),
  text: (data: any, status: any) => text(data, statusInit(status as any)),
  html: (data: any, status: any) => html(data, statusInit(status as any)),
  binary: (data: any, status: any) => binary(data, statusInit(status as any)),
})

const statusInit = (status: number | StatusResponseInit<number> = 200): StatusResponseInit<number> =>
  typeof status === 'number' ? { status } : status

// ------------------------------------------------------------------
// Reply Functions
// ------------------------------------------------------------------
export const json = (data: any, res: ResponseInit) =>
  new Response(JSON.stringify(data), { ...res, headers: { 'Content-Type': 'application/json', ...res.headers } })

export const text = (data: string | BodyInit, res: ResponseInit) =>
  new Response(data, { ...res, headers: { 'Content-Type': 'text/plain', ...res.headers } })

export const html = (data: string | BodyInit, res: ResponseInit) =>
  new Response(data, { ...res, headers: { 'Content-Type': 'text/html', ...res.headers } })

export const binary = (data: BinaryBody, res: ResponseInit) =>
  new Response(data, { ...res, headers: { 'Content-Type': 'application/octet-stream', ...res.headers } })

export const sse = (req: Request, stream: AsyncIterable<unknown>, res: ResponseInit) =>
  new Response(sseBody(stream, req.signal), {
    ...res,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...res.headers,
    },
  })

// ------------------------------------------------------------------
// SSE Body
// ------------------------------------------------------------------
const sseBody = (inner: AsyncIterable<unknown>, signal?: AbortSignal) => {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text))

      const onAbort = () => {
        try {
          controller.close()
        } catch {}
      }

      if (signal) {
        if (signal.aborted) {
          controller.close()
          return
        }
        signal.addEventListener('abort', onAbort, { once: true })
      }

      try {
        send(': connected\n\n')

        for await (const chunk of inner) {
          if (signal?.aborted) break
          send(`data: ${JSON.stringify(chunk)}\n\n`)
        }

        controller.close()
      } catch (error) {
        if (signal?.aborted) {
          try {
            controller.close()
          } catch {}
        } else {
          controller.error(error)
        }
      } finally {
        if (signal) {
          signal.removeEventListener('abort', onAbort)
        }
      }
    },

    async cancel() {
      if (typeof (inner as AsyncGenerator)?.return === 'function') {
        await (inner as AsyncGenerator).return(undefined)
      }
    },
  })
}
