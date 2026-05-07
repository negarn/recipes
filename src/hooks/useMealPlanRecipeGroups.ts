import { useMemo } from 'react';
import { sortDatedEntries } from '../helpers/mealPlanData';
import type {
  CookedMealHistoryMap,
  DatedRecipeMap,
  MealPlanMap
} from '../types/app';
import type { Recipe } from '../types/recipe';

export type DatedRecipeGroup = {
  date: string;
  recipes: Array<{
    entryIndex: number;
    key: string;
    recipe: Recipe;
  }>;
};

function getDatedRecipeGroups(
  entries: DatedRecipeMap,
  sortDirection: 'asc' | 'desc',
  getRecipeById: (recipeId: string) => Recipe | undefined
) {
  return sortDatedEntries(entries, sortDirection)
    .map(([date, recipeIds]) => ({
      date,
      recipes: recipeIds.flatMap((recipeId, entryIndex) => {
        const recipe = getRecipeById(recipeId);

        return recipe
          ? [{ entryIndex, key: `${date}:${recipeId}:${entryIndex}`, recipe }]
          : [];
      })
    }))
    .filter(({ recipes }) => recipes.length > 0);
}

export function useMealPlanRecipeGroups(
  mealPlan: MealPlanMap,
  cookedMealHistory: CookedMealHistoryMap,
  getRecipeById: (recipeId: string) => Recipe | undefined
) {
  return useMemo(
    () => ({
      cookedMealDays: getDatedRecipeGroups(cookedMealHistory, 'desc', getRecipeById),
      mealPlanDays: getDatedRecipeGroups(mealPlan, 'asc', getRecipeById)
    }),
    [cookedMealHistory, getRecipeById, mealPlan]
  );
}
