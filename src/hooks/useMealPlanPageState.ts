import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clearRecipeMethodTracking } from '../helpers/browserStorage';
import {
  createCookedHistorySearchParams,
  readCookedHistoryPage,
  readCookedHistoryRawPageParam
} from '../helpers/cookedHistorySearchParams';
import { formatMealPlanMonthLabel, parseLocalDateString } from '../helpers/mealPlan';
import { readMealPlanTab } from '../helpers/appRoutes';
import { getTodayMealPlanDateString } from '../helpers/mealPlanData';
import { useAsyncAction } from './useAsyncAction';
import { useAsyncActionGroup } from './useAsyncActionGroup';
import { useMealPlanPickerDialog } from './useMealPlanPickerDialog';
import { useMealPlanRecipeGroups } from './useMealPlanRecipeGroups';
import type { CookedMealHistoryMap, MealPlanMap } from '../types/app';
import type { Recipe } from '../types/recipe';
import type { DatedRecipeGroup } from './useMealPlanRecipeGroups';

type ActiveMealPlanEntry = {
  currentDate: string;
  entryIndex: number;
  recipeTitle: string;
};

const DEFAULT_MEAL_PLAN_ERROR_MESSAGE = 'Could not update meal plan.';
const COOKED_HISTORY_ERROR_MESSAGE = 'Could not update cooked meal history.';
const EARLIEST_COOKED_HISTORY_DATE = '1900-01-01';

type CookedHistoryMonthPage = {
  dateLabel: string;
  days: DatedRecipeGroup[];
  monthKey: string;
};

function formatCookedHistoryMonthLabel(monthKey: string) {
  const [yearLabel, monthLabel] = monthKey.split('-');
  const year = Number(yearLabel);
  const month = Number(monthLabel);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return monthKey;
  }

  return formatMealPlanMonthLabel(new Date(year, month - 1, 1));
}

function getCookedHistoryMonthPages(cookedMealDays: DatedRecipeGroup[]) {
  return cookedMealDays.reduce<CookedHistoryMonthPage[]>((monthPages, dayGroup) => {
    const monthKey = dayGroup.date.slice(0, 7);
    const previousMonthPage = monthPages[monthPages.length - 1];

    if (previousMonthPage?.monthKey === monthKey) {
      previousMonthPage.days.push(dayGroup);
      return monthPages;
    }

    monthPages.push({
      dateLabel: formatCookedHistoryMonthLabel(monthKey),
      days: [dayGroup],
      monthKey
    });

    return monthPages;
  }, []);
}

