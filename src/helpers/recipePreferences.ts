import { normalizeRecipeNoteText } from './recipePreferenceData';
import { normalizeRecipes } from './customRecipes';
import {
  readJsonStorageValue,
  writeJsonStorageValue
} from './jsonStorage';
import {
  getRecipeScopedPreferencePath,
  recipePreferenceApiPaths,
  type RecipeScopedPreferenceSuffix
} from './recipePreferenceRoutes';
import {
  isValidMealPlanDate,
  normalizeCookedMealHistory,
  normalizeMealPlan
} from './mealPlanData';
import {
  getRecipeAppPreferenceDefinition,
  getRecipeAppPreferenceStore,
  recipeAppPreferenceKeys,
  type RecipeAppPreferenceKey,
  type RecipeAppPreferenceValueMap,
  type RecipePreferenceStore
} from './recipePreferenceStores';
import type {
  CookedMealHistoryMap,
  MealPlanMap,
  RecipeBookmarkMap,
  RecipePreferenceResponseKey,
  ShoppingListCheckMap,
  ShoppingListCustomItemList
} from '../types/app';
import type { Recipe } from '../types/recipe';

const SAVE_MEAL_PLAN_ERROR_MESSAGE = 'Could not save meal plan.';
const UPDATE_MEAL_PLAN_ERROR_MESSAGE = 'Could not update meal plan.';
const UPDATE_COOKED_MEAL_HISTORY_ERROR_MESSAGE = 'Could not update cooked meal history.';
const RECIPE_APP_DATA_CACHE_STORAGE_KEY = 'recipes:last-good-app-data';
const RECIPE_CATALOG_CACHE_STORAGE_KEY = 'recipes:last-good-catalog';

function createEmptyRecipeAppPreferenceSnapshot() {
  return Object.fromEntries(
    recipeAppPreferenceKeys.map((key) => [
      key,
      getRecipeAppPreferenceDefinition(key).store.createEmptyValue()
    ])
  ) as RecipeAppPreferenceValueMap;
}

function normalizeRecipeAppPreferenceSnapshot(value: unknown) {
  if (!value || typeof value !== 'object') {
    return createEmptyRecipeAppPreferenceSnapshot();
  }

  return Object.fromEntries(
    recipeAppPreferenceKeys.map((key) => {
      const { store } = getRecipeAppPreferenceDefinition(key);

      return [
        key,
        store.normalize((value as Partial<Record<RecipeAppPreferenceKey, unknown>>)[key])
      ];
    })
  ) as RecipeAppPreferenceValueMap;
}

function readCachedRecipeAppDataSnapshot() {
  const cachedValue = readJsonStorageValue(RECIPE_APP_DATA_CACHE_STORAGE_KEY);

  return cachedValue ? normalizeRecipeAppPreferenceSnapshot(cachedValue) : null;
}

function writeCachedRecipeAppDataSnapshot(snapshot: RecipeAppPreferenceValueMap) {
  writeJsonStorageValue(RECIPE_APP_DATA_CACHE_STORAGE_KEY, snapshot);
}

function writeCachedRecipeAppPreference<K extends RecipeAppPreferenceKey>(
  key: K,
  value: RecipeAppPreferenceValueMap[K]
) {
  writeCachedRecipeAppDataSnapshot({
    ...createEmptyRecipeAppPreferenceSnapshot(),
    ...readCachedRecipeAppDataSnapshot(),
    [key]: value
  });
}

function readCachedRecipeCatalog() {
  const cachedValue = readJsonStorageValue(RECIPE_CATALOG_CACHE_STORAGE_KEY);

  return cachedValue ? normalizeRecipes(cachedValue) : null;
}

function writeCachedRecipeCatalog(recipes: Recipe[]) {
  writeJsonStorageValue(RECIPE_CATALOG_CACHE_STORAGE_KEY, recipes);
}

