import type { IncomingMessage } from 'node:http';

export function getRequestPath(request: IncomingMessage): string {
  return request.url?.split('?')[0] ?? '';
}
