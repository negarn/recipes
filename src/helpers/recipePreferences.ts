import { normalizeRecipeNoteText } from './recipePreferenceData';
import { normalizeRecipes } from './customRecipes';
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

async function requestRecipePreferencePayload({
  path,
  errorMessage,
  body,
  method = 'GET'
}: {
  path: string;
  errorMessage: string;
  body?: unknown;
  method?: 'DELETE' | 'GET' | 'PUT';
}) {
  const response = await fetch(path, {
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
  errorMessage,
  body,
  method = 'GET'
}: {
  path: string;
  responseKey: RecipePreferenceResponseKey;
  normalize: (value: unknown) => T;
  errorMessage: string;
  body?: unknown;
  method?: 'DELETE' | 'GET' | 'PUT';
}) {
  const payload = await requestRecipePreferencePayload({
    path,
    errorMessage,
    body,
    method
  });

  return normalize(payload[responseKey]);
}

function fetchReadableRecipePreference<T, K extends RecipePreferenceResponseKey>(
  store: RecipePreferenceStore<T, K>,
  errorMessage: string
) {
  return requestRecipePreference({
    path: store.requestPath,
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

async function fetchRecipeAppPreference<K extends RecipeAppPreferenceKey>(key: K) {
  const { loadErrorMessage, store } = getRecipeAppPreferenceDefinition(key);

  return fetchReadableRecipePreference(store, loadErrorMessage);
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
  });
}

export async function fetchRecipeAppDataSnapshot({
  onError = console.error
}: {
  onError?: (error: unknown) => void;
} = {}) {
  const loadedEntries = await Promise.all(
    recipeAppPreferenceKeys.map(async (key) => {
      const { store } = getRecipeAppPreferenceDefinition(key);

      try {
        return [key, await fetchRecipeAppPreference(key)] as const;
      } catch (error) {
        onError(error);
        return [key, store.createEmptyValue()] as const;
      }
    })
  );

  return Object.fromEntries(loadedEntries) as RecipeAppPreferenceValueMap;
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

  return {
    cookedMealHistory: normalizeCookedMealHistory(payload.cookedMealHistory),
    mealPlan: normalizeMealPlan(payload.mealPlan)
  } satisfies {
    cookedMealHistory: CookedMealHistoryMap;
    mealPlan: MealPlanMap;
  };
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
  onError = console.error
}: {
  onError?: (error: unknown) => void;
} = {}) {
  try {
    return await requestRecipePreference({
      path: recipePreferenceApiPaths.recipeCatalog,
      responseKey: 'recipes',
      normalize: normalizeRecipes,
      errorMessage: 'Could not load recipes.'
    });
  } catch (error) {
    onError(error);
    return [] as Recipe[];
  }
}

export async function persistRecipeCatalog(recipe: Recipe) {
  return requestRecipePreference({
    path: recipePreferenceApiPaths.recipeCatalog,
    method: 'PUT',
    body: { recipe },
    responseKey: 'recipes',
    normalize: normalizeRecipes,
    errorMessage: 'Could not save recipe.'
  });
}
