import { parseLocalDateString } from './mealPlan';
import { normalizeRecordEntries } from './normalization';
import type { CookedMealHistoryMap, DatedRecipeMap, MealPlanMap } from '../types/app';

type DateSortDirection = 'asc' | 'desc';

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

export function formatDateAsLocalDateString(date: Date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate())
  ].join('-');
}

export function getTodayMealPlanDateString() {
  return formatDateAsLocalDateString(new Date());
}

export function getEarliestAllowedMealPlanDateString(date = new Date()) {
  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - 1
  ));

  return [
    utcDate.getUTCFullYear(),
    padDatePart(utcDate.getUTCMonth() + 1),
    padDatePart(utcDate.getUTCDate())
  ].join('-');
}

export function countKnownDatedRecipes(
  entries: DatedRecipeMap,
  isKnownRecipeId: (recipeId: string) => boolean
) {
  return Object.values(entries).reduce(
    (total, recipeIds) =>
      total +
      recipeIds.reduce(
        (count, recipeId) => (isKnownRecipeId(recipeId) ? count + 1 : count),
        0
      ),
    0
  );
}

export function sortDatedEntries<T>(
  entries: Record<string, T>,
  sortDirection: DateSortDirection
) {
  return Object.entries(entries).sort(([leftDate], [rightDate]) =>
    sortDirection === 'asc'
      ? leftDate.localeCompare(rightDate)
      : rightDate.localeCompare(leftDate)
  );
}

export function isValidMealPlanDate(value: unknown): value is string {
  return typeof value === 'string' && parseLocalDateString(value) !== null;
}

export function isAllowedMealPlanDate(value: unknown): value is string {
  return isValidMealPlanDate(value) && value >= getEarliestAllowedMealPlanDateString();
}

function normalizeDatedRecipeMap<T extends DatedRecipeMap>(value: unknown) {
  return normalizeRecordEntries(value, (recipeIds, date) => {
    if (!isValidMealPlanDate(date) || !Array.isArray(recipeIds)) {
      return null;
    }

    const normalizedRecipeIds = recipeIds.filter(
      (recipeId): recipeId is string => typeof recipeId === 'string' && recipeId.length > 0
    );

    return normalizedRecipeIds.length ? normalizedRecipeIds : null;
  }) as T;
}

export function normalizeMealPlan(value: unknown) {
  return normalizeDatedRecipeMap<MealPlanMap>(value);
}

export function normalizeCookedMealHistory(value: unknown) {
  return normalizeDatedRecipeMap<CookedMealHistoryMap>(value);
}
