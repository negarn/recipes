export type RecipeRatingMap = Record<string, number>;
export type RecipeServingMap = Record<string, number>;
export type RecipeNoteMap = Record<string, string>;
export type RecipeBookmark = {
  id: string;
  label: string;
  text: string;
};
export type RecipeBookmarkList = RecipeBookmark[];
export type RecipeBookmarkMap = Record<string, RecipeBookmarkList>;
export type ShoppingListCheckMap = Record<string, string[]>;
export type RecipePreferenceResponseKey =
  | 'cookedMealHistory'
  | 'mealPlan'
  | 'recipeBookmarks'
  | 'recipeNotes'
  | 'recipeRatings'
  | 'recipeSettings'
  | 'recipeServings'
  | 'recipes'
  | 'shoppingListChecks'
  | 'shoppingListCustomItems';
export type ShoppingListCustomItem = {
  amountText: string;
  id: string;
  ingredientName: string;
};
export type ShoppingListCustomItemDraft = Pick<
  ShoppingListCustomItem,
  'amountText' | 'ingredientName'
>;
export type ShoppingListCustomItemList = ShoppingListCustomItem[];
export type DatedRecipeMap = Record<string, string[]>;
export type MealPlanMap = DatedRecipeMap;
export type CookedMealHistoryMap = DatedRecipeMap;

export type RecipeSettings = {
  defaultServingSize?: number;
};

export type StepTimerMap = Record<string, number>;

export type RecipePageBackLink = {
  label: string;
  to: string;
};

export type RecipePageMealPlanEntry = {
  currentDate: string;
  entryIndex: number;
  recipeId: string;
};

export type RecipePageLocationState = {
  backLink?: RecipePageBackLink;
  mealPlanEntry?: RecipePageMealPlanEntry;
};
