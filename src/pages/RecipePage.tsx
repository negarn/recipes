import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent
} from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { RecipeBookmarkComposerDialog } from '../components/RecipeBookmarkComposerDialog';
import { MealPlanPickerDialog } from '../components/MealPlanPickerDialog';
import { RecipeIngredientsCard } from '../components/RecipeIngredientsCard';
import { RecipeMethodSectionCard } from '../components/RecipeMethodSectionCard';
import { RecipeNotesCard } from '../components/RecipeNotesCard';
import { RecipeSelectionBookmarkPopover } from '../components/RecipeSelectionBookmarkPopover';
import { RecipeNotFoundState } from '../components/RecipeNotFoundState';
import { RecipeNutritionCard } from '../components/RecipeNutritionCard';
import { RecipePageHeader } from '../components/RecipePageHeader';
import { RecipePageSkeleton } from '../components/RecipePageSkeleton';
import {
  useMealPlanDataContext,
  useRecipeCatalogContext,
  useRecipePreferencesContext,
  useRecipeRatingsContext
} from '../contexts/RecipeAppDataContext';
import { appRoutePaths } from '../helpers/appRoutes';
import { readRecipePageLocationState } from '../helpers/recipePageNavigation';
import {
  applyRecipeRating,
  getRecipeServingDetails
} from '../helpers/recipeMetadata';
import { getTodayMealPlanDateString } from '../helpers/mealPlanData';
import {
  DEFAULT_RECIPE_SERVING_SIZE,
  normalizeRecipeNoteText
} from '../helpers/recipePreferenceData';
import { createBookmarkLabelSuggestion } from '../helpers/bookmarkText';
import {
  deriveBookmarkLineTimersFromSelection,
  setBookmarkLineTimersForBookmark
} from '../helpers/bookmarkTimers';
import { scrollToPageTop } from '../helpers/scrollPosition';
import { pageShellClass } from '../helpers/uiClasses';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useAsyncActionGroup } from '../hooks/useAsyncActionGroup';
import { useAddToMealPlanDialog } from '../hooks/useAddToMealPlanDialog';
import { useRecipeMethodTracking } from '../hooks/useRecipeMethodTracking';
import {
  useRecipeTextSelection,
  type TextSelectionState
} from '../hooks/useRecipeTextSelection';
import { useSyncedDraftState } from '../hooks/useSyncedDraftState';
import type { MealPlanMap, RecipePageMealPlanEntry } from '../types/app';

function resolveMealPlanEntry(
  mealPlan: MealPlanMap,
  mealPlanEntry: RecipePageMealPlanEntry | null,
  recipeId: string | undefined
) {
  if (!mealPlanEntry || mealPlanEntry.recipeId !== recipeId) {
    return null;
  }

  const datedRecipeIds = mealPlan[mealPlanEntry.currentDate];

  return datedRecipeIds?.[mealPlanEntry.entryIndex] === mealPlanEntry.recipeId
    ? mealPlanEntry
    : null;
}

