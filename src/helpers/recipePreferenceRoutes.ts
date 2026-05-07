export const recipePreferenceApiPaths = {
  cookedMealHistory: '/api/cooked-meal-history',
  cookedMealHistoryEntries: '/api/cooked-meal-history/entries',
  mealPlan: '/api/meal-plan',
  mealPlanEntries: '/api/meal-plan/entries',
  mealPlanEntriesMarkCooked: '/api/meal-plan/entries/mark-cooked',
  mealPlanEntriesMove: '/api/meal-plan/entries/move',
  recipeCatalog: '/api/recipe-catalog',
  recipeBookmarks: '/api/recipe-bookmarks',
  recipeNotes: '/api/recipe-notes',
  recipeRatings: '/api/recipe-ratings',
  recipeServings: '/api/recipe-servings',
  recipeSettings: '/api/recipe-settings',
  recipeSettingsDefaultServingSize: '/api/recipe-settings/default-serving-size',
  recipes: '/api/recipes',
  shoppingListChecks: '/api/shopping-list-checks',
  shoppingListCustomItems: '/api/shopping-list-custom-items'
} as const;

export type RecipeScopedPreferenceSuffix = 'note' | 'rating' | 'servings';

export function getRecipeScopedPreferencePath(
  recipeId: string,
  suffix: RecipeScopedPreferenceSuffix
) {
  return `${recipePreferenceApiPaths.recipes}/${encodeURIComponent(recipeId)}/${suffix}`;
}
