import { normalizeCookedMealHistory, normalizeMealPlan } from './mealPlanData';
import {
  normalizeRecipeBookmarks, normalizeRecipeNotes, normalizeRecipeRatings,
  normalizeRecipeServings, normalizeRecipeSettings, normalizeShoppingListChecks,
  normalizeShoppingListCustomItems
} from './recipePreferenceData';
import { recipePreferenceApiPaths } from './recipePreferenceRoutes';
import type {
  CookedMealHistoryMap, MealPlanMap, RecipeBookmarkMap, RecipeNoteMap,
  RecipePreferenceResponseKey, RecipeRatingMap, RecipeServingMap,
  RecipeSettings, ShoppingListCheckMap, ShoppingListCustomItemList
} from '../types/app';

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

export type RecipeAppPreferenceKey = keyof RecipeAppPreferenceValueMap;

export type RecipePreferenceStore<T, K extends RecipePreferenceResponseKey> = {
  createEmptyValue: () => T;
  normalize: (value: unknown) => T;
  requestPath: string;
  responseKey: K;
};

const stores: {
  [K in RecipeAppPreferenceKey]: RecipePreferenceStore<RecipeAppPreferenceValueMap[K], K>
} = {
  cookedMealHistory: {
    createEmptyValue: () => ({}),
    normalize: normalizeCookedMealHistory,
    requestPath: recipePreferenceApiPaths.cookedMealHistory,
    responseKey: 'cookedMealHistory'
  },
  mealPlan: {
    createEmptyValue: () => ({}),
    normalize: normalizeMealPlan,
    requestPath: recipePreferenceApiPaths.mealPlan,
    responseKey: 'mealPlan'
  },
  recipeBookmarks: {
    createEmptyValue: () => ({}),
    normalize: normalizeRecipeBookmarks,
    requestPath: recipePreferenceApiPaths.recipeBookmarks,
    responseKey: 'recipeBookmarks'
  },
  recipeNotes: {
    createEmptyValue: () => ({}),
    normalize: normalizeRecipeNotes,
    requestPath: recipePreferenceApiPaths.recipeNotes,
    responseKey: 'recipeNotes'
  },
  recipeRatings: {
    createEmptyValue: () => ({}),
    normalize: normalizeRecipeRatings,
    requestPath: recipePreferenceApiPaths.recipeRatings,
    responseKey: 'recipeRatings'
  },
  recipeServings: {
    createEmptyValue: () => ({}),
    normalize: normalizeRecipeServings,
    requestPath: recipePreferenceApiPaths.recipeServings,
    responseKey: 'recipeServings'
  },
  recipeSettings: {
    createEmptyValue: () => ({}),
    normalize: normalizeRecipeSettings,
    requestPath: recipePreferenceApiPaths.recipeSettings,
    responseKey: 'recipeSettings'
  },
  shoppingListChecks: {
    createEmptyValue: () => ({}),
    normalize: normalizeShoppingListChecks,
    requestPath: recipePreferenceApiPaths.shoppingListChecks,
    responseKey: 'shoppingListChecks'
  },
  shoppingListCustomItems: {
    createEmptyValue: () => [],
    normalize: normalizeShoppingListCustomItems,
    requestPath: recipePreferenceApiPaths.shoppingListCustomItems,
    responseKey: 'shoppingListCustomItems'
  }
};

export const recipeAppPreferenceKeys = Object.keys(stores) as RecipeAppPreferenceKey[];

export function getRecipeAppPreferenceStore<K extends RecipeAppPreferenceKey>(key: K) {
  return stores[key];
}
