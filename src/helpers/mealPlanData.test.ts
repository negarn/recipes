import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  countKnownDatedRecipes,
  formatDateAsLocalDateString,
  isAllowedMealPlanDate,
  isValidMealPlanDate,
  normalizeCookedMealHistory,
  normalizeMealPlan,
  sortDatedEntries
} from './mealPlanData';

afterEach(() => {
  vi.useRealTimers();
});

describe('mealPlanData', () => {
  it('formats local dates with zero-padded month and day parts', () => {
    expect(formatDateAsLocalDateString(new Date(2024, 0, 5, 12))).toBe('2024-01-05');
  });

  it('recognizes valid meal plan dates and rejects invalid ones', () => {
    expect(isValidMealPlanDate('2024-02-29')).toBe(true);
    expect(isValidMealPlanDate('2024-02-30')).toBe(false);
  });

  it('allows today and later meal plan dates while blocking earlier ones', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 15, 12));

    expect(isAllowedMealPlanDate('2024-01-14')).toBe(false);
    expect(isAllowedMealPlanDate('2024-01-15')).toBe(true);
    expect(isAllowedMealPlanDate('2024-01-16')).toBe(true);
  });

  it('counts known dated recipes across all meal plan dates', () => {
    expect(
      countKnownDatedRecipes(
        {
          '2024-01-01': ['recipe-1', 'recipe-2'],
          '2024-01-02': ['recipe-3']
        },
        (recipeId) => recipeId !== 'recipe-2'
      )
    ).toBe(2);
  });

  it('sorts dated entries in ascending and descending order', () => {
    const datedEntries = {
      '2024-01-03': ['recipe-3'],
      '2024-01-01': ['recipe-1'],
      '2024-01-02': ['recipe-2']
    };

    expect(sortDatedEntries(datedEntries, 'asc')).toEqual([
      ['2024-01-01', ['recipe-1']],
      ['2024-01-02', ['recipe-2']],
      ['2024-01-03', ['recipe-3']]
    ]);
    expect(sortDatedEntries(datedEntries, 'desc')).toEqual([
      ['2024-01-03', ['recipe-3']],
      ['2024-01-02', ['recipe-2']],
      ['2024-01-01', ['recipe-1']]
    ]);
  });

  it('normalizes meal plan and cooked history payloads', () => {
    expect(
      normalizeMealPlan({
        '2024-01-01': ['recipe-1', '', 'recipe-2'],
        '2024-01-02': [],
        '2024-02-30': ['recipe-3'],
        'not-a-date': ['recipe-4']
      })
    ).toEqual({
      '2024-01-01': ['recipe-1', 'recipe-2']
    });

    expect(
      normalizeCookedMealHistory({
        '2024-01-03': ['recipe-5'],
        '2024-13-01': ['recipe-6']
      })
    ).toEqual({
      '2024-01-03': ['recipe-5']
    });
  });
});
