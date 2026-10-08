import type { RecipeNutrition } from '../types/recipe';

const recipeNutritionValueKeys = [
  'calories',
  'carbs',
  'fat',
  'saturates',
  'sugars',
  'fibre',
  'protein',
  'salt'
] as const satisfies ReadonlyArray<keyof RecipeNutrition['values']>;

export type RecipeNutritionDisplayUnit = 'g' | 'kcal';

const nutritionValueFormatters: Record<RecipeNutritionDisplayUnit, Intl.NumberFormat> = {
  g: new Intl.NumberFormat('en-CA', {
    maximumFractionDigits: 1
  }),
  kcal: new Intl.NumberFormat('en-CA', {
    maximumFractionDigits: 0
  })
};

export function isValidNutritionSourceServings(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function getRecipeNutritionPerServingValues(nutrition?: RecipeNutrition) {
  if (!nutrition || !isValidNutritionSourceServings(nutrition.sourceServings)) {
    return null;
  }

  const perServingValues: RecipeNutrition['values'] = {};

  for (const key of recipeNutritionValueKeys) {
    const value = nutrition.values[key];

    if (value === undefined) {
      continue;
    }
    if (!Number.isFinite(value) || value < 0) {
      return null;
    }
    const perServingValue = value / nutrition.sourceServings;
    if (!Number.isFinite(perServingValue)) {
      return null;
    }
    perServingValues[key] = perServingValue;
  }

  return Object.keys(perServingValues).length ? perServingValues : null;
}

export function formatRecipeNutritionValue(
  value: number,
  unit: RecipeNutritionDisplayUnit
) {
  return nutritionValueFormatters[unit].format(value);
}

export function formatRecipeNutritionAmount(
  value: number,
  unit: RecipeNutritionDisplayUnit
) {
  return `${formatRecipeNutritionValue(value, unit)} ${unit}`;
}
