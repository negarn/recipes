import { normalizeRecipes } from './customRecipes';
import {
  getRecipeAppPreferenceStore,
  recipeAppPreferenceKeys,
  type RecipeAppPreferenceValueMap
} from './recipePreferenceStores';
import type { Recipe } from '../types/recipe';

export type RecipeAppDataSnapshot = RecipeAppPreferenceValueMap & { recipes: Recipe[] };

export function createEmptyRecipeAppDataSnapshot(): RecipeAppDataSnapshot {
  return {
    ...Object.fromEntries(recipeAppPreferenceKeys.map((key) => [
      key, getRecipeAppPreferenceStore(key).createEmptyValue()
    ])) as RecipeAppPreferenceValueMap,
    recipes: []
  };
}

export function normalizeRecipeAppDataSnapshot(value: unknown): RecipeAppDataSnapshot {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    ...Object.fromEntries(recipeAppPreferenceKeys.map((key) => [
      key, getRecipeAppPreferenceStore(key).normalize(record[key])
    ])) as RecipeAppPreferenceValueMap,
    recipes: normalizeRecipes(record.recipes)
  };
}

export type RecipeBackup = {
  format: 'recipes-backup';
  version: 1;
  exportedAt: string;
  snapshot: RecipeAppDataSnapshot;
};
