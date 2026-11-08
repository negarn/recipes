import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { storybookRecipes } from '../src/stories/fakeRecipes';
import { normalizeRecipe } from '../src/helpers/customRecipes';
import { createEmptyRecipeAppDataSnapshot } from '../src/helpers/appData';

const origin = 'https://recipes.test';
const password = 'test-only-generated-credential-192-bits';
const secret = createHash('sha256').update('recipes-password:' + password).digest('hex');
let mf: Miniflare;
let db: Awaited<ReturnType<Miniflare['getD1Database']>>;
let cookie: string;
const recipe = JSON.parse(JSON.stringify(normalizeRecipe(storybookRecipes[0])));

async function request(path: string, method = 'GET', body?: unknown, extra: Record<string, string> = {}) {
  return mf.dispatchFetch(origin + path, {
    method, headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', ...extra },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}
async function state() { return (await (await request('/api/app-data')).json()) as Record<string, any>; }
async function mutate(path: string, body: unknown, method = 'PUT', revision?: number) {
  return request(path, method, body, { 'If-Match': String(revision ?? (await state()).revision) });
}

beforeAll(async () => {
  mf = new Miniflare({
    modules: true, scriptPath: 'dist/_worker.js',
    compatibilityDate: '2026-07-30',
    bindings: { AUTH_KEY: secret }, d1Databases: ['DB']
  });
  db = await mf.getD1Database('DB');
  // D1 exec takes one statement per line.
  await db.exec(readFileSync('migrations/0001_initial.sql', 'utf8').replace(/\n/g, ' ').split(';').map((s) => s.trim()).filter(Boolean).join(';\n'));
  const response = await request('/api/login', 'POST', { password });
  cookie = response.headers.get('Set-Cookie')!.split(';')[0];
}, 30_000);

afterAll(async () => { await mf?.dispose(); });
beforeEach(async () => {
  const { recipes: _recipes, ...data } = createEmptyRecipeAppDataSnapshot();
  await db.batch([
    db.prepare('DELETE FROM recipes'),
    db.prepare('DELETE FROM login_attempts'),
    db.prepare('UPDATE app_state SET data = ?, revision = 1 WHERE id = 1').bind(JSON.stringify(data)),
    db.prepare('INSERT INTO recipes (id, position, data) VALUES (?, 0, ?)').bind(recipe.id, JSON.stringify(recipe))
  ]);
});

describe('password sessions', () => {
  it('fails closed with missing configuration and invalidates sessions after rotation', async () => {
    for (const authKey of ['', 'not-a-hash', 'a'.repeat(64)]) {
      const other = new Miniflare({
        modules: true, scriptPath: 'dist/_worker.js', compatibilityDate: '2026-07-30',
        bindings: { AUTH_KEY: authKey }, d1Databases: ['DB']
      });
      try {
        const response = await other.dispatchFetch(origin + '/api/session', { headers: { Cookie: cookie } });
        expect(response.status).toBe(authKey.length === 64 ? 401 : 503);
      } finally { await other.dispose(); }
    }
  });
  it('protects every private endpoint and ignores spoofed identity headers', async () => {
    for (const path of ['/api/app-data', '/api/recipe-catalog', '/api/backup', '/api/session']) {
      const response = await request(path, 'GET', undefined, { Cookie: '', 'Cf-Access-Authenticated-User-Email': 'owner@example.com' });
      expect(response.status).toBe(401);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
    expect((await request('/api/recipe-catalog', 'PUT', { recipe }, { Cookie: '' })).status).toBe(401);
  });
  it('accepts only the generated password and issues a private 30-day cookie', async () => {
    expect((await request('/api/login', 'POST', { password: 'wrong' })).status).toBe(401);
    const response = await request('/api/login', 'POST', { password });
    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly; Secure; SameSite=Strict; Max-Age=2592000');
    expect((await request('/api/session')).status).toBe(200);
  });
  it('rejects tampered, expired, and unsigned sessions', async () => {
    for (const value of [cookie + 'a', 'recipes_session=1.' + 'a'.repeat(64), 'recipes_session=9999999999.' + 'a'.repeat(64), 'recipes_session=invalid']) {
      expect((await request('/api/session', 'GET', undefined, { Cookie: value })).status).toBe(401);
    }
  });
  it('rejects cross-origin login, writes, and logout', async () => {
    for (const [path, method] of [['/api/login', 'POST'], ['/api/logout', 'POST'], ['/api/meal-plan/entries', 'PUT']]) {
      expect((await request(path, method, { password }, { Origin: 'https://evil.test' })).status).toBe(403);
    }
  });
  it('throttles login attempts and expires counters', async () => {
    for (let i = 0; i < 10; i++) expect((await request('/api/login', 'POST', { password: 'wrong' })).status).toBe(401);
    const limited = await request('/api/login', 'POST', { password });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('300');
    await db.prepare('UPDATE login_attempts SET expires = 0').run();
    expect((await request('/api/login', 'POST', { password })).status).toBe(200);
  });
  it('expires the cookie on logout', async () => {
    const response = await request('/api/logout', 'POST');
    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
  it('rejects malformed and oversized bodies', async () => {
    expect((await request('/api/login', 'POST', { password: 'x'.repeat(3000) })).status).toBe(413);
    expect((await request('/api/login', 'POST', { password }, { 'Content-Type': 'text/plain' })).status).toBe(415);
    const malformed = await mf.dispatchFetch(origin + '/api/login', {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{'
    });
    expect(malformed.status).toBe(400);
  });
});

describe('D1 persistence', () => {
  it('reads recipes and all preference fields', async () => {
    const catalog = await (await request('/api/recipe-catalog')).json() as any;
    expect(catalog.recipes).toEqual([recipe]);
    expect(catalog.versions[recipe.id]).toBe(1);
    expect((await state()).recipeSettings).toEqual({});
  });
  it('edits and creates recipes without losing existing ones or overwriting stale edits', async () => {
    const edited = { ...recipe, title: 'Edited recipe' };
    expect((await request('/api/recipe-catalog', 'PUT', { recipe: edited }, { 'If-Match': '1' })).status).toBe(200);
    expect((await request('/api/recipe-catalog', 'PUT', { recipe }, { 'If-Match': '1' })).status).toBe(409);
    const another = { ...recipe, id: 'another-recipe' };
    expect((await request('/api/recipe-catalog', 'PUT', { recipe: another }, { 'If-Match': '0' })).status).toBe(200);
    const catalog = await (await request('/api/recipe-catalog')).json() as any;
    expect(catalog.recipes.map((r: any) => r.title)).toEqual(['Edited recipe', recipe.title]);
    expect((await request('/api/recipe-catalog', 'PUT', { recipe: another }, { 'If-Match': '0' })).status).toBe(409);
  });
  it('persists notes, ratings, servings, settings and their removals', async () => {
    const base = '/api/recipes/' + recipe.id;
    expect((await mutate(base + '/note', { note: '  Keep this note.  ' })).status).toBe(200);
    expect((await mutate(base + '/rating', { rating: 4.5 })).status).toBe(200);
    expect((await mutate(base + '/servings', { servings: 3 })).status).toBe(200);
    expect((await mutate('/api/recipe-settings/default-serving-size', { defaultServingSize: 4 })).status).toBe(200);
    expect(await state()).toMatchObject({
      recipeNotes: { [recipe.id]: 'Keep this note.' }, recipeRatings: { [recipe.id]: 4.5 },
      recipeServings: { [recipe.id]: 3 }, recipeSettings: { defaultServingSize: 4 }
    });
    await mutate(base + '/note', { note: '' });
    await mutate(base + '/rating', { rating: null });
    await mutate('/api/recipe-settings/default-serving-size', { defaultServingSize: null });
    expect(await state()).toMatchObject({ recipeNotes: {}, recipeRatings: {}, recipeSettings: {} });
  });
  it('moves, removes and marks planned meals cooked atomically', async () => {
    const date = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const nextDate = new Date(Date.now() + 172_800_000).toISOString().slice(0, 10);
    await mutate('/api/meal-plan/entries', { recipeId: recipe.id, date });
    await mutate('/api/meal-plan/entries', { recipeId: recipe.id, date });
    await mutate('/api/meal-plan/entries/move', { currentDate: date, entryIndex: 1, nextDate });
    await mutate('/api/meal-plan/entries', { currentDate: date, entryIndex: 0 }, 'DELETE');
    const response = await mutate('/api/meal-plan/entries/mark-cooked', { currentDate: nextDate, entryIndex: 0 });
    expect(response.status).toBe(200);
    const data = await state();
    expect(data.mealPlan).toEqual({});
    expect(Object.values(data.cookedMealHistory)).toEqual([[recipe.id]]);
  });
  it('adds, moves and removes cooked history entries', async () => {
    await mutate('/api/cooked-meal-history/entries', { recipeId: recipe.id, date: '2020-02-01' });
    await mutate('/api/cooked-meal-history/entries/move', { currentDate: '2020-02-01', entryIndex: 0, nextDate: '2020-02-02' });
    expect((await state()).cookedMealHistory).toEqual({ '2020-02-02': [recipe.id] });
    await mutate('/api/cooked-meal-history/entries', { currentDate: '2020-02-02', entryIndex: 0 }, 'DELETE');
    expect((await state()).cookedMealHistory).toEqual({});
  });
  it('persists bookmarks, checked shopping items and custom items', async () => {
    const recipeBookmarks = { [recipe.id]: [{ id: 'b1', label: 'Tip', text: 'Chop the garlic.' }] };
    const shoppingListChecks = { garlic: ['meal-1'] };
    const shoppingListCustomItems = [{ amountText: '2', ingredientName: 'Milk', id: 'c1' }];
    for (const [path, value] of [
      ['/api/recipe-bookmarks', { recipeBookmarks }],
      ['/api/shopping-list-checks', { shoppingListChecks }],
      ['/api/shopping-list-custom-items', { shoppingListCustomItems }]
    ] as const) expect((await mutate(path, value)).status).toBe(200);
    expect(await state()).toMatchObject({ recipeBookmarks, shoppingListChecks, shoppingListCustomItems });
  });
  it('rejects stale and missing revisions without changing data', async () => {
    const initial = await state();
    await mutate('/api/recipe-settings/default-serving-size', { defaultServingSize: 3 });
    expect((await mutate('/api/recipe-settings/default-serving-size', { defaultServingSize: 5 }, 'PUT', initial.revision)).status).toBe(409);
    expect((await request('/api/recipe-settings/default-serving-size', 'PUT', { defaultServingSize: 5 })).status).toBe(428);
    expect((await state()).recipeSettings).toEqual({ defaultServingSize: 3 });
  });
  it('allows only one of two concurrent writes based on the same revision', async () => {
    const responses = await Promise.all([3, 5].map((defaultServingSize) =>
      mutate('/api/recipe-settings/default-serving-size', { defaultServingSize }, 'PUT', 1)));
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await state()).revision).toBe(2);
  });
  it('validates dates, recipe IDs, values, indices and unknown routes without writes', async () => {
    const attempts = [
      ['/api/recipes/missing/note', { note: 'test' }, 404],
      ['/api/recipes/' + recipe.id + '/rating', { rating: 9 }, 400],
      ['/api/recipes/' + recipe.id + '/servings', { servings: 0 }, 400],
      ['/api/recipe-settings/default-serving-size', { defaultServingSize: -1 }, 400],
      ['/api/meal-plan/entries', { recipeId: recipe.id, date: '2020-02-01' }, 400],
      ['/api/cooked-meal-history/entries', { recipeId: recipe.id, date: '2020-02-30' }, 400],
      ['/api/meal-plan/entries/move', { currentDate: '2026-11-08', entryIndex: -1, nextDate: '2099-01-01' }, 400],
      ['/api/meal-plan/entries/mark-cooked', { currentDate: '2099-01-01', entryIndex: 0 }, 404],
      ['/api/recipe-bookmarks', { recipeBookmarks: { x: [null] } }, 400],
      ['/api/no-such-route', {}, 404]
    ] as const;
    for (const [path, body, status] of attempts) expect((await mutate(path, body)).status, path).toBe(status);
    expect((await state()).revision).toBe(1);
  });
  it('exports every data field as a portable authenticated backup', async () => {
    await mutate('/api/recipes/' + recipe.id + '/note', { note: 'Saved note' });
    const response = await request('/api/backup');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain('attachment;');
    const backup = await response.json() as any;
    expect(backup.format).toBe('recipes-backup');
    expect(backup.version).toBe(1);
    expect(backup.snapshot.recipes).toEqual([recipe]);
    expect(backup.snapshot.recipeNotes).toEqual({ [recipe.id]: 'Saved note' });
    expect(backup.snapshot).not.toHaveProperty('revision');
    expect(JSON.stringify(backup)).not.toContain(secret);
  });
});
