import type { RecipeCreatePayload } from '../components/RecipeCreateForm';
import type { Recipe } from '../types/recipe';
import { createIngredientAmountFromText } from './customRecipes';

function createIdSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeIngredientNameForIdMatch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getReusableIngredientIds(previousRecipe: Recipe | undefined) {
  const reusableIngredientIds = new Map<string, string[]>();

  previousRecipe?.ingredients.forEach((ingredient) => {
    const normalizedName = normalizeIngredientNameForIdMatch(ingredient.name);
    const currentIds = reusableIngredientIds.get(normalizedName) ?? [];

    reusableIngredientIds.set(normalizedName, [...currentIds, ingredient.id]);
  });

  return reusableIngredientIds;
}

export function createRecipeFromPayload(
  payload: RecipeCreatePayload,
  recipeId: string,
  previousRecipe?: Recipe
): Recipe {
  const recipe = createRecipeDraftFromPayload(payload, recipeId, previousRecipe);
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      name: ingredient.name.toLowerCase().replace(
        /\p{L}[\p{L}\p{M}]*(?:['’][\p{L}\p{M}]+)*/gu,
        (word) => word.charAt(0).toUpperCase() + word.slice(1)
      )
    }))
  };
}

// Keep draft spelling and offsets intact for consistency suggestions and edits.
export function createRecipeDraftFromPayload(
  payload: RecipeCreatePayload,
  recipeId: string,
  previousRecipe?: Recipe
) {
  const ingredientIds = new Set<string>();
  const reusableIngredientIds = getReusableIngredientIds(previousRecipe);

  const ingredients = payload.ingredients.map((ingredient, ingredientIndex) => {
    const reusableIds =
      reusableIngredientIds.get(normalizeIngredientNameForIdMatch(ingredient.name)) ?? [];
    const reusableIngredientId = reusableIds.shift();
    const baseIngredientId =
      reusableIngredientId || createIdSlug(ingredient.name) || `ingredient-${ingredientIndex + 1}`;
    let ingredientId = baseIngredientId;
    let duplicateCount = 2;

    while (ingredientIds.has(ingredientId)) {
      ingredientId = `${baseIngredientId}-${duplicateCount}`;
      duplicateCount += 1;
    }

    ingredientIds.add(ingredientId);

    return {
      amount: createIngredientAmountFromText(ingredient.amountText),
      id: ingredientId,
      name: ingredient.name
    };
  });

  return {
    defaultServings: payload.servings,
    id: recipeId,
    ingredients,
    isVegan: payload.isVegan,
    isVegetarian: payload.isVegetarian,
    nutrition: payload.nutrition,
    rating: payload.rating,
    sections: [
      {
        id: 'prep',
        steps: payload.prepSteps,
        title: 'Prep'
      },
      {
        id: 'cook',
        steps: payload.cookSteps,
        title: 'Cook'
      }
    ].filter((section) => section.steps.length > 0),
    tags: payload.tags,
    title: payload.title,
    totalTime: payload.totalTime
  } satisfies Recipe;
}
