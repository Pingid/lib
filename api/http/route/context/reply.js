//#region lib/api/src/http/route/context/reply.ts
var handlers = (req) => ({
	sse: (data, status) => sse(req, typeof data === "function" ? data() : data, statusInit(status)),
	json: (data, status) => json(data, statusInit(status)),
	text: (data, status) => text(data, statusInit(status)),
	html: (data, status) => html(data, statusInit(status))
});
var statusInit = (status = 200) => typeof status === "number" ? { status } : status;
var json = (data, res) => new Response(JSON.stringify(data), {
	...res,
	headers: {
		"Content-Type": "application/json",
		...res.headers
	}
});
var text = (data, res) => new Response(data, {
	...res,
	headers: {
		"Content-Type": "text/plain",
		...res.headers
	}
});
var html = (data, res) => new Response(data, {
	...res,
	headers: {
		"Content-Type": "text/html",
		...res.headers
	}
});
var sse = (req, stream, res) => new Response(sseBody(stream, req.signal), {
	...res,
	headers: {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
		...res.headers
	}
});
var sseBody = (inner, signal) => {
	const encoder = new TextEncoder();
	return new ReadableStream({
		async start(controller) {
			const send = (text) => controller.enqueue(encoder.encode(text));
			const onAbort = () => {
				try {
					controller.close();
				} catch {}
			};
			if (signal) {
				if (signal.aborted) {
					controller.close();
					return;
				}
				signal.addEventListener("abort", onAbort, { once: true });
			}
			try {
				send(": connected\n\n");
				for await (const chunk of inner) {
					if (signal?.aborted) break;
					send(`data: ${JSON.stringify(chunk)}\n\n`);
				}
				controller.close();
			} catch (error) {
				if (signal?.aborted) try {
					controller.close();
				} catch {}
				else controller.error(error);
			} finally {
				if (signal) signal.removeEventListener("abort", onAbort);
			}
		},
		async cancel() {
			if (typeof inner?.return === "function") await inner.return(void 0);
		}
	});
};
//#endregion
export { handlers, html, json, sse, text };

//# sourceMappingURL=reply.js.map