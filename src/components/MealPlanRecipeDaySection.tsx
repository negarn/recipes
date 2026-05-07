import type { ReactNode } from 'react';
import { getRecipeRoutePath } from '../helpers/appRoutes';
import { homePageRecipeCardClass } from '../helpers/homePageRecipeCardStyles';
import { formatMealPlanDayLabel } from '../helpers/mealPlan';
import {
  cn,
  subheadingChipClass,
  subheadingLabelClass
} from '../helpers/uiClasses';
import type { DatedRecipeGroup } from '../hooks/useMealPlanRecipeGroups';
import type { RecipePageLocationState } from '../types/app';
import { RecipeListRow } from './RecipeSummary';

export function MealPlanRecipeDaySection({
  createRecipeState,
  date,
  recipes,
  renderActions,
  tone = 'plan'
}: {
  createRecipeState: (
    recipeEntry: DatedRecipeGroup['recipes'][number]
  ) => RecipePageLocationState;
  date: string;
  recipes: DatedRecipeGroup['recipes'];
  renderActions?: (
    recipeEntry: DatedRecipeGroup['recipes'][number],
    recipeTitle: string
  ) => ReactNode;
  tone?: 'plan' | 'history';
}) {
  const isHistoryTone = tone === 'history';

  return (
    <section className="grid min-w-0 gap-2 pt-5 first:pt-0 min-[720px]:gap-2.5 min-[720px]:pt-6 min-[720px]:first:pt-0">
      <h2
        className={cn(
          subheadingLabelClass,
          subheadingChipClass
        )}
      >
        {formatMealPlanDayLabel(date)}
      </h2>

      <div className="grid min-w-0 gap-2.5 min-[720px]:gap-3">
        {recipes.map((recipeEntry) => {
          const { key, recipe } = recipeEntry;

          return (
            <RecipeListRow
              key={key}
              actions={renderActions?.(recipeEntry, recipe.title)}
              className={cn(
                homePageRecipeCardClass,
                '!block !h-auto !min-h-0 !p-3 min-[720px]:!p-4',
                isHistoryTone
                  ? '!border-app-history-line !bg-app-history-row hover:!border-app-accent hover:!bg-app-history-row-hover focus-within:!border-app-accent focus-within:!bg-app-history-row-hover'
                  : '!border-app-field-border !bg-app-meal-row hover:!border-app-line-focus hover:!bg-app-meal-row-hover focus-within:!border-app-line-focus focus-within:!bg-app-meal-row-hover'
              )}
              recipe={recipe}
              state={createRecipeState(recipeEntry)}
              to={getRecipeRoutePath(recipe.id)}
            />
          );
        })}
      </div>
    </section>
  );
}
