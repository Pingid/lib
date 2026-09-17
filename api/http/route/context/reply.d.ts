import { ReplyHandlers, ResponseTypes, RouteSpec } from '../types.js';
export declare const handlers: <I extends RouteSpec>(req: Request) => ReplyHandlers<ResponseTypes<I>>;
export declare const json: (data: any, res: ResponseInit) => Response;
export declare const text: (data: string | BodyInit, res: ResponseInit) => Response;
export declare const html: (data: string | BodyInit, res: ResponseInit) => Response;
export declare const sse: (req: Request, stream: AsyncIterable<unknown>, res: ResponseInit) => Response;