export function RecipePage() {
  const { getRecipeById, hasLoadedRecipes } = useRecipeCatalogContext();
  const navigate = useNavigate();
  const {
    handleMealPlanRecipeAdd: onMealPlanRecipeAdd,
    handleMealPlanRecipeMarkCooked: onMealPlanRecipeMarkCooked,
    handleRecipeMarkCooked: onRecipeMarkCooked,
    mealPlan
  } = useMealPlanDataContext();
  const {
    handleRecipeRatingChange: onRatingChange,
    recipeRatings
  } = useRecipeRatingsContext();
  const {
    handleRecipeBookmarkAdd: onBookmarkAdd,
    handleRecipeNoteChange: onNoteChange,
    handleRecipeServingChange: onServingChange,
    recipeNotes,
    recipeServings,
    recipeSettings
  } = useRecipePreferencesContext();
  const location = useLocation();
  const { recipeId } = useParams();
  const locationState = readRecipePageLocationState(location.state);
  const baseRecipe = recipeId ? getRecipeById(recipeId) : undefined;
  const recipe = baseRecipe ? applyRecipeRating(baseRecipe, recipeRatings) : undefined;
  const { defaultServingCount, servingCount: persistedServingCount } = recipe
      ? getRecipeServingDetails(recipe, recipeServings, recipeSettings)
      : {
          defaultServingCount: DEFAULT_RECIPE_SERVING_SIZE,
          servingCount: DEFAULT_RECIPE_SERVING_SIZE
        };
  const persistedNote = recipe ? recipeNotes[recipe.id] ?? '' : '';
  const [servingCount, setServingCount] = useSyncedDraftState(
    persistedServingCount,
    recipeId
  );
  const [noteDraft, setNoteDraft] = useSyncedDraftState(persistedNote, recipeId);
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);
  const [bookmarkComposerSelection, setBookmarkComposerSelection] =
    useState<TextSelectionState | null>(null);
  const recipeDetailsRef = useRef<HTMLElement | null>(null);
  const servingAction = useAsyncAction();
  const ratingAction = useAsyncAction();
  const noteAction = useAsyncAction();
  const bookmarkAction = useAsyncAction();
  const addToMealPlan = useAddToMealPlanDialog(onMealPlanRecipeAdd);
  const markAsCookedAction = useAsyncAction();
  const recipeMutationActions = useAsyncActionGroup([
    servingAction,
    ratingAction,
    noteAction,
    bookmarkAction,
    markAsCookedAction
  ]);
  const {
    clearSelection: clearRecipeDetailsSelection,
    selection: recipeDetailsSelection,
    selectionRef: recipeDetailsSelectionRef
  } = useRecipeTextSelection(recipeDetailsRef);
  const {
    activeStepTimers,
    clearStepTimer,
    completedMethodSteps,
    resetMethodTracking,
    startStepTimer,
    timerNow,
    toggleMethodStep
  } = useRecipeMethodTracking(recipe ?? null);
  const normalizedNoteDraft = normalizeRecipeNoteText(noteDraft);
  const isNoteDirty = normalizedNoteDraft !== persistedNote;
  const locationMealPlanEntry = locationState?.mealPlanEntry;
  const linkedLocationMealPlanEntry =
    locationMealPlanEntry && locationMealPlanEntry.recipeId === recipeId
      ? locationMealPlanEntry
      : null;
  const hasMealPlanBackLink = linkedLocationMealPlanEntry !== null;
  const linkedMealPlanEntry = resolveMealPlanEntry(
    mealPlan,
    linkedLocationMealPlanEntry,
    recipeId
  );
  const backLinkTo =
    locationState?.backLink?.to ??
    (hasMealPlanBackLink ? appRoutePaths.mealPlan : appRoutePaths.home);
  const backLinkLabel =
    locationState?.backLink?.label ??
    (hasMealPlanBackLink ? 'Back to meal plan' : 'Back to recipes');
  const cookSectionActionLabel = markAsCookedAction.isPending
    ? 'Marking...'
    : 'Mark as cooked';
  const isCookSectionActionDisabled = markAsCookedAction.isPending;

  useLayoutEffect(() => {
    scrollToPageTop();
  }, [recipeId]);

  useEffect(() => {
    recipeMutationActions.resetAll();
    addToMealPlan.reset();
    setNoteFeedback(null);
    setBookmarkComposerSelection(null);
    clearRecipeDetailsSelection();
  }, [recipeId]);

  if (!recipeId) {
    return <Navigate to={appRoutePaths.home} replace />;
  }

  if (!hasLoadedRecipes) {
    return <RecipePageSkeleton />;
  }

  if (!recipe) {
    return <RecipeNotFoundState backLinkLabel={backLinkLabel} backLinkTo={backLinkTo} />;
  }

  const currentRecipe = recipe;
  const hasCookSection = currentRecipe.sections.some((section) => section.id === 'cook');

  function handleRatingChange(nextRating: number) {
    void ratingAction.run(
      () => onRatingChange(currentRecipe.id, nextRating),
      'Could not save that rating.'
    );
  }

  function handleServingCountChange(nextServingCount: number) {
    if (nextServingCount === servingCount) {
      return;
    }

    setServingCount(nextServingCount);

    void servingAction.run(
      () => onServingChange(currentRecipe.id, nextServingCount),
      'Could not save servings.',
      {
        onError: () => {
          setServingCount(persistedServingCount);
        }
      }
    );
  }

  function handleNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isNoteDirty) {
      return;
    }

    const nextNote = normalizedNoteDraft;

    setNoteFeedback(null);

    void noteAction.run(
      () => onNoteChange(currentRecipe.id, nextNote),
      'Could not save notes.',
      {
        onSuccess: () => {
          setNoteDraft(nextNote);
          setNoteFeedback(nextNote ? 'Notes saved.' : 'Notes cleared.');
        }
      }
    );
  }

  function closeBookmarkComposer() {
    if (bookmarkAction.isPending) {
      return;
    }

    bookmarkAction.reset();
    setBookmarkComposerSelection(null);
    clearRecipeDetailsSelection();
  }

  function openBookmarkComposer() {
    const currentSelection = recipeDetailsSelectionRef.current;

    if (!currentSelection) {
      return;
    }

    bookmarkAction.clearError();
    setBookmarkComposerSelection(currentSelection);
    clearRecipeDetailsSelection();
  }

  function handleBookmarkSubmit(label: string) {
    if (!bookmarkComposerSelection) {
      return;
    }

    bookmarkAction.clearError();

    void bookmarkAction.run(
      async () => {
        const bookmarkId = await onBookmarkAdd(currentRecipe.id, {
          label,
          text: bookmarkComposerSelection.text
        });
        const carryOverTimers = deriveBookmarkLineTimersFromSelection({
          activeStepTimers,
          defaultServingCount,
          recipe: currentRecipe,
          selectionText: bookmarkComposerSelection.text,
          servingCount
        });

        if (bookmarkId && Object.keys(carryOverTimers).length) {
          setBookmarkLineTimersForBookmark(bookmarkId, carryOverTimers);
        }
      },
      'Could not save bookmark.',
      {
        onSuccess: () => {
          setBookmarkComposerSelection(null);
          clearRecipeDetailsSelection();
        }
      }
    );
  }

  function handleMarkAsCooked() {
    markAsCookedAction.clearError();

    void markAsCookedAction.run(
      () => {
        if (linkedMealPlanEntry) {
          return onMealPlanRecipeMarkCooked(
            linkedMealPlanEntry.currentDate,
            linkedMealPlanEntry.entryIndex
          );
        }

        return onRecipeMarkCooked(currentRecipe.id, getTodayMealPlanDateString());
      },
      'Could not update the cooked meal history.',
      {
        onSuccess: () => {
          resetMethodTracking();
        }
      }
    );
  }

  function openMealPlanDialog() {
    addToMealPlan.open({
      recipeId: currentRecipe.id,
      recipeTitle: currentRecipe.title
    });
  }

  function handleRecipeEdit() {
    navigate(appRoutePaths.home, {
      state: {
        editRecipeId: currentRecipe.id
      }
    });
  }

  return (
    <div className={pageShellClass}>
      <main className="grid gap-4 min-[720px]:gap-6">
        <RecipePageHeader
          backLinkLabel={backLinkLabel}
          backLinkTo={backLinkTo}
          isAddToMealPlanDisabled={addToMealPlan.action.isPending}
          isRatingDisabled={ratingAction.isPending}
          onAddToMealPlanOpen={openMealPlanDialog}
          onEdit={handleRecipeEdit}
          onRatingChange={handleRatingChange}
          ratingError={ratingAction.error}
          recipe={recipe}
        />

        {addToMealPlan.dialogProps ? (
          <MealPlanPickerDialog {...addToMealPlan.dialogProps} />
        ) : null}

        {bookmarkComposerSelection ? (
          <RecipeBookmarkComposerDialog
            errorMessage={bookmarkAction.error}
            initialLabel={createBookmarkLabelSuggestion(bookmarkComposerSelection.text)}
            isSaving={bookmarkAction.isPending}
            onClose={closeBookmarkComposer}
            onSave={handleBookmarkSubmit}
            selectedText={bookmarkComposerSelection.text}
          />
        ) : null}

        {!bookmarkComposerSelection ? (
          <RecipeSelectionBookmarkPopover
            onBookmark={openBookmarkComposer}
            selection={recipeDetailsSelection}
          />
        ) : null}

        <section
          ref={recipeDetailsRef}
          className="grid gap-4 min-[720px]:gap-6 min-[900px]:grid-cols-[minmax(22rem,29rem)_minmax(0,1fr)]"
        >
          <div className="flex min-w-0 flex-col gap-4 min-[720px]:gap-6">
            <RecipeIngredientsCard
              defaultServingCount={defaultServingCount}
              errorMessage={servingAction.error}
              isSaving={servingAction.isPending}
              onServingCountChange={handleServingCountChange}
              recipe={recipe}
              servingCount={servingCount}
            />

            <div className="hidden min-[900px]:block">
              <RecipeNutritionCard nutrition={recipe.nutrition} />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4 min-[720px]:gap-6">
            {recipe.sections.map((section) => (
              <div key={section.id} className="grid min-w-0 gap-4 min-[720px]:gap-6">
                <RecipeMethodSectionCard
                  activeStepTimers={activeStepTimers}
                  completedMethodSteps={completedMethodSteps}
                  defaultServingCount={defaultServingCount}
                  isMarkAsCookedDisabled={isCookSectionActionDisabled}
                  markAsCookedError={
                    section.id === 'cook' ? markAsCookedAction.error : null
                  }
                  markAsCookedLabel={cookSectionActionLabel}
                  onMarkAsCooked={handleMarkAsCooked}
                  onMethodStepToggle={toggleMethodStep}
                  onStepTimerClear={clearStepTimer}
                  onStepTimerStart={startStepTimer}
                  recipe={recipe}
                  section={section}
                  servingCount={servingCount}
                  timerNow={timerNow}
                />
                {section.id === 'cook' ? (
                  <div className="min-w-0 min-[900px]:hidden">
                    <RecipeNutritionCard nutrition={recipe.nutrition} />
                  </div>
                ) : null}
              </div>
            ))}

            {!hasCookSection ? (
              <div className="min-w-0 min-[900px]:hidden">
                <RecipeNutritionCard nutrition={recipe.nutrition} />
              </div>
            ) : null}

            <RecipeNotesCard
              errorMessage={noteAction.error}
              feedbackMessage={noteFeedback}
              isNoteDirty={isNoteDirty}
              isSaving={noteAction.isPending}
              noteDraft={noteDraft}
              onNoteChange={(nextNote) => {
                setNoteDraft(nextNote);
                noteAction.clearError();
                setNoteFeedback(null);
              }}
              onSubmit={handleNoteSubmit}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
