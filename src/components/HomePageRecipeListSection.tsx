import { useEffect, useState } from 'react';
import { EmptyStateCard } from './PageStatusMessage';
import { PageNavigationControls } from './PageNavigationControls';
import { HomePageRecipeCardMenu } from './HomePageRecipeCardMenu';
import { RecipeCard } from './RecipeSummary';
import { getRecipeRoutePath } from '../helpers/appRoutes';
import { homePageRecipeCardClass } from '../helpers/homePageRecipeCardStyles';
import type { RecipePageLocationState } from '../types/app';
import type { Recipe } from '../types/recipe';

function HomePageRecipePagination({
  currentPage,
  onPageChange,
  totalPages
}: {
  currentPage: number;
  onPageChange: (nextPage: number) => void;
  totalPages: number;
}) {
  return (
    <PageNavigationControls
      ariaLabel="Recipe list pages"
      onPrevious={() => {
        onPageChange(Math.max(1, currentPage - 1));
      }}
      isPreviousDisabled={currentPage === 1}
      onNext={() => {
        onPageChange(Math.min(totalPages, currentPage + 1));
      }}
      isNextDisabled={currentPage === totalPages}
    >
      <p className="m-0 text-[0.92rem] font-semibold text-app-muted">
        Page <strong className="text-app-ink">{currentPage}</strong> of{' '}
        <strong className="text-app-ink">{totalPages}</strong>
      </p>
    </PageNavigationControls>
  );
}

export function HomePageRecipeListSection({
  currentPage,
  isAddToMealPlanPending,
  onEditRecipe,
  onMealPlanRecipeToggle,
  onPageChange,
  recipePageState,
  recipes,
  totalPages,
  totalRecipeCount
}: {
  currentPage: number;
  isAddToMealPlanPending: boolean;
  onEditRecipe: (recipe: Recipe) => void;
  onMealPlanRecipeToggle: (recipe: Pick<Recipe, 'id' | 'title'>) => void;
  onPageChange: (nextPage: number) => void;
  recipePageState?: RecipePageLocationState;
  recipes: Recipe[];
  totalPages: number;
  totalRecipeCount: number;
}) {
  const [activeRecipeMenuId, setActiveRecipeMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (
      activeRecipeMenuId !== null &&
      !recipes.some((recipe) => recipe.id === activeRecipeMenuId)
    ) {
      setActiveRecipeMenuId(null);
    }
  }, [activeRecipeMenuId, recipes]);

  useEffect(() => {
    if (activeRecipeMenuId === null) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest('[data-recipe-card-menu="true"]')
      ) {
        return;
      }

      setActiveRecipeMenuId(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveRecipeMenuId(null);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeRecipeMenuId]);

  if (totalRecipeCount === 0) {
    const emptyStateTitle = 'No recipes found';
    const emptyStateMessage =
      'Try a different title or ingredient, or broaden your filters.';

    return (
      <EmptyStateCard
        title={emptyStateTitle}
        description={emptyStateMessage}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col pb-12 min-[720px]:pb-16">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4 min-[720px]:gap-5">
        {recipes.map((recipe) => {
          const isRecipeMenuOpen = activeRecipeMenuId === recipe.id;

          return (
            <RecipeCard
              key={recipe.id}
              className={homePageRecipeCardClass}
              action={
                <HomePageRecipeCardMenu
                  isAddToMealPlanDisabled={isAddToMealPlanPending}
                  isOpen={isRecipeMenuOpen}
                  onAddToMealPlan={() => {
                    onMealPlanRecipeToggle(recipe);
                  }}
                  onClose={() => {
                    setActiveRecipeMenuId(null);
                  }}
                  onEdit={() => {
                    onEditRecipe(recipe);
                  }}
                  onToggle={() => {
                    setActiveRecipeMenuId((currentRecipeMenuId) =>
                      currentRecipeMenuId === recipe.id ? null : recipe.id
                    );
                  }}
                  recipe={recipe}
                />
              }
              recipe={recipe}
              state={recipePageState}
              to={getRecipeRoutePath(recipe.id)}
            />
          );
        })}
      </div>

      <HomePageRecipePagination
        currentPage={currentPage}
        onPageChange={onPageChange}
        totalPages={totalPages}
      />
    </div>
  );
}
