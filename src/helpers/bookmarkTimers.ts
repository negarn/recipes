import { getRecipeMethodSectionSteps } from './recipeMethodSteps';
import { readJsonStorageValue, removeStorageValue, writeJsonStorageValue } from './jsonStorage';
import { normalizeRecordEntries } from './normalization';
import { normalizeBookmarkLabelText, parseBookmarkBodyLines } from './bookmarkText';
import { renderMethodStepText } from './recipeDisplay';
import type { Recipe } from '../types/recipe';
import type { StepTimerMap } from '../types/app';

const BOOKMARK_LINE_TIMERS_STORAGE_KEY = 'recipe-bookmark-line-timers';

function normalizeLineTimers(value: unknown) {
  return normalizeRecordEntries(value, (timerEndAt) =>
    typeof timerEndAt === 'number' &&
    Number.isFinite(timerEndAt) &&
    timerEndAt > 0
      ? timerEndAt
      : null
  ) as StepTimerMap;
}

function getBookmarkLineTimerKey(bookmarkId: string, lineIndex: number) {
  return `${bookmarkId}:${lineIndex}`;
}

function normalizeTimerMatchText(value: string) {
  return normalizeBookmarkLabelText(value).toLowerCase();
}

export function readBookmarkLineTimers() {
  return normalizeLineTimers(readJsonStorageValue(BOOKMARK_LINE_TIMERS_STORAGE_KEY));
}

export function writeBookmarkLineTimers(bookmarkLineTimers: StepTimerMap) {
  const normalizedLineTimers = normalizeLineTimers(bookmarkLineTimers);

  if (!Object.keys(normalizedLineTimers).length) {
    removeStorageValue(BOOKMARK_LINE_TIMERS_STORAGE_KEY);
    return;
  }

  writeJsonStorageValue(BOOKMARK_LINE_TIMERS_STORAGE_KEY, normalizedLineTimers);
}

export function clearBookmarkLineTimersForBookmark(bookmarkId: string) {
  const currentBookmarkLineTimers = readBookmarkLineTimers();
  const bookmarkTimerPrefix = `${bookmarkId}:`;
  const nextBookmarkLineTimers = Object.fromEntries(
    Object.entries(currentBookmarkLineTimers).filter(
      ([timerKey]) => !timerKey.startsWith(bookmarkTimerPrefix)
    )
  ) as StepTimerMap;

  if (Object.keys(nextBookmarkLineTimers).length === Object.keys(currentBookmarkLineTimers).length) {
    return;
  }

  writeBookmarkLineTimers(nextBookmarkLineTimers);
}

export function setBookmarkLineTimersForBookmark(
  bookmarkId: string,
  lineTimers: Record<number, number>
) {
  const currentBookmarkLineTimers = readBookmarkLineTimers();
  const nextBookmarkLineTimers = {
    ...currentBookmarkLineTimers
  } as StepTimerMap;
  let didChange = false;

  Object.entries(lineTimers).forEach(([lineIndex, timerEndAt]) => {
    const normalizedLineIndex = Number(lineIndex);

    if (
      !Number.isInteger(normalizedLineIndex) ||
      normalizedLineIndex < 0 ||
      !Number.isFinite(timerEndAt) ||
      timerEndAt <= 0
    ) {
      return;
    }

    nextBookmarkLineTimers[getBookmarkLineTimerKey(bookmarkId, normalizedLineIndex)] = timerEndAt;
    didChange = true;
  });

  if (didChange) {
    writeBookmarkLineTimers(nextBookmarkLineTimers);
  }
}

export function getBookmarkLineTimerId(bookmarkId: string, lineIndex: number) {
  return getBookmarkLineTimerKey(bookmarkId, lineIndex);
}

export function deriveBookmarkLineTimersFromSelection({
  activeStepTimers,
  defaultServingCount,
  recipe,
  selectionText,
  servingCount
}: {
  activeStepTimers: StepTimerMap;
  defaultServingCount: number;
  recipe: Recipe;
  selectionText: string;
  servingCount: number;
}) {
  const availableTimerEndAtByStepText = new Map<string, number[]>();

  recipe.sections.forEach((section) => {
    getRecipeMethodSectionSteps(section).forEach(({ id: stepId, text: step }) => {
      const timerEndAt = activeStepTimers[stepId];

      if (typeof timerEndAt !== 'number') {
        return;
      }

      const renderedStepText = renderMethodStepText(
        step,
        recipe,
        servingCount,
        defaultServingCount
      );
      const normalizedRenderedStepText = normalizeTimerMatchText(renderedStepText);

      if (!normalizedRenderedStepText) {
        return;
      }

      const existingTimerEndAtValues =
        availableTimerEndAtByStepText.get(normalizedRenderedStepText) ?? [];
      existingTimerEndAtValues.push(timerEndAt);
      availableTimerEndAtByStepText.set(normalizedRenderedStepText, existingTimerEndAtValues);
    });
  });

  const selectionLineTimers: Record<number, number> = {};

  parseBookmarkBodyLines(selectionText).forEach((line, lineIndex) => {
    if (line.kind === 'blank') {
      return;
    }

    const normalizedLineText = normalizeTimerMatchText(line.text);

    if (!normalizedLineText) {
      return;
    }

    const matchingTimerEndAtValues =
      availableTimerEndAtByStepText.get(normalizedLineText) ?? [];

    if (!matchingTimerEndAtValues.length) {
      return;
    }

    selectionLineTimers[lineIndex] = matchingTimerEndAtValues.shift()!;
  });

  return selectionLineTimers;
}
