import { appRoutePaths, cookedHistoryRoutePath } from './appRoutes';
import { isValidMealPlanDate } from './mealPlanData';
import { isNonEmptyString, isRecordLike } from './normalization';
import type {
  RecipePageBackLink,
  RecipePageLocationState,
  RecipePageMealPlanEntry
} from '../types/app';

function normalizeRecipePageBackLink(value: unknown) {
  if (!isRecordLike(value)) {
    return undefined;
  }

  const { label, to } = value as Partial<Record<keyof RecipePageBackLink, unknown>>;

  if (!isNonEmptyString(label) || !isNonEmptyString(to)) {
    return undefined;
  }

  return {
    label,
    to
  } satisfies RecipePageBackLink;
}

function normalizeRecipePageMealPlanEntry(value: unknown) {
  if (!isRecordLike(value)) {
    return undefined;
  }

  const {
    currentDate,
    entryIndex,
    recipeId
  } = value as Partial<Record<keyof RecipePageMealPlanEntry, unknown>>;
  const normalizedEntryIndex =
    typeof entryIndex === 'number' && Number.isSafeInteger(entryIndex) && entryIndex >= 0
      ? entryIndex
      : null;

  if (
    !isValidMealPlanDate(currentDate) ||
    normalizedEntryIndex === null ||
    !isNonEmptyString(recipeId)
  ) {
    return undefined;
  }

  return {
    currentDate,
    entryIndex: normalizedEntryIndex,
    recipeId
  } satisfies RecipePageMealPlanEntry;
}

function createRecipePageBackLink(label: string, to: string) {
  return {
    label,
    to
  } satisfies RecipePageBackLink;
}

export function createMealPlanRecipePageState(
  currentDate: string,
  entryIndex: number,
  recipeId: string
) {
  return {
    backLink: createRecipePageBackLink('Back to meal plan', appRoutePaths.mealPlan),
    mealPlanEntry: {
      currentDate,
      entryIndex,
      recipeId
    }
  } satisfies RecipePageLocationState;
}

export function createCookedHistoryRecipePageState(backLinkTo = cookedHistoryRoutePath) {
  return {
    backLink: createRecipePageBackLink('Back to cooked history', backLinkTo)
  } satisfies RecipePageLocationState;
}

export function createShoppingListRecipePageState() {
  return {
    backLink: createRecipePageBackLink('Back to shopping list', appRoutePaths.shoppingList)
  } satisfies RecipePageLocationState;
}

export function createBookmarksRecipePageState() {
  return {
    backLink: createRecipePageBackLink('Back to bookmarks', appRoutePaths.bookmarks)
  } satisfies RecipePageLocationState;
}

export function createHomeRecipePageState(backLinkTo: string = appRoutePaths.home) {
  return {
    backLink: createRecipePageBackLink('Back to recipes', backLinkTo)
  } satisfies RecipePageLocationState;
}

export function readRecipePageLocationState(value: unknown) {
  if (!isRecordLike(value)) {
    return null;
  }

  const backLink = normalizeRecipePageBackLink(
    (value as { backLink?: unknown }).backLink
  );
  const mealPlanEntry = normalizeRecipePageMealPlanEntry(
    (value as { mealPlanEntry?: unknown }).mealPlanEntry
  );

  if (!backLink && !mealPlanEntry) {
    return null;
  }

  return {
    backLink,
    mealPlanEntry
  } satisfies RecipePageLocationState;
}
