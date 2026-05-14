import { describe, expect, it } from 'vitest';
import { appRoutePaths, cookedHistoryRoutePath } from './appRoutes';
import {
  createBookmarksRecipePageState,
  createCookedHistoryRecipePageState,
  createHomeRecipePageState,
  createMealPlanRecipePageState,
  createShoppingListRecipePageState,
  readRecipePageLocationState
} from './recipePageNavigation';

describe('createBookmarksRecipePageState', () => {
  it('returns a back link to bookmarks', () => {
    expect(createBookmarksRecipePageState()).toEqual({
      backLink: {
        label: 'Back to bookmarks',
        to: appRoutePaths.bookmarks
      }
    });
  });
});

describe('recipe page route state helpers', () => {
  it('builds meal plan recipe state with the planned meal metadata', () => {
    expect(
      createMealPlanRecipePageState('2024-01-20', 2, 'recipe-1')
    ).toEqual({
      backLink: {
        label: 'Back to meal plan',
        to: appRoutePaths.mealPlan
      },
      mealPlanEntry: {
        currentDate: '2024-01-20',
        entryIndex: 2,
        recipeId: 'recipe-1'
      }
    });
  });

  it('builds cooked history recipe state with the default history tab back link', () => {
    expect(createCookedHistoryRecipePageState()).toEqual({
      backLink: {
        label: 'Back to cooked history',
        to: cookedHistoryRoutePath
      }
    });
  });

  it('allows custom cooked history back links', () => {
    expect(createCookedHistoryRecipePageState('/meal-plan?tab=history&page=2')).toEqual({
      backLink: {
        label: 'Back to cooked history',
        to: '/meal-plan?tab=history&page=2'
      }
    });
  });

  it('builds home and shopping list back links', () => {
    expect(createHomeRecipePageState('/?q=sample&page=2')).toEqual({
      backLink: {
        label: 'Back to recipes',
        to: '/?q=sample&page=2'
      }
    });

    expect(createShoppingListRecipePageState()).toEqual({
      backLink: {
        label: 'Back to shopping list',
        to: appRoutePaths.shoppingList
      }
    });
  });

  it('reads valid recipe page location state and rejects malformed values', () => {
    expect(
      readRecipePageLocationState({
        backLink: {
          label: 'Back to meal plan',
          to: appRoutePaths.mealPlan
        },
        mealPlanEntry: {
          currentDate: '2024-01-20',
          entryIndex: 1,
          recipeId: 'recipe-2'
        }
      })
    ).toEqual({
      backLink: {
        label: 'Back to meal plan',
        to: appRoutePaths.mealPlan
      },
      mealPlanEntry: {
        currentDate: '2024-01-20',
        entryIndex: 1,
        recipeId: 'recipe-2'
      }
    });

    expect(
      readRecipePageLocationState({
        backLink: {
          label: '',
          to: appRoutePaths.mealPlan
        },
        mealPlanEntry: {
          currentDate: '2024-02-30',
          entryIndex: -1,
          recipeId: ''
        }
      })
    ).toBeNull();
  });
});
