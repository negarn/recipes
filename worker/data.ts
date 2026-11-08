import { normalizeRecipe } from '../src/helpers/customRecipes';
import { createEmptyRecipeAppDataSnapshot, type RecipeBackup } from '../src/helpers/appData';
import {
  getTodayMealPlanDateString, isAllowedMealPlanDate, isValidMealPlanDate
} from '../src/helpers/mealPlanData';
import {
  isValidRecipeRating, isValidRecipeServing, normalizeRecipeNoteText
} from '../src/helpers/recipePreferenceData';
import {
  getRecipeAppPreferenceStore,
  type RecipeAppPreferenceValueMap
} from '../src/helpers/recipePreferenceStores';
import { recipePreferenceApiPaths as paths } from '../src/helpers/recipePreferenceRoutes';
import type { DatedRecipeMap } from '../src/types/app';
import type { Recipe } from '../src/types/recipe';

export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function requireValue(condition: unknown, message = 'Invalid request.'): asserts condition {
  if (!condition) throw new ApiError(400, message);
}

export async function readPreferences(db: D1Database) {
  const row = await db.prepare('SELECT data, revision FROM app_state WHERE id = 1')
    .first<{ data: string; revision: number }>();
  if (!row) throw new Error('Database migrations have not been applied.');
  return { data: JSON.parse(row.data) as RecipeAppPreferenceValueMap, revision: row.revision };
}

export async function readCatalog(db: D1Database) {
  const { results } = await db.prepare('SELECT id, data, revision FROM recipes ORDER BY position, id')
    .all<{ id: string; data: string; revision: number }>();
  return {
    recipes: results.map((row) => JSON.parse(row.data) as Recipe),
    versions: Object.fromEntries(results.map((row) => [row.id, row.revision]))
  };
}

function expectedRevision(request: Request) {
  const value = request.headers.get('If-Match');
  if (!value || !/^\d+$/.test(value)) throw new ApiError(428, 'Reload the app before saving.');
  return Number(value);
}

export async function exportBackup(db: D1Database): Promise<RecipeBackup> {
  // One D1 batch provides a consistent read across the two tables.
  const [state, catalog] = await db.batch([
    db.prepare('SELECT data FROM app_state WHERE id = 1'),
    db.prepare('SELECT data FROM recipes ORDER BY position, id')
  ]);
  return {
    format: 'recipes-backup', version: 1, exportedAt: new Date().toISOString(),
    snapshot: {
      ...createEmptyRecipeAppDataSnapshot(),
      ...JSON.parse((state.results[0] as { data: string }).data),
      recipes: catalog.results.map((row) => JSON.parse((row as { data: string }).data))
    }
  };
}

function takeEntry(map: DatedRecipeMap, body: Record<string, unknown>) {
  const { currentDate, entryIndex } = body;
  requireValue(isValidMealPlanDate(currentDate) && Number.isSafeInteger(entryIndex) && Number(entryIndex) >= 0);
  const entries = map[currentDate];
  if (!entries || Number(entryIndex) >= entries.length) throw new ApiError(404, 'Meal entry not found.');
  const [recipeId] = entries.splice(Number(entryIndex), 1);
  if (!entries.length) delete map[currentDate];
  return recipeId;
}

function addEntry(map: DatedRecipeMap, date: string, recipeId: string) {
  map[date] = [...(map[date] ?? []), recipeId];
}

async function requireRecipe(db: D1Database, recipeId: unknown): Promise<string> {
  requireValue(typeof recipeId === 'string' && recipeId.length > 0);
  if (!await db.prepare('SELECT id FROM recipes WHERE id = ?').bind(recipeId).first()) {
    throw new ApiError(404, 'Recipe not found.');
  }
  return recipeId;
}

export async function saveRecipe(request: Request, db: D1Database, body: Record<string, unknown>) {
  const recipe = normalizeRecipe(body.recipe);
  requireValue(recipe, 'Invalid recipe.');
  const version = expectedRevision(request);
  const query = version === 0
    ? db.prepare(`INSERT OR IGNORE INTO recipes (id, position, data)
        VALUES (?, (SELECT COALESCE(MAX(position), -1) + 1 FROM recipes), ?)`)
      .bind(recipe.id, JSON.stringify(recipe))
    : db.prepare('UPDATE recipes SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?')
      .bind(JSON.stringify(recipe), recipe.id, version);
  if (!(await query.run()).meta.changes) throw new ApiError(409, 'This recipe changed elsewhere. Reload before saving.');
  return readCatalog(db);
}

