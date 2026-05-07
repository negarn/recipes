import {
  normalizeCookedMealHistory,
  normalizeMealPlan
} from './mealPlanData';
import {
  normalizeRecipeBookmarks,
  normalizeRecipeNotes,
  normalizeRecipeRatings,
  normalizeRecipeServings,
  normalizeRecipeSettings,
  normalizeShoppingListChecks,
  normalizeShoppingListCustomItems
} from './recipePreferenceData';
import { recipePreferenceApiPaths } from './recipePreferenceRoutes';
import type {
  CookedMealHistoryMap,
  MealPlanMap,
  RecipeBookmarkMap,
  RecipeNoteMap,
  RecipePreferenceResponseKey,
  RecipeRatingMap,
  RecipeServingMap,
  RecipeSettings,
  ShoppingListCheckMap,
  ShoppingListCustomItemList
} from '../types/app';

export type RecipeAppPreferenceKey =
  | 'cookedMealHistory'
  | 'mealPlan'
  | 'recipeBookmarks'
  | 'recipeNotes'
  | 'recipeRatings'
  | 'recipeServings'
  | 'recipeSettings'
  | 'shoppingListChecks'
  | 'shoppingListCustomItems';

export type RecipeAppPreferenceValueMap = {
  cookedMealHistory: CookedMealHistoryMap;
  mealPlan: MealPlanMap;
  recipeBookmarks: RecipeBookmarkMap;
  recipeNotes: RecipeNoteMap;
  recipeRatings: RecipeRatingMap;
  recipeServings: RecipeServingMap;
  recipeSettings: RecipeSettings;
  shoppingListChecks: ShoppingListCheckMap;
  shoppingListCustomItems: ShoppingListCustomItemList;
};

export type RecipePreferenceStore<
  T,
  K extends RecipePreferenceResponseKey
> = {
  createEmptyValue: () => T;
  normalize: (value: unknown) => T;
  requestPath: string;
  responseKey: K;
};

type RecipeAppPreferenceDefinitions = {
  [K in RecipeAppPreferenceKey]: AppRecipePreferenceDefinition<
    K,
    RecipePreferenceResponseKey
  >;
};

type AppRecipePreferenceDefinition<
  K extends RecipeAppPreferenceKey,
  R extends RecipePreferenceResponseKey
> = {
  fileName: string;
  loadErrorMessage: string;
  store: RecipePreferenceStore<RecipeAppPreferenceValueMap[K], R>;
};

function createRecipeAppPreferenceDefinition<
  K extends RecipeAppPreferenceKey,
  R extends RecipePreferenceResponseKey
>(
  _key: K,
  {
    createEmptyValue,
    fileName,
    loadErrorMessage,
    normalize,
    requestPath,
    responseKey
  }: {
    createEmptyValue: () => RecipeAppPreferenceValueMap[K];
    fileName: string;
    loadErrorMessage: string;
    normalize: (value: unknown) => RecipeAppPreferenceValueMap[K];
    requestPath: string;
    responseKey: R;
  }
) {
  const store = {
    createEmptyValue,
    normalize,
    requestPath,
    responseKey
  } satisfies RecipePreferenceStore<RecipeAppPreferenceValueMap[K], R>;

  return {
    fileName,
    loadErrorMessage,
    store
  } satisfies AppRecipePreferenceDefinition<K, R>;
}

