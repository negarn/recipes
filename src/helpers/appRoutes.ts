export const appRoutePaths = {
  home: '/',
  bookmarks: '/bookmarks',
  mealPlan: '/meal-plan',
  recipe: '/recipes/:recipeId',
  settings: '/settings',
  shoppingList: '/shopping-list'
} as const;

const MEAL_PLAN_TAB_QUERY_PARAM = 'tab';
const COOKED_HISTORY_TAB_VALUE = 'history';
const MEAL_PLAN_TAB_VALUES = ['plan', COOKED_HISTORY_TAB_VALUE] as const;

type MealPlanTab = (typeof MEAL_PLAN_TAB_VALUES)[number];

export function readMealPlanTab(searchParams: URLSearchParams): MealPlanTab {
  return searchParams.get(MEAL_PLAN_TAB_QUERY_PARAM) === COOKED_HISTORY_TAB_VALUE
    ? COOKED_HISTORY_TAB_VALUE
    : 'plan';
}

export const cookedHistoryRoutePath = `${appRoutePaths.mealPlan}?${MEAL_PLAN_TAB_QUERY_PARAM}=${COOKED_HISTORY_TAB_VALUE}`;

export function getRecipeRoutePath(recipeId: string) {
  return appRoutePaths.recipe.replace(':recipeId', encodeURIComponent(recipeId));
}

export type NavigationRouteId =
  | 'home'
  | 'bookmarks'
  | 'meal-plan'
  | 'shopping-list'
  | 'cooked-history'
  | 'settings';

export function getActiveNavigationRouteId(location: {
  pathname: string;
  search: string;
}): NavigationRouteId {
  const activeMealPlanTab = readMealPlanTab(new URLSearchParams(location.search));

  if (location.pathname.startsWith(appRoutePaths.mealPlan)) {
    return activeMealPlanTab === COOKED_HISTORY_TAB_VALUE ? 'cooked-history' : 'meal-plan';
  }

  if (location.pathname.startsWith(appRoutePaths.shoppingList)) {
    return 'shopping-list';
  }

  if (location.pathname.startsWith(appRoutePaths.bookmarks)) {
    return 'bookmarks';
  }

  if (location.pathname.startsWith(appRoutePaths.settings)) {
    return 'settings';
  }

  return 'home';
}
