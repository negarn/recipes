import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyRecipeAppDataSnapshot } from './appData';
import { normalizeRecipes } from './customRecipes';
import { storybookRecipes } from '../stories/fakeRecipes';

const catalog = normalizeRecipes(storybookRecipes);
const { recipes: _recipes, ...preferences } = createEmptyRecipeAppDataSnapshot();
let storage: Map<string, string>;
let events: EventTarget;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  storage = new Map();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  };
  events = new EventTarget();
  vi.stubGlobal('window', Object.assign(events, { localStorage }));
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('API client and offline cache', () => {
  it('loads all preferences in one request and saves an offline snapshot', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...preferences, revision: 7 }));
    const { fetchRecipeAppDataSnapshot } = await import('./recipePreferences');
    expect(await fetchRecipeAppDataSnapshot()).toEqual(preferences);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/app-data');
    expect(JSON.parse(storage.get('recipes:last-good-app-data')!)).toEqual(preferences);
  });
  it('uses cached recipes and preferences when the network is unavailable', async () => {
    storage.set('recipes:last-good-catalog', JSON.stringify(catalog));
    storage.set('recipes:last-good-app-data', JSON.stringify({ ...preferences, recipeSettings: { defaultServingSize: 4 } }));
    fetchMock.mockRejectedValue(new TypeError('Offline'));
    const { fetchRecipeCatalog, fetchRecipeAppDataSnapshot } = await import('./recipePreferences');
    expect(await fetchRecipeCatalog({ onError: () => {} })).toEqual(catalog);
    expect((await fetchRecipeAppDataSnapshot({ onError: () => {} })).recipeSettings).toEqual({ defaultServingSize: 4 });
  });
  it('never reveals cached data after an online 401 and requests sign-out', async () => {
    storage.set('recipes:last-good-catalog', JSON.stringify(catalog));
    storage.set('recipes:last-good-app-data', JSON.stringify(preferences));
    fetchMock.mockImplementation(async () => Response.json({ error: 'Sign in to continue.' }, { status: 401 }));
    const expired = vi.fn();
    events.addEventListener('recipes:auth-changed', expired);
    const { fetchRecipeCatalog, fetchRecipeAppDataSnapshot } = await import('./recipePreferences');
    await expect(fetchRecipeCatalog()).rejects.toThrow('Sign in');
    await expect(fetchRecipeAppDataSnapshot()).rejects.toThrow('Sign in');
    expect(expired).toHaveBeenCalledTimes(2);
  });
  it('serializes mutations and supplies the latest preference revision', async () => {
    const calls: string[] = [];
    fetchMock.mockImplementation(async (_path: string, init: RequestInit) => {
      if (init.method === 'GET') return Response.json({ ...preferences, revision: 1 });
      calls.push(new Headers(init.headers).get('If-Match')!);
      return Response.json({ ...preferences, revision: calls.length + 1 });
    });
    const api = await import('./recipePreferences');
    await api.fetchRecipeAppDataSnapshot();
    await Promise.all([api.persistRecipeRating(catalog[0].id, 4), api.persistRecipeNote(catalog[0].id, 'Note')]);
    expect(calls).toEqual(['1', '2']);
  });
  it('keeps per-recipe revisions and uses zero only when creating a recipe', async () => {
    fetchMock.mockImplementation(async (_path: string, init: RequestInit) => Response.json({
      recipes: catalog, versions: { [catalog[0].id]: init.method === 'GET' ? 7 : 8 }
    }));
    const api = await import('./recipePreferences');
    await api.fetchRecipeCatalog();
    await api.persistRecipeCatalog(catalog[0]);
    await api.persistRecipeCatalog({ ...catalog[0], id: 'new-recipe' });
    const writes = fetchMock.mock.calls.filter(([, init]) => init.method === 'PUT');
    expect(writes.map(([, init]) => new Headers(init.headers).get('If-Match'))).toEqual(['7', '0']);
  });
});
