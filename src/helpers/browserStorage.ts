import {
  readJsonStorageValue,
  removeStorageValue,
  writeJsonStorageValue
} from './jsonStorage';
import { normalizeRecordEntries } from './normalization';
import type { StepTimerMap } from '../types/app';

const RECIPE_METHOD_PROGRESS_STORAGE_PREFIX = 'recipe-method-progress:';
const RECIPE_STEP_TIMERS_STORAGE_PREFIX = 'recipe-step-timers:';

function getRecipeMethodProgressStorageKey(recipeId: string) {
  return `${RECIPE_METHOD_PROGRESS_STORAGE_PREFIX}${recipeId}`;
}

export function readRecipeMethodProgress(recipeId: string) {
  const parsedValue = readJsonStorageValue(getRecipeMethodProgressStorageKey(recipeId));

  if (!Array.isArray(parsedValue)) {
    return new Set<string>();
  }

  return new Set(parsedValue.filter((value): value is string => typeof value === 'string'));
}

export function writeRecipeMethodProgress(recipeId: string, completedStepIds: Set<string>) {
  const storageKey = getRecipeMethodProgressStorageKey(recipeId);

  if (!completedStepIds.size) {
    removeStorageValue(storageKey);
    return;
  }

  writeJsonStorageValue(storageKey, [...completedStepIds]);
}

function normalizeStepTimers(value: unknown) {
  return normalizeRecordEntries(value, (timerEndAt) =>
    typeof timerEndAt === 'number' &&
    Number.isFinite(timerEndAt) &&
    timerEndAt > 0
      ? timerEndAt
      : null
  ) as StepTimerMap;
}

function getRecipeStepTimersStorageKey(recipeId: string) {
  return `${RECIPE_STEP_TIMERS_STORAGE_PREFIX}${recipeId}`;
}

export function readRecipeStepTimers(recipeId: string) {
  return normalizeStepTimers(readJsonStorageValue(getRecipeStepTimersStorageKey(recipeId)));
}

export function writeRecipeStepTimers(recipeId: string, stepTimers: StepTimerMap) {
  const storageKey = getRecipeStepTimersStorageKey(recipeId);
  const normalizedStepTimers = normalizeStepTimers(stepTimers);

  if (!Object.keys(normalizedStepTimers).length) {
    removeStorageValue(storageKey);
    return;
  }

  writeJsonStorageValue(storageKey, normalizedStepTimers);
}

export function clearRecipeMethodTracking(recipeId: string) {
  removeStorageValue(getRecipeMethodProgressStorageKey(recipeId));
  removeStorageValue(getRecipeStepTimersStorageKey(recipeId));
}