export async function mutatePreferences(request: Request, db: D1Database, path: string, body: Record<string, unknown>) {
  const { data, revision } = await readPreferences(db);
  if (expectedRevision(request) !== revision) throw new ApiError(409, 'Data changed in another tab or device. Reload before saving.');
  const method = request.method;
  const scoped = path.match(/^\/api\/recipes\/([^/]+)\/(note|rating|servings)$/);
  if (scoped && method === 'PUT') {
    let decoded: string;
    try { decoded = decodeURIComponent(scoped[1]); } catch { throw new ApiError(400, 'Invalid recipe ID.'); }
    const id = await requireRecipe(db, decoded);
    if (scoped[2] === 'note') {
      requireValue(typeof body.note === 'string');
      const note = normalizeRecipeNoteText(body.note);
      if (note) data.recipeNotes[id] = note; else delete data.recipeNotes[id];
    } else if (scoped[2] === 'rating') {
      requireValue(body.rating === null || isValidRecipeRating(body.rating));
      if (body.rating === null) delete data.recipeRatings[id]; else data.recipeRatings[id] = body.rating;
    } else {
      requireValue(isValidRecipeServing(body.servings));
      data.recipeServings[id] = body.servings;
    }
  } else if (path === paths.recipeSettingsDefaultServingSize && method === 'PUT') {
    requireValue(body.defaultServingSize === null || isValidRecipeServing(body.defaultServingSize));
    data.recipeSettings = body.defaultServingSize === null ? {} : { defaultServingSize: body.defaultServingSize };
  } else if ((path === paths.mealPlanEntries || path === paths.cookedMealHistoryEntries) && ['PUT', 'DELETE'].includes(method)) {
    const isPlan = path === paths.mealPlanEntries;
    const map = isPlan ? data.mealPlan : data.cookedMealHistory;
    if (method === 'DELETE') takeEntry(map, body);
    else {
      requireValue(isPlan ? isAllowedMealPlanDate(body.date) : isValidMealPlanDate(body.date), 'Invalid meal date.');
      addEntry(map, body.date as string, await requireRecipe(db, body.recipeId));
    }
  } else if ((path === paths.mealPlanEntriesMove || path === paths.cookedMealHistoryEntriesMove) && method === 'PUT') {
    const isPlan = path === paths.mealPlanEntriesMove;
    requireValue(isPlan ? isAllowedMealPlanDate(body.nextDate) : isValidMealPlanDate(body.nextDate), 'Invalid meal date.');
    const map = isPlan ? data.mealPlan : data.cookedMealHistory;
    addEntry(map, body.nextDate as string, takeEntry(map, body));
  } else if (path === paths.mealPlanEntriesMarkCooked && method === 'PUT') {
    addEntry(data.cookedMealHistory, getTodayMealPlanDateString(), takeEntry(data.mealPlan, body));
  } else {
    const replaceable = ['recipeBookmarks', 'shoppingListChecks', 'shoppingListCustomItems'] as const;
    const key = replaceable.find((key) => getRecipeAppPreferenceStore(key).requestPath === path);
    if (!key || method !== 'PUT') throw new ApiError(404, 'Not found.');
    const value = body[key];
    requireValue(key === 'shoppingListCustomItems' ? Array.isArray(value) : value && typeof value === 'object' && !Array.isArray(value));
    // Validate instead of silently discarding malformed user data.
    const normalized = getRecipeAppPreferenceStore(key).normalize(value);
    requireValue(JSON.stringify(normalized) === JSON.stringify(value), 'Invalid preference data.');
    Object.assign(data, { [key]: normalized });
  }
  const result = await db.prepare('UPDATE app_state SET data = ?, revision = revision + 1 WHERE id = 1 AND revision = ?')
    .bind(JSON.stringify(data), revision).run();
  if (!result.meta.changes) throw new ApiError(409, 'Data changed in another tab or device. Reload before saving.');
  return { ...data, revision: revision + 1 };
}
