import { allowLogin, checkPassword, expiredSessionCookie, isAuthenticated, sessionCookie } from './auth';
import { ApiError, exportBackup, mutatePreferences, readCatalog, readPreferences, saveRecipe } from './data';

export interface Env {
  DB: D1Database;
  AUTH_KEY: string;
  ASSETS: Fetcher;
}

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
};

function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(value, { status, headers: { ...securityHeaders, ...headers } });
}

async function readBody(request: Request, maxBytes: number) {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    throw new ApiError(415, 'Send JSON.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Missing request body.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new ApiError(413, 'Request is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new ApiError(400, 'Invalid JSON object.'); }
}

async function api(request: Request, env: Env) {
  if (!/^[a-f0-9]{64}$/.test(env.AUTH_KEY ?? '')) return json({ error: 'Login is not configured.' }, 503);
  const path = new URL(request.url).pathname;
  const method = request.method;
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) return json({ error: 'Method not allowed.' }, 405);
  if (method !== 'GET' && request.headers.get('Origin') !== new URL(request.url).origin) {
    return json({ error: 'Cross-origin request rejected.' }, 403);
  }
  if (path === '/api/login' && method === 'POST') {
    if (!await allowLogin(request, env.DB)) return json({ error: 'Too many attempts. Try again in five minutes.' }, 429, { 'Retry-After': '300' });
    const body = await readBody(request, 2048);
    if (typeof body.password !== 'string' || !await checkPassword(body.password, env.AUTH_KEY)) {
      return json({ error: 'Incorrect password.' }, 401);
    }
    return json({ authenticated: true }, 200, { 'Set-Cookie': await sessionCookie(env.AUTH_KEY) });
  }
  if (!await isAuthenticated(request, env.AUTH_KEY)) return json({ error: 'Sign in to continue.' }, 401);
  if (path === '/api/session' && method === 'GET') return json({ authenticated: true });
  if (path === '/api/logout' && method === 'POST') {
    return json({ authenticated: false }, 200, { 'Set-Cookie': expiredSessionCookie() });
  }
  if (path === '/api/backup' && method === 'GET') {
    return json(await exportBackup(env.DB), 200, {
      'Content-Disposition': `attachment; filename="recipes-${new Date().toISOString().slice(0, 10)}.json"`
    });
  }
  if (path === '/api/app-data' && method === 'GET') {
    const { data, revision } = await readPreferences(env.DB);
    return json({ ...data, revision });
  }
  if (path === '/api/recipe-catalog') {
    if (method === 'GET') return json(await readCatalog(env.DB));
    if (method === 'PUT') return json(await saveRecipe(request, env.DB, await readBody(request, 1_048_576)));
  }
  if (method === 'PUT' || method === 'DELETE') {
    return json(await mutatePreferences(request, env.DB, path, await readBody(request, 1_048_576)));
  }
  return json({ error: 'Not found.' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path !== '/api' && !path.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await api(request, env);
    } catch (error) {
      if (error instanceof ApiError) return json({ error: error.message }, error.status);
      console.error('Recipe API failed:', error instanceof Error ? error.message : 'Unknown error');
      return json({ error: 'Could not complete the request. Please try again.' }, 500);
    }
  }
} satisfies ExportedHandler<Env>;
