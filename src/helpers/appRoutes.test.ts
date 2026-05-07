import { describe, expect, it } from 'vitest';
import {
  appRoutePaths,
  cookedHistoryRoutePath,
  getActiveNavigationRouteId,
  getRecipeRoutePath,
  readMealPlanTab
} from './appRoutes';

describe('appRoutes', () => {
  it('encodes recipe ids when building recipe routes', () => {
    expect(getRecipeRoutePath('roasted/garlic & tomato')).toBe(
      '/recipes/roasted%2Fgarlic%20%26%20tomato'
    );
  });

  it('reads the meal plan tab from search params', () => {
    expect(readMealPlanTab(new URLSearchParams(''))).toBe('plan');
    expect(readMealPlanTab(new URLSearchParams('tab=history'))).toBe('history');
    expect(readMealPlanTab(new URLSearchParams('tab=anything-else'))).toBe('plan');
  });

  it('identifies the active navigation route from the current location', () => {
    expect(
      getActiveNavigationRouteId({
        pathname: appRoutePaths.home,
        search: ''
      })
    ).toBe('home');

    expect(
      getActiveNavigationRouteId({
        pathname: '/recipes/chili',
        search: ''
      })
    ).toBe('home');

    expect(
      getActiveNavigationRouteId({
        pathname: appRoutePaths.bookmarks,
        search: ''
      })
    ).toBe('bookmarks');

    expect(
      getActiveNavigationRouteId({
        pathname: appRoutePaths.mealPlan,
        search: ''
      })
    ).toBe('meal-plan');

    expect(
      getActiveNavigationRouteId({
        pathname: appRoutePaths.mealPlan,
        search: '?tab=history'
      })
    ).toBe('cooked-history');

    expect(
      getActiveNavigationRouteId({
        pathname: appRoutePaths.shoppingList,
        search: ''
      })
    ).toBe('shopping-list');

    expect(
      getActiveNavigationRouteId({
        pathname: appRoutePaths.settings,
        search: ''
      })
    ).toBe('settings');
  });

  it('exposes the cooked history route path', () => {
    expect(cookedHistoryRoutePath).toBe('/meal-plan?tab=history');
  });
});
