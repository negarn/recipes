export const AUTH_CHANGED_EVENT = 'recipes:auth-changed';
export const AUTHENTICATED_STORAGE_KEY = 'recipes:authenticated';

export class ApiRequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export async function apiRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, credentials: 'same-origin', cache: 'no-store' });
  if (response.ok) return response;
  if (response.status === 401) window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  const body = await response.json().catch(() => ({})) as { error?: string };
  throw new ApiRequestError(response.status, body.error ?? 'Could not complete the request.');
}

export async function clearPrivateData() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('recipes:') || key.startsWith('recipes-') || key.startsWith('recipe-') || key.startsWith('navigation:')) localStorage.removeItem(key);
    }
  } catch { /* Storage may be unavailable in private browsing. */ }
  try {
    for (const name of await caches.keys()) {
      if (name.startsWith('recipes-')) await caches.delete(name);
    }
  } catch { /* The Cache API is unavailable in some browsers. */ }
}

export async function signOut() {
  await apiRequest('/api/logout', { method: 'POST' });
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
