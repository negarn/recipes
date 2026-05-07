import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MealPlanPickerDialog } from '../components/MealPlanPickerDialog';
import { HomePageAudienceTabs } from '../components/HomePageAudienceTabs';
import { HomePageRecipeListSection } from '../components/HomePageRecipeListSection';
import { HomePageRecipeSkeletonGrid } from '../components/HomePageRecipeSkeletonGrid';
import { HomePageSearchField } from '../components/HomePageSearchField';
import { MobileNavigationTrigger } from '../components/MobileNavigationTrigger';
import {
  RecipeCreateForm,
  createRecipeCreateFormInitialValues,
  type RecipeCreatePayload
} from '../components/RecipeCreateForm';
import { TabbedPanelLayout } from '../components/TabbedPanelLayout';
import { PlusIcon } from '../components/PlusIcon';
import {
  useRecipeCatalogContext,
  useMealPlanDataContext,
  useRecipePreferencesContext,
  useRecipeRatingsContext
} from '../contexts/RecipeAppDataContext';
import {
  createIngredientAmountFromText,
  createUniqueRecipeId
} from '../helpers/customRecipes';
import { getRecipeRoutePath } from '../helpers/appRoutes';
import { useAddToMealPlanDialog } from '../hooks/useAddToMealPlanDialog';
import { useHomePageRecipeList } from '../hooks/useHomePageRecipeList';
import { createHomeRecipePageState } from '../helpers/recipePageNavigation';
import { scrollToPageTop } from '../helpers/scrollPosition';
import {
  cn,
  elevatedBrandIconActionButtonClass,
  pageTitleClass
} from '../helpers/uiClasses';
import { useAsyncAction } from '../hooks/useAsyncAction';
import type { Recipe } from '../types/recipe';

function createIdSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createRecipeFromPayload(payload: RecipeCreatePayload, recipeId: string) {
  const ingredientIds = new Set<string>();

  const ingredients = payload.ingredients.map((ingredient, ingredientIndex) => {
    const baseIngredientId = createIdSlug(ingredient.name) || `ingredient-${ingredientIndex + 1}`;
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
    ],
    tags: payload.tags,
    title: payload.title,
    totalTime: payload.totalTime
  } satisfies Recipe;
}