async function requestRecipePreferencePayload({
  path,
  cache,
  errorMessage,
  body,
  method = 'GET'
}: {
  path: string;
  cache?: RequestCache;
  errorMessage: string;
  body?: unknown;
  method?: 'DELETE' | 'GET' | 'PUT';
}) {
  const response = await fetch(path, {
    cache,
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return (await response.json()) as Partial<
    Record<RecipePreferenceResponseKey, unknown>
  >;
}

async function requestRecipePreference<T>({
  path,
  responseKey,
  normalize,
  cache,
  errorMessage,
  body,
  method = 'GET'
}: {
  path: string;
  responseKey: RecipePreferenceResponseKey;
  normalize: (value: unknown) => T;
  cache?: RequestCache;
  errorMessage: string;
  body?: unknown;
  method?: 'DELETE' | 'GET' | 'PUT';
}) {
  const payload = await requestRecipePreferencePayload({
    path,
    cache,
    errorMessage,
    body,
    method
  });

  return normalize(payload[responseKey]);
}

function fetchReadableRecipePreference<T, K extends RecipePreferenceResponseKey>(
  store: RecipePreferenceStore<T, K>,
  errorMessage: string,
  cache?: RequestCache
) {
  return requestRecipePreference({
    path: store.requestPath,
    cache,
    responseKey: store.responseKey,
    normalize: store.normalize,
    errorMessage
  });
}

function persistReadableRecipePreference<T, K extends RecipePreferenceResponseKey>({
  body,
  errorMessage,
  path,
  store
}: {
  body: unknown;
  errorMessage: string;
  path?: string;
  store: RecipePreferenceStore<T, K>;
}) {
  const requestPath = path ?? store.requestPath;

  return requestRecipePreference({
    path: requestPath,
    method: 'PUT',
    body,
    responseKey: store.responseKey,
    normalize: store.normalize,
    errorMessage
  });
}

function persistRecipeScopedPreference<
  K extends Extract<RecipeAppPreferenceKey, 'recipeNotes' | 'recipeRatings' | 'recipeServings'>
>({
  body,
  errorMessage,
  key,
  recipeId,
  suffix
}: {
  body: unknown;
  errorMessage: string;
  key: K;
  recipeId: string;
  suffix: RecipeScopedPreferenceSuffix;
}) {
  return persistRecipeAppPreference({
    key,
    path: getRecipeScopedPreferencePath(recipeId, suffix),
    body,
    errorMessage
  });
}

function persistRecipeScopedPreferenceField<
  K extends Extract<RecipeAppPreferenceKey, 'recipeNotes' | 'recipeRatings' | 'recipeServings'>,
  V
>({
  errorMessage,
  field,
  key,
  normalizeValue,
  recipeId,
  suffix,
  value
}: {
  errorMessage: string;
  field: string;
  key: K;
  normalizeValue?: (value: V) => unknown;
  recipeId: string;
  suffix: RecipeScopedPreferenceSuffix;
  value: V;
}) {
  return persistRecipeScopedPreference({
    body: {
      [field]: normalizeValue ? normalizeValue(value) : value
    },
    errorMessage,
    key,
    recipeId,
    suffix
  });
}

async function fetchRecipeAppPreference<K extends RecipeAppPreferenceKey>(
  key: K,
  cache?: RequestCache
) {
  const { loadErrorMessage, store } = getRecipeAppPreferenceDefinition(key);

  return fetchReadableRecipePreference(store, loadErrorMessage, cache);
}

function persistRecipeAppPreference<K extends RecipeAppPreferenceKey>({
  body,
  errorMessage,
  key,
  path
}: {
  body: unknown;
  errorMessage: string;
  key: K;
  path?: string;
}) {
  return persistReadableRecipePreference({
    body,
    errorMessage,
    path,
    store: getRecipeAppPreferenceStore(key)
  }).then((nextValue) => {
    writeCachedRecipeAppPreference(key, nextValue);
    return nextValue;
  });
}

function requestMealPlanMutation({
  body,
  errorMessage,
  method = 'PUT',
  path
}: {
  body: unknown;
  errorMessage: string;
  method?: 'DELETE' | 'PUT';
  path: string;
}) {
  return requestRecipePreference({
    path,
    method,
    body,
    responseKey: 'mealPlan',
    normalize: normalizeMealPlan,
    errorMessage
  }).then((mealPlan) => {
    writeCachedRecipeAppPreference('mealPlan', mealPlan);
    return mealPlan;
  });
}

function requestCookedMealHistoryMutation({
  body,
  errorMessage = UPDATE_COOKED_MEAL_HISTORY_ERROR_MESSAGE,
  method = 'PUT',
  path
}: {
  body: unknown;
  errorMessage?: string;
  method?: 'DELETE' | 'PUT';
  path: string;
}) {
  return requestRecipePreference({
    path,
    method,
    body,
    responseKey: 'cookedMealHistory',
    normalize: normalizeCookedMealHistory,
    errorMessage
  }).then((cookedMealHistory) => {
    writeCachedRecipeAppPreference('cookedMealHistory', cookedMealHistory);
    return cookedMealHistory;
  });
}

export async function fetchRecipeAppDataSnapshot({
  cache,
  onError = console.error
}: {
  cache?: RequestCache;
  onError?: (error: unknown) => void;
} = {}) {
  const cachedSnapshot = readCachedRecipeAppDataSnapshot();
  const loadedResults = await Promise.allSettled(
    recipeAppPreferenceKeys.map(async (key) => {
      return [key, await fetchRecipeAppPreference(key, cache)] as const;
    })
  );
  const didLoadAnyPreference = loadedResults.some(
    (result) => result.status === 'fulfilled'
  );
  const didFailAnyPreference = loadedResults.some(
    (result) => result.status === 'rejected'
  );

  if (!didLoadAnyPreference && cachedSnapshot) {
    loadedResults.forEach((result) => {
      if (result.status === 'rejected') {
        onError(result.reason);
      }
    });

    return cachedSnapshot;
  }

  const loadedEntries = loadedResults.map((result, index) => {
    const key = recipeAppPreferenceKeys[index];
    const { store } = getRecipeAppPreferenceDefinition(key);

    if (result.status === 'fulfilled') {
      return result.value;
    }

    onError(result.reason);
    return [
      key,
      cachedSnapshot?.[key] ?? store.createEmptyValue()
    ] as const;
  });
  const loadedSnapshot = Object.fromEntries(loadedEntries) as RecipeAppPreferenceValueMap;

  if (!didFailAnyPreference) {
    writeCachedRecipeAppDataSnapshot(loadedSnapshot);
  }

  return loadedSnapshot;
}

export async function persistMealPlanRecipe(recipeId: string, date: string) {
  if (!isValidMealPlanDate(date)) {
    throw new Error(SAVE_MEAL_PLAN_ERROR_MESSAGE);
  }

  return requestMealPlanMutation({
    path: recipePreferenceApiPaths.mealPlanEntries,
    body: { date, recipeId },
    errorMessage: SAVE_MEAL_PLAN_ERROR_MESSAGE
  });
}

export async function moveMealPlanEntry(
  currentDate: string,
  entryIndex: number,
  nextDate: string
) {
  if (!isValidMealPlanDate(nextDate)) {
    throw new Error(UPDATE_MEAL_PLAN_ERROR_MESSAGE);
  }

  return requestMealPlanMutation({
    path: recipePreferenceApiPaths.mealPlanEntriesMove,
    body: { currentDate, entryIndex, nextDate },
    errorMessage: UPDATE_MEAL_PLAN_ERROR_MESSAGE
  });
}

export async function removeMealPlanEntry(currentDate: string, entryIndex: number) {
  return requestMealPlanMutation({
    path: recipePreferenceApiPaths.mealPlanEntries,
    method: 'DELETE',
    body: { currentDate, entryIndex },
    errorMessage: UPDATE_MEAL_PLAN_ERROR_MESSAGE
  });
}

export async function markMealPlanEntryAsCooked(currentDate: string, entryIndex: number) {
  const payload = await requestRecipePreferencePayload({
    path: recipePreferenceApiPaths.mealPlanEntriesMarkCooked,
    method: 'PUT',
    body: { currentDate, entryIndex },
    errorMessage: 'Could not update cooked meal history.'
  });

  const nextState = {
    cookedMealHistory: normalizeCookedMealHistory(payload.cookedMealHistory),
    mealPlan: normalizeMealPlan(payload.mealPlan)
  } satisfies {
    cookedMealHistory: CookedMealHistoryMap;
    mealPlan: MealPlanMap;
  };

  writeCachedRecipeAppPreference('cookedMealHistory', nextState.cookedMealHistory);
  writeCachedRecipeAppPreference('mealPlan', nextState.mealPlan);

  return nextState;
}

export async function markRecipeAsCooked(recipeId: string, date: string) {
  if (!isValidMealPlanDate(date)) {
    throw new Error(UPDATE_COOKED_MEAL_HISTORY_ERROR_MESSAGE);
  }

  return requestCookedMealHistoryMutation({
    path: recipePreferenceApiPaths.cookedMealHistoryEntries,
    method: 'PUT',
    body: { date, recipeId },
    errorMessage: UPDATE_COOKED_MEAL_HISTORY_ERROR_MESSAGE
  });
}

export async function moveCookedMealHistoryEntry(
  currentDate: string,
  entryIndex: number,
  nextDate: string
) {
  if (!isValidMealPlanDate(nextDate)) {
    throw new Error(UPDATE_COOKED_MEAL_HISTORY_ERROR_MESSAGE);
  }

  return requestCookedMealHistoryMutation({
    path: recipePreferenceApiPaths.cookedMealHistoryEntriesMove,
    body: { currentDate, entryIndex, nextDate }
  });
}

export async function removeCookedMealHistoryEntry(
  currentDate: string,
  entryIndex: number
) {
  return requestCookedMealHistoryMutation({
    path: recipePreferenceApiPaths.cookedMealHistoryEntries,
    method: 'DELETE',
    body: { currentDate, entryIndex }
  });
}

export async function persistRecipeRating(
  recipeId: string,
  nextRating: number | null
) {
  return persistRecipeScopedPreferenceField({
    errorMessage: 'Could not save recipe rating.',
    field: 'rating',
    key: 'recipeRatings',
    recipeId,
    suffix: 'rating',
    value: nextRating
  });
}

export async function persistRecipeServing(recipeId: string, nextServings: number) {
  return persistRecipeScopedPreferenceField({
    errorMessage: 'Could not save recipe servings.',
    field: 'servings',
    key: 'recipeServings',
    recipeId,
    suffix: 'servings',
    value: nextServings
  });
}

export async function persistRecipeNote(recipeId: string, nextNote: string) {
  return persistRecipeScopedPreferenceField({
    errorMessage: 'Could not save recipe notes.',
    field: 'note',
    key: 'recipeNotes',
    normalizeValue: normalizeRecipeNoteText,
    recipeId,
    suffix: 'note',
    value: nextNote
  });
}

export async function persistDefaultServingSize(nextDefaultServingSize: number | null) {
  return persistRecipeAppPreference({
    key: 'recipeSettings',
    path: recipePreferenceApiPaths.recipeSettingsDefaultServingSize,
    body: { defaultServingSize: nextDefaultServingSize },
    errorMessage: 'Could not save recipe settings.'
  });
}

export async function persistRecipeBookmarks(
  nextRecipeBookmarks: RecipeBookmarkMap
) {
  return persistRecipeAppPreference({
    key: 'recipeBookmarks',
    body: { recipeBookmarks: nextRecipeBookmarks },
    errorMessage: 'Could not save recipe bookmarks.'
  });
}

export async function persistShoppingListChecks(
  nextShoppingListChecks: ShoppingListCheckMap
) {
  return persistRecipeAppPreference({
    key: 'shoppingListChecks',
    body: { shoppingListChecks: nextShoppingListChecks },
    errorMessage: 'Could not save shopping list checks.'
  });
}

export async function persistShoppingListCustomItems(
  nextShoppingListCustomItems: ShoppingListCustomItemList
) {
  return persistRecipeAppPreference({
    key: 'shoppingListCustomItems',
    body: { shoppingListCustomItems: nextShoppingListCustomItems },
    errorMessage: 'Could not save custom shopping list items.'
  });
}

export async function fetchRecipeCatalog({
  cache,
  onError = console.error
}: {
  cache?: RequestCache;
  onError?: (error: unknown) => void;
} = {}) {
  try {
    const recipes = await requestRecipePreference({
      path: recipePreferenceApiPaths.recipeCatalog,
      cache,
      responseKey: 'recipes',
      normalize: normalizeRecipes,
      errorMessage: 'Could not load recipes.'
    });

    writeCachedRecipeCatalog(recipes);
    return recipes;
  } catch (error) {
    onError(error);
    return readCachedRecipeCatalog() ?? ([] as Recipe[]);
  }
}

export async function persistRecipeCatalog(recipe: Recipe) {
  const recipes = await requestRecipePreference({
    path: recipePreferenceApiPaths.recipeCatalog,
    method: 'PUT',
    body: { recipe },
    responseKey: 'recipes',
    normalize: normalizeRecipes,
    errorMessage: 'Could not save recipe.'
  });

  writeCachedRecipeCatalog(recipes);
  return recipes;
}
