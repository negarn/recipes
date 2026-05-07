import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';
import { MealPlanPickerDialog } from '../components/MealPlanPickerDialog';
import { MealPlanPageSkeleton } from '../components/MealPlanPageSkeleton';
import {
  EmptyStateCard,
  ErrorPillMessage
} from '../components/PageStatusMessage';
import { PageNavigationControls } from '../components/PageNavigationControls';
import { MealPlanRecipeDaySection } from '../components/MealPlanRecipeDaySection';
import { MealPlanRecipeRowActions } from '../components/MealPlanRecipeRowActions';
import { TabbedPageHeader } from '../components/TabbedPageHeader';
import { TabbedPanelLayout } from '../components/TabbedPanelLayout';
import {
  useMealPlanDataContext,
  useRecipeCatalogContext
} from '../contexts/RecipeAppDataContext';
import { appRoutePaths } from '../helpers/appRoutes';
import {
  createCookedHistoryRecipePageState,
  createMealPlanRecipePageState
} from '../helpers/recipePageNavigation';
import { useMealPlanPageState } from '../hooks/useMealPlanPageState';

type PendingMealPlanRemoval = {
  currentDate: string;
  entryIndex: number;
  recipeTitle: string;
} | null;

export function MealPlanPage() {
  const location = useLocation();
  const [pendingMealPlanRemoval, setPendingMealPlanRemoval] =
    useState<PendingMealPlanRemoval>(null);
  const { getRecipeById, hasLoadedRecipes } = useRecipeCatalogContext();
  const {
    cookedMealHistory,
    handleMealPlanRecipeDateChange,
    handleMealPlanRecipeMarkCooked,
    handleMealPlanRecipeRemove,
    mealPlan
  } = useMealPlanDataContext();
  const {
    activeMealPlanEntry,
    activeTab,
    clearMealPlanPageError,
    cookedHistoryMonthLabel,
    cookedHistoryPage,
    dialogProps,
    isMealPlanUpdatePending,
    markPlannedMealAsCooked,
    mealPlanDays,
    mealPlanPageError,
    openMealPlanDateDialog,
    pagedCookedMealDays,
    removePlannedMeal,
    totalCookedHistoryPages,
    updateCookedHistoryPage
  } = useMealPlanPageState({
    cookedMealHistory,
    getRecipeById,
    mealPlan,
    onMealPlanRecipeDateChange: handleMealPlanRecipeDateChange,
    onMealPlanRecipeMarkCooked: handleMealPlanRecipeMarkCooked,
    onMealPlanRecipeRemove: handleMealPlanRecipeRemove
  });
  const cookedHistoryBackLinkPath = `${appRoutePaths.mealPlan}${location.search}`;
  const cookedHistoryMonthLabelSeparatorIndex = cookedHistoryMonthLabel?.lastIndexOf(' ') ?? -1;
  const cookedHistoryMonthText =
    cookedHistoryMonthLabelSeparatorIndex > 0
      ? cookedHistoryMonthLabel?.slice(0, cookedHistoryMonthLabelSeparatorIndex)
      : cookedHistoryMonthLabel;
  const cookedHistoryYearText =
    cookedHistoryMonthLabelSeparatorIndex > 0
      ? cookedHistoryMonthLabel?.slice(cookedHistoryMonthLabelSeparatorIndex + 1)
      : null;
  const emptyPlanState = (
    <EmptyStateCard
      title="No meals planned yet"
      description="Add recipes from Home to start building your meal plan."
    />
  );
  const emptyHistoryState = (
    <EmptyStateCard
      title="No cooked meals yet"
      description="Mark meals as cooked to build your history."
    />
  );

  async function confirmPendingMealPlanRemoval() {
    if (!pendingMealPlanRemoval) {
      return;
    }

    const wasRemoved = await removePlannedMeal(
      pendingMealPlanRemoval.currentDate,
      pendingMealPlanRemoval.entryIndex
    );

    if (wasRemoved) {
      setPendingMealPlanRemoval(null);
    }
  }

  return (
    <TabbedPanelLayout backgroundVariant="default">
      <TabbedPageHeader title={activeTab === 'history' ? 'Cooked history' : 'Meal plan'} />

      {mealPlanPageError && !activeMealPlanEntry ? (
        <ErrorPillMessage className="mb-4">
          {mealPlanPageError}
        </ErrorPillMessage>
      ) : null}

      <div className="grid min-w-0 gap-4">
        {!hasLoadedRecipes ? (
          <MealPlanPageSkeleton tab={activeTab} />
        ) : activeTab === 'plan' ? (
          mealPlanDays.length ? (
            mealPlanDays.map(({ date, recipes }) => (
              <MealPlanRecipeDaySection
                key={date}
                date={date}
                recipes={recipes}
                tone="plan"
                createRecipeState={({ entryIndex, recipe }) =>
                  createMealPlanRecipePageState(date, entryIndex, recipe.id)
                }
                renderActions={({ entryIndex, recipe }, formattedRecipeTitle) => (
                  <MealPlanRecipeRowActions
                    formattedRecipeTitle={formattedRecipeTitle}
                    isPending={isMealPlanUpdatePending}
                    onMarkAsCooked={() => {
                      void markPlannedMealAsCooked(date, entryIndex, recipe.id);
                    }}
                    onChangeDate={() => {
                      openMealPlanDateDialog(
                        date,
                        entryIndex,
                        formattedRecipeTitle
                      );
                    }}
                    onRemove={() => {
                      clearMealPlanPageError();
                      setPendingMealPlanRemoval({
                        currentDate: date,
                        entryIndex,
                        recipeTitle: formattedRecipeTitle
                      });
                    }}
                  />
                )}
              />
            ))
          ) : (
            emptyPlanState
          )
        ) : pagedCookedMealDays.length ? (
          <div className="grid gap-4 pb-12 min-[720px]:pb-16">
            {pagedCookedMealDays.map(({ date, recipes }) => (
              <MealPlanRecipeDaySection
                key={date}
                date={date}
                recipes={recipes}
                tone="plan"
                createRecipeState={() =>
                  createCookedHistoryRecipePageState(cookedHistoryBackLinkPath)
                }
              />
            ))}

            {cookedHistoryMonthLabel ? (
              <PageNavigationControls
                ariaLabel="Cooked history pages"
                onPrevious={() => {
                  updateCookedHistoryPage(cookedHistoryPage - 1);
                }}
                isPreviousDisabled={cookedHistoryPage === 1}
                onNext={() => {
                  updateCookedHistoryPage(cookedHistoryPage + 1);
                }}
                isNextDisabled={cookedHistoryPage === totalCookedHistoryPages}
              >
                <p className="m-0 text-[0.92rem] font-semibold text-app-muted">
                  {cookedHistoryMonthText ? (
                    <strong className="text-app-ink">{cookedHistoryMonthText}</strong>
                  ) : null}
                  {cookedHistoryYearText ? ` ${cookedHistoryYearText}` : null}
                </p>
              </PageNavigationControls>
            ) : null}
          </div>
        ) : (
          emptyHistoryState
        )}
      </div>

      {activeMealPlanEntry && dialogProps ? <MealPlanPickerDialog {...dialogProps} /> : null}
      {pendingMealPlanRemoval ? (
        <DeleteConfirmationDialog
          headerLabel="Remove from meal plan"
          title={`Remove ${pendingMealPlanRemoval.recipeTitle}?`}
          description={
            <>
              This will remove <strong>{pendingMealPlanRemoval.recipeTitle}</strong> from your meal
              plan.
            </>
          }
          errorMessage={mealPlanPageError}
          isBusy={isMealPlanUpdatePending}
          confirmLabel="Remove meal"
          busyLabel="Removing..."
          onCancel={() => {
            setPendingMealPlanRemoval(null);
          }}
          onConfirm={() => {
            void confirmPendingMealPlanRemoval();
          }}
        />
      ) : null}
    </TabbedPanelLayout>
  );
}