function createRecipeFromPayloadWithUniqueId(payload: RecipeCreatePayload, recipeIds: string[]) {
  return createRecipeFromPayload(payload, createUniqueRecipeId(payload.title, recipeIds));
}

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleRecipeAdd, hasLoadedRecipes, recipes } = useRecipeCatalogContext();
  const { handleMealPlanRecipeAdd } = useMealPlanDataContext();
  const {
    handleRecipeNoteChange,
    handleRecipeServingChange,
    recipeNotes,
    recipeServings
  } = useRecipePreferencesContext();
  const {
    hasResolvedRecipeRatings,
    handleRecipeRatingChange,
    recipeRatings
  } = useRecipeRatingsContext();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const previousPageRef = useRef<number | null>(null);
  const recipeFormId = useId();
  const [recipeFormState, setRecipeFormState] = useState<
    | {
        mode: 'add';
        recipe: null;
      }
    | {
        mode: 'edit';
        recipe: Recipe;
      }
    | null
  >(null);
  const recipeCreateAction = useAsyncAction();
  const addToMealPlan = useAddToMealPlanDialog(handleMealPlanRecipeAdd);
  const {
    audience,
    clearSearchQuery,
    currentPage,
    filteredRecipeCount,
    hasSearchQuery,
    paginatedRecipes,
    query,
    totalPages,
    updateAudience,
    updateCurrentPage,
    updateSearchQuery
  } = useHomePageRecipeList(recipes, recipeRatings, {
    shouldNormalizeSearchParams: hasLoadedRecipes && hasResolvedRecipeRatings
  });
  const activeMealPlanRecipeId = addToMealPlan.selectedRecipe?.recipeId ?? null;
  const recipePageState = createHomeRecipePageState(`${location.pathname}${location.search}`);
  const isRecipeFormOpen = recipeFormState !== null;
  const recipeFormInitialValues = recipeFormState
    ? createRecipeCreateFormInitialValues(recipeFormState.recipe ?? undefined, {
        note:
          recipeFormState.recipe !== null
            ? recipeNotes[recipeFormState.recipe.id] ?? ''
            : '',
        servings:
          recipeFormState.recipe !== null
            ? recipeServings[recipeFormState.recipe.id] ?? recipeFormState.recipe.defaultServings
            : undefined
      })
    : createRecipeCreateFormInitialValues();
  const recipeFormSubmitLabel =
    recipeFormState?.mode === 'edit' ? 'Update recipe' : 'Add recipe';
  const recipeFormSavingLabel =
    recipeFormState?.mode === 'edit' ? 'Updating recipe...' : 'Adding recipe...';
  const recipeFormCloseLabel =
    recipeFormState?.mode === 'edit'
      ? 'Close edit recipe form'
      : 'Close add recipe form';

  function handleSearchClear() {
    clearSearchQuery();
    searchInputRef.current?.blur();
  }

  function hideRecipeForm() {
    if (recipeCreateAction.isPending) {
      return;
    }

    recipeCreateAction.reset();
    setRecipeFormState(null);
  }

  function openRecipeForm(nextState: NonNullable<typeof recipeFormState>) {
    recipeCreateAction.clearError();
    addToMealPlan.close();
    setRecipeFormState(nextState);
    scrollToPageTop();
  }

  function showRecipeForm() {
    openRecipeForm({ mode: 'add', recipe: null });
  }

  function showEditRecipeForm(recipe: Recipe) {
    openRecipeForm({ mode: 'edit', recipe });
  }

  function handleRecipeFormSubmit(payload: RecipeCreatePayload) {
    const nextRecipe =
      recipeFormState?.mode === 'edit' && recipeFormState.recipe !== null
        ? createRecipeFromPayload(payload, recipeFormState.recipe.id)
        : createRecipeFromPayloadWithUniqueId(
            payload,
            recipes.map((recipe) => recipe.id)
          );

    void recipeCreateAction.run(
      async () => {
        await handleRecipeAdd(nextRecipe);
        if (recipeFormState?.mode === 'edit') {
          await handleRecipeRatingChange(nextRecipe.id, payload.rating ?? null);
          await handleRecipeServingChange(nextRecipe.id, payload.servings);
          await handleRecipeNoteChange(nextRecipe.id, payload.note);
        } else {
          await handleRecipeServingChange(nextRecipe.id, payload.servings);

          if (payload.note) {
            await handleRecipeNoteChange(nextRecipe.id, payload.note);
          }
        }
      },
      'Could not save recipe.',
      {
        onSuccess: () => {
          setRecipeFormState(null);
          navigate(getRecipeRoutePath(nextRecipe.id), {
            state: recipePageState
          });
        }
      }
    );
  }

  function handleMealPlanRecipeToggle(recipe: {
    id: string;
    title: string;
  }) {
    if (activeMealPlanRecipeId === recipe.id) {
      addToMealPlan.close();
      return;
    }

    addToMealPlan.open({
      recipeId: recipe.id,
      recipeTitle: recipe.title
    });
  }

  useEffect(() => {
    if (previousPageRef.current === null) {
      previousPageRef.current = currentPage;
      return;
    }

    if (previousPageRef.current !== currentPage) {
      scrollToPageTop();
      previousPageRef.current = currentPage;
    }
  }, [currentPage]);

  return (
    <TabbedPanelLayout backgroundVariant="default">
      <header className="mb-6 min-[900px]:mb-8">
        <div className="flex flex-col gap-3 min-[900px]:flex-row min-[900px]:items-start">
          <div className="flex items-center justify-between gap-3 min-[900px]:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <MobileNavigationTrigger className="min-[720px]:hidden" />
              <h1 className={pageTitleClass}>Recipes</h1>
            </div>
            {!isRecipeFormOpen ? (
              <button
                type="button"
                className={cn(
                  elevatedBrandIconActionButtonClass,
                  'min-[900px]:mt-[0.6rem] size-[1.85rem] shrink-0 min-[900px]:size-[2.1rem]'
                )}
                onClick={showRecipeForm}
                aria-label="Add a recipe"
                aria-controls={recipeFormId}
              >
                <PlusIcon className="size-[1.34rem] min-[900px]:size-[1.62rem]" />
              </button>
            ) : null}
          </div>
          <div className="flex w-full min-w-0 flex-col gap-3 min-[900px]:ml-auto min-[900px]:w-auto min-[900px]:flex-row min-[900px]:items-center">
            <HomePageAudienceTabs audience={audience} onAudienceChange={updateAudience} />
            <HomePageSearchField
              hasSearchQuery={hasSearchQuery}
              inputRef={searchInputRef}
              onClear={handleSearchClear}
              onQueryChange={updateSearchQuery}
              query={query}
            />
          </div>
        </div>
      </header>

      {recipeFormState ? (
        <RecipeCreateForm
          errorMessage={recipeCreateAction.error}
          initialValues={recipeFormInitialValues}
          formId={recipeFormId}
          isSaving={recipeCreateAction.isPending}
          savingLabel={recipeFormSavingLabel}
          closeLabel={recipeFormCloseLabel}
          submitLabel={recipeFormSubmitLabel}
          onClose={hideRecipeForm}
          onSubmit={handleRecipeFormSubmit}
          key={`${recipeFormState.mode}-${recipeFormState.recipe?.id ?? 'new'}`}
        />
      ) : null}

      {!hasLoadedRecipes || !hasResolvedRecipeRatings ? (
        <HomePageRecipeSkeletonGrid />
      ) : (
        <HomePageRecipeListSection
          currentPage={currentPage}
          isAddToMealPlanPending={addToMealPlan.action.isPending}
          onEditRecipe={showEditRecipeForm}
          onMealPlanRecipeToggle={handleMealPlanRecipeToggle}
          onPageChange={updateCurrentPage}
          recipePageState={recipePageState}
          recipes={paginatedRecipes}
          totalPages={totalPages}
          totalRecipeCount={filteredRecipeCount}
        />
      )}

      {addToMealPlan.dialogProps ? <MealPlanPickerDialog {...addToMealPlan.dialogProps} /> : null}
    </TabbedPanelLayout>
  );
}
