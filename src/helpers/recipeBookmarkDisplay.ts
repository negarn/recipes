import type { RecipeBookmark } from '../types/app';
import type { Recipe } from '../types/recipe';
import { renderMethodStepText } from './recipeDisplay';

export function getRecipeBookmarkDisplay(bookmark: RecipeBookmark, recipe?: Recipe): RecipeBookmark {
  return {
    ...bookmark,
    label: renderMethodStepText(bookmark.label, recipe),
    text: renderMethodStepText(bookmark.text, recipe)
  };
}