export function useMealPlanPageState({
  cookedMealHistory,
  getRecipeById,
  mealPlan,
  onCookedMealDateChange,
  onCookedMealRemove,
  onMealPlanRecipeDateChange,
  onMealPlanRecipeMarkCooked,
  onMealPlanRecipeRemove
}: {
  cookedMealHistory: CookedMealHistoryMap;
  getRecipeById: (recipeId: string) => Recipe | undefined;
  mealPlan: MealPlanMap;
  onCookedMealDateChange: (
    currentDate: string,
    entryIndex: number,
    nextDate: string
  ) => Promise<void>;
  onCookedMealRemove: (currentDate: string, entryIndex: number) => Promise<void>;
  onMealPlanRecipeDateChange: (
    currentDate: string,
    entryIndex: number,
    nextDate: string
  ) => Promise<void>;
  onMealPlanRecipeMarkCooked: (currentDate: string, entryIndex: number) => Promise<void>;
  onMealPlanRecipeRemove: (currentDate: string, entryIndex: number) => Promise<void>;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = readMealPlanTab(searchParams);
  const { cookedMealDays, mealPlanDays } = useMealPlanRecipeGroups(
    mealPlan,
    cookedMealHistory,
    getRecipeById
  );
  const cookedHistoryMonthPages = useMemo(
    () => getCookedHistoryMonthPages(cookedMealDays),
    [cookedMealDays]
  );
  const totalCookedHistoryPages = Math.max(1, cookedHistoryMonthPages.length);
  const searchParamCookedHistoryPage = readCookedHistoryPage(searchParams);
  const cookedHistoryPage = Math.min(
    searchParamCookedHistoryPage ?? 1,
    totalCookedHistoryPages
  );
  const activeCookedHistoryMonthPage = cookedHistoryMonthPages[cookedHistoryPage - 1] ?? null;
  const pagedCookedMealDays = activeCookedHistoryMonthPage?.days ?? [];
  const removeMealPlanEntryAction = useAsyncAction();
  const markMealPlanEntryAsCookedAction = useAsyncAction();
  const removeCookedMealHistoryEntryAction = useAsyncAction();
  const mealPlanDateDialog = useMealPlanPickerDialog<ActiveMealPlanEntry>({
    dateActionLabelPrefix: 'Change to',
    errorMessage: DEFAULT_MEAL_PLAN_ERROR_MESSAGE,
    formatTitle: (selection) => selection.recipeTitle,
    headerLabel: 'Change Meal Date',
    minDate: getTodayMealPlanDateString(),
    onSelectDate: (selection, nextDate) =>
      onMealPlanRecipeDateChange(selection.currentDate, selection.entryIndex, nextDate)
  });
  const cookedHistoryDateDialog = useMealPlanPickerDialog<ActiveMealPlanEntry>({
    dateActionLabelPrefix: 'Change to',
    errorMessage: COOKED_HISTORY_ERROR_MESSAGE,
    formatTitle: (selection) => selection.recipeTitle,
    headerLabel: 'Change Cooked Date',
    minDate: EARLIEST_COOKED_HISTORY_DATE,
    onSelectDate: (selection, nextDate) =>
      onCookedMealDateChange(selection.currentDate, selection.entryIndex, nextDate)
  });
  const activeMealPlanEntry = mealPlanDateDialog.selection ?? cookedHistoryDateDialog.selection;
  const mealPlanPendingActions = useAsyncActionGroup([
    mealPlanDateDialog.action,
    cookedHistoryDateDialog.action,
    removeMealPlanEntryAction,
    removeCookedMealHistoryEntryAction,
    markMealPlanEntryAsCookedAction
  ]);
  const mealPlanMutationActions = useAsyncActionGroup([
    removeMealPlanEntryAction,
    removeCookedMealHistoryEntryAction,
    markMealPlanEntryAsCookedAction
  ]);
  const isMealPlanUpdatePending = mealPlanPendingActions.isAnyPending;
  const mealPlanPageError = mealPlanMutationActions.firstError;

  function clearMealPlanPageError() {
    mealPlanMutationActions.clearErrors();
  }

  function openMealPlanDateDialog(
    currentDate: string,
    entryIndex: number,
    recipeTitle: string
  ) {
    const parsedCurrentDate = parseLocalDateString(currentDate);
    clearMealPlanPageError();

    mealPlanDateDialog.open(
      {
        currentDate,
        entryIndex,
        recipeTitle
      },
      parsedCurrentDate ?? new Date()
    );
  }

  function openCookedHistoryDateDialog(
    currentDate: string,
    entryIndex: number,
    recipeTitle: string
  ) {
    const parsedCurrentDate = parseLocalDateString(currentDate);
    clearMealPlanPageError();

    cookedHistoryDateDialog.open(
      {
        currentDate,
        entryIndex,
        recipeTitle
      },
      parsedCurrentDate ?? new Date()
    );
  }

  async function removePlannedMeal(currentDate: string, entryIndex: number) {
    clearMealPlanPageError();

    return removeMealPlanEntryAction.run(
      () => onMealPlanRecipeRemove(currentDate, entryIndex),
      DEFAULT_MEAL_PLAN_ERROR_MESSAGE
    );
  }

  async function removeCookedMeal(currentDate: string, entryIndex: number) {
    clearMealPlanPageError();

    return removeCookedMealHistoryEntryAction.run(
      () => onCookedMealRemove(currentDate, entryIndex),
      COOKED_HISTORY_ERROR_MESSAGE
    );
  }

  async function markPlannedMealAsCooked(
    currentDate: string,
    entryIndex: number,
    recipeId: string
  ) {
    clearMealPlanPageError();

    await markMealPlanEntryAsCookedAction.run(
      async () => {
        await onMealPlanRecipeMarkCooked(currentDate, entryIndex);
        clearRecipeMethodTracking(recipeId);
      },
      'Could not update the cooked meal history.'
    );
  }

  function updateCookedHistoryPage(nextPage: number) {
    setSearchParams(
      (currentSearchParams) =>
        createCookedHistorySearchParams(currentSearchParams, {
          page: Math.min(totalCookedHistoryPages, Math.max(1, nextPage))
        }),
      { replace: true }
    );
  }

  useEffect(() => {
    const rawCookedHistoryPageParam = readCookedHistoryRawPageParam(searchParams);
    const shouldNormalizeCookedHistoryPage =
      rawCookedHistoryPageParam !== null &&
      searchParamCookedHistoryPage !== cookedHistoryPage;

    if (!shouldNormalizeCookedHistoryPage) {
      return;
    }

    const normalizedSearchParams = createCookedHistorySearchParams(searchParams, {
      page: cookedHistoryPage
    });

    if (normalizedSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(normalizedSearchParams, { replace: true });
    }
  }, [
    cookedHistoryPage,
    searchParamCookedHistoryPage,
    searchParams,
    setSearchParams
  ]);

  return {
    activeMealPlanEntry,
    activeTab,
    cookedHistoryMonthLabel: activeCookedHistoryMonthPage?.dateLabel ?? null,
    cookedHistoryPage,
    dialogProps: mealPlanDateDialog.dialogProps ?? cookedHistoryDateDialog.dialogProps,
    isMealPlanUpdatePending,
    clearMealPlanPageError,
    markPlannedMealAsCooked,
    mealPlanDays,
    mealPlanPageError,
    openCookedHistoryDateDialog,
    openMealPlanDateDialog,
    pagedCookedMealDays,
    removeCookedMeal,
    removePlannedMeal,
    totalCookedHistoryPages,
    updateCookedHistoryPage
  };
}
