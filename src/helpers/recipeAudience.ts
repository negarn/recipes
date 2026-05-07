import type { Recipe } from '../types/recipe';

export const CHILD_RECIPE_TAG = 'children';

export function isRecipeForChildren(recipe: Pick<Recipe, 'tags'>) {
  return recipe.tags.some((tag) => tag.trim().toLowerCase() === CHILD_RECIPE_TAG);
}
