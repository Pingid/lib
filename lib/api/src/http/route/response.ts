import { Schema } from '../../core/index.ts'
import type { ResponseProtocol, RouteSpecResponse } from './types.ts'

/** Normalise the three `response` shapes into `{ [status]: { [contentType]: schema | meta } }`. */
export const byStatus = (r: RouteSpecResponse): Record<string, ResponseProtocol | undefined> => {
  if (!r) return { 200: undefined }
  if (Schema.is(r)) return { 200: { 'application/json': r as any } }
  return Object.keys(r).every((k) => /^\d{3}$|^default$/.test(k)) ? (r as any) : { 200: r }
}
