export type AuthEnv = { AUTH_KEY: string; DB: D1Database };

const encoder = new TextEncoder();
const COOKIE = 'recipes_session';
const SESSION_SECONDS = 30 * 24 * 60 * 60;

function hexBytes(hex: string) {
  return Uint8Array.from(hex.match(/.{2}/g) ?? [], (byte) => parseInt(byte, 16));
}

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function passwordHash(password: string) {
  // Passwords are generated from 192 random bits, not chosen by humans.
  return crypto.subtle.digest('SHA-256', encoder.encode('recipes-password:' + password));
}

async function signingKey(secret: string) {
  return crypto.subtle.importKey('raw', hexBytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function isAuthenticated(request: Request, secret: string) {
  const token = request.headers.get('Cookie')?.split(';').map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (!token) return false;
  const [expires, signature, extra] = token.split('.');
  const now = Math.floor(Date.now() / 1000);
  if (extra || !/^\d+$/.test(expires ?? '') || !/^[a-f0-9]{64}$/.test(signature ?? '')) return false;
  if (Number(expires) <= now || Number(expires) > now + SESSION_SECONDS) return false;
  return crypto.subtle.verify('HMAC', await signingKey(secret), hexBytes(signature), encoder.encode('recipes-session:' + expires));
}

export async function sessionCookie(secret: string) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode('recipes-session:' + expires));
  return `${COOKIE}=${expires}.${toHex(signature)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function expiredSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function checkPassword(password: string, secret: string) {
  return crypto.subtle.timingSafeEqual(await passwordHash(password), hexBytes(secret));
}

export async function allowLogin(request: Request, db: D1Database) {
  const now = Math.floor(Date.now() / 1000);
  const key = toHex(await crypto.subtle.digest('SHA-256', encoder.encode(request.headers.get('CF-Connecting-IP') ?? 'local')));
  // Atomic counters, shared across locations. Expired IP hashes are discarded.
  const results = await db.batch([
    db.prepare('DELETE FROM login_attempts WHERE expires <= ?').bind(now),
    db.prepare(`INSERT INTO login_attempts (key, expires, attempts) VALUES (?, ?, 1)
      ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`).bind(key, now + 300)
  ]);
  return Number((results[1].results[0] as { attempts: number }).attempts) <= 10;
}
