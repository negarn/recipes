import { normalizeRecipes } from './customRecipes';
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
import type {
  CookedMealHistoryMap,
  MealPlanMap,
  RecipeBookmarkMap,
  RecipeNoteMap,
  RecipeRatingMap,
  RecipeServingMap,
  RecipeSettings,
  ShoppingListCheckMap,
  ShoppingListCustomItemList
} from '../types/app';
import type { Recipe } from '../types/recipe';
import { isRecordLike } from './normalization';

export const cloudSyncProviders = ['google-drive', 'dropbox'] as const;

export type CloudSyncProvider = (typeof cloudSyncProviders)[number];

export const cloudSyncProviderLabels: Record<CloudSyncProvider, string> = {
  'google-drive': 'Google Drive',
  dropbox: 'Dropbox'
};

export type RecipeAppDataSnapshot = {
  cookedMealHistory: CookedMealHistoryMap;
  mealPlan: MealPlanMap;
  recipes: Recipe[];
  recipeBookmarks: RecipeBookmarkMap;
  recipeNotes: RecipeNoteMap;
  recipeRatings: RecipeRatingMap;
  recipeServings: RecipeServingMap;
  recipeSettings: RecipeSettings;
  shoppingListChecks: ShoppingListCheckMap;
  shoppingListCustomItems: ShoppingListCustomItemList;
};

export type CloudSyncBundle = {
  snapshot: RecipeAppDataSnapshot;
  version: 1;
};

export type CloudSyncProviderConnectionStatus = {
  isConfigured: boolean;
  isConnected: boolean;
  lastError: string | null;
  lastKnownRemoteModifiedAt: string | null;
  lastSyncedAt: string | null;
};

export type CloudSyncStatus = {
  activeProvider: CloudSyncProvider | null;
  isSyncing: boolean;
  providers: Record<CloudSyncProvider, CloudSyncProviderConnectionStatus>;
};

export function createEmptyRecipeAppDataSnapshot(): RecipeAppDataSnapshot {
  return {
    cookedMealHistory: {} as CookedMealHistoryMap,
    mealPlan: {} as MealPlanMap,
    recipes: [],
    recipeBookmarks: {} as RecipeBookmarkMap,
    recipeNotes: {} as RecipeNoteMap,
    recipeRatings: {} as RecipeRatingMap,
    recipeServings: {} as RecipeServingMap,
    recipeSettings: {} as RecipeSettings,
    shoppingListChecks: {} as ShoppingListCheckMap,
    shoppingListCustomItems: [] as ShoppingListCustomItemList
  };
}

export function isRecipeAppDataSnapshotEmpty(snapshot: RecipeAppDataSnapshot) {
  return (
    !Object.keys(snapshot.cookedMealHistory).length &&
    !Object.keys(snapshot.mealPlan).length &&
    !snapshot.recipes.length &&
    !Object.keys(snapshot.recipeBookmarks).length &&
    !Object.keys(snapshot.recipeNotes).length &&
    !Object.keys(snapshot.recipeRatings).length &&
    !Object.keys(snapshot.recipeServings).length &&
    !Object.keys(snapshot.recipeSettings).length &&
    !Object.keys(snapshot.shoppingListChecks).length &&
    !snapshot.shoppingListCustomItems.length
  );
}

export function normalizeRecipeAppDataSnapshot(value: unknown) {
  if (!isRecordLike(value)) {
    return createEmptyRecipeAppDataSnapshot();
  }

  const {
    cookedMealHistory,
    mealPlan,
    recipes,
    recipeBookmarks,
    recipeNotes,
    recipeRatings,
    recipeServings,
    recipeSettings,
    shoppingListChecks,
    shoppingListCustomItems
  } = value as Partial<Record<keyof RecipeAppDataSnapshot, unknown>>;

  return {
    cookedMealHistory: normalizeCookedMealHistory(cookedMealHistory),
    mealPlan: normalizeMealPlan(mealPlan),
    recipes: normalizeRecipes(recipes),
    recipeBookmarks: normalizeRecipeBookmarks(recipeBookmarks),
    recipeNotes: normalizeRecipeNotes(recipeNotes),
    recipeRatings: normalizeRecipeRatings(recipeRatings),
    recipeServings: normalizeRecipeServings(recipeServings),
    recipeSettings: normalizeRecipeSettings(recipeSettings),
    shoppingListChecks: normalizeShoppingListChecks(shoppingListChecks),
    shoppingListCustomItems: normalizeShoppingListCustomItems(shoppingListCustomItems)
  } satisfies RecipeAppDataSnapshot;
}

export function serializeCloudSyncBundle(snapshot: RecipeAppDataSnapshot): CloudSyncBundle {
  return {
    snapshot,
    version: 1
  };
}

export function normalizeCloudSyncBundle(value: unknown) {
  if (isRecordLike(value) && value.version === 1 && 'snapshot' in value) {
    return normalizeRecipeAppDataSnapshot(value.snapshot);
  }

  return normalizeRecipeAppDataSnapshot(value);
}

export function createDefaultCloudSyncStatus(): CloudSyncStatus {
  const providerStatus = (): CloudSyncProviderConnectionStatus => ({
    isConfigured: false,
    isConnected: false,
    lastError: null,
    lastKnownRemoteModifiedAt: null,
    lastSyncedAt: null
  });

  return {
    activeProvider: null,
    isSyncing: false,
    providers: {
      'google-drive': providerStatus(),
      dropbox: providerStatus()
    }
  };
}