const recipeAppPreferenceDefinitions: RecipeAppPreferenceDefinitions = {
  cookedMealHistory: createRecipeAppPreferenceDefinition('cookedMealHistory', {
    createEmptyValue: () => ({} as CookedMealHistoryMap),
    fileName: 'cooked-meal-history.json',
    loadErrorMessage: 'Could not load cooked meal history.',
    normalize: normalizeCookedMealHistory,
    requestPath: recipePreferenceApiPaths.cookedMealHistory,
    responseKey: 'cookedMealHistory'
  }),
  mealPlan: createRecipeAppPreferenceDefinition('mealPlan', {
    createEmptyValue: () => ({} as MealPlanMap),
    fileName: 'meal-plan.json',
    loadErrorMessage: 'Could not load meal plan.',
    normalize: normalizeMealPlan,
    requestPath: recipePreferenceApiPaths.mealPlan,
    responseKey: 'mealPlan'
  }),
  recipeBookmarks: createRecipeAppPreferenceDefinition('recipeBookmarks', {
    createEmptyValue: () => ({} as RecipeBookmarkMap),
    fileName: 'recipe-bookmarks.json',
    loadErrorMessage: 'Could not load recipe bookmarks.',
    normalize: normalizeRecipeBookmarks,
    requestPath: recipePreferenceApiPaths.recipeBookmarks,
    responseKey: 'recipeBookmarks'
  }),
  recipeNotes: createRecipeAppPreferenceDefinition('recipeNotes', {
    createEmptyValue: () => ({} as RecipeNoteMap),
    fileName: 'recipe-notes.json',
    loadErrorMessage: 'Could not load recipe notes.',
    normalize: normalizeRecipeNotes,
    requestPath: recipePreferenceApiPaths.recipeNotes,
    responseKey: 'recipeNotes'
  }),
  recipeRatings: createRecipeAppPreferenceDefinition('recipeRatings', {
    createEmptyValue: () => ({} as RecipeRatingMap),
    fileName: 'recipe-ratings.json',
    loadErrorMessage: 'Could not load recipe ratings.',
    normalize: normalizeRecipeRatings,
    requestPath: recipePreferenceApiPaths.recipeRatings,
    responseKey: 'recipeRatings'
  }),
  recipeServings: createRecipeAppPreferenceDefinition('recipeServings', {
    createEmptyValue: () => ({} as RecipeServingMap),
    fileName: 'recipe-servings.json',
    loadErrorMessage: 'Could not load recipe servings.',
    normalize: normalizeRecipeServings,
    requestPath: recipePreferenceApiPaths.recipeServings,
    responseKey: 'recipeServings'
  }),
  recipeSettings: createRecipeAppPreferenceDefinition('recipeSettings', {
    createEmptyValue: () => ({} as RecipeSettings),
    fileName: 'recipe-settings.json',
    loadErrorMessage: 'Could not load recipe settings.',
    normalize: normalizeRecipeSettings,
    requestPath: recipePreferenceApiPaths.recipeSettings,
    responseKey: 'recipeSettings'
  }),
  shoppingListChecks: createRecipeAppPreferenceDefinition('shoppingListChecks', {
    createEmptyValue: () => ({} as ShoppingListCheckMap),
    fileName: 'shopping-list-checks.json',
    loadErrorMessage: 'Could not load shopping list checks.',
    normalize: normalizeShoppingListChecks,
    requestPath: recipePreferenceApiPaths.shoppingListChecks,
    responseKey: 'shoppingListChecks'
  }),
  shoppingListCustomItems: createRecipeAppPreferenceDefinition(
    'shoppingListCustomItems',
    {
      createEmptyValue: () => ([] as ShoppingListCustomItemList),
      fileName: 'shopping-list-custom-items.json',
      loadErrorMessage: 'Could not load custom shopping list items.',
      normalize: normalizeShoppingListCustomItems,
      requestPath: recipePreferenceApiPaths.shoppingListCustomItems,
      responseKey: 'shoppingListCustomItems'
    }
  )
};

export const recipeAppPreferenceKeys = Object.keys(
  recipeAppPreferenceDefinitions
) as RecipeAppPreferenceKey[];

export function getRecipeAppPreferenceStore<K extends RecipeAppPreferenceKey>(key: K) {
  return recipeAppPreferenceDefinitions[key].store;
}

export function getRecipeAppPreferenceDefinition<K extends RecipeAppPreferenceKey>(key: K) {
  return recipeAppPreferenceDefinitions[key];
}
