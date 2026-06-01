import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { countKnownDatedRecipes } from '../helpers/mealPlanData';
import { fetchRecipeCatalog, persistRecipeCatalog } from '../helpers/recipePreferences';
import { CLOUD_SYNC_APP_DATA_REFRESH_EVENT } from '../hooks/useCloudSyncStatus';
import { useRecipeAppData } from '../hooks/useRecipeAppData';
import type { Recipe } from '../types/recipe';

type RecipeAppDataValue = ReturnType<typeof useRecipeAppData>;

type RecipeAppActionHandlers = Pick<
  RecipeAppDataValue,
  | 'handleCookedMealDateChange'
  | 'handleCookedMealRemove'
  | 'handleDefaultServingSizeChange'
  | 'handleMealPlanRecipeAdd'
  | 'handleMealPlanRecipeDateChange'
  | 'handleMealPlanRecipeMarkCooked'
  | 'handleMealPlanRecipeRemove'
  | 'handleRecipeMarkCooked'
  | 'handleRecipeBookmarkAdd'
  | 'handleRecipeBookmarkTextChange'
  | 'handleRecipeBookmarkRemove'
  | 'handleRecipeNoteChange'
  | 'handleRecipeRatingChange'
  | 'handleRecipeServingChange'
  | 'handleShoppingListCustomItemAdd'
  | 'handleShoppingListCustomItemRemove'
  | 'handleShoppingListItemCheckChange'
>;

type MealPlanDataContextValue = {
  cookedMealHistory: RecipeAppDataValue['cookedMealHistory'];
  handleCookedMealDateChange: RecipeAppActionHandlers['handleCookedMealDateChange'];
  handleCookedMealRemove: RecipeAppActionHandlers['handleCookedMealRemove'];
  handleMealPlanRecipeAdd: RecipeAppActionHandlers['handleMealPlanRecipeAdd'];
  handleMealPlanRecipeDateChange: RecipeAppActionHandlers['handleMealPlanRecipeDateChange'];
  handleMealPlanRecipeMarkCooked: RecipeAppActionHandlers['handleMealPlanRecipeMarkCooked'];
  handleMealPlanRecipeRemove: RecipeAppActionHandlers['handleMealPlanRecipeRemove'];
  handleRecipeMarkCooked: RecipeAppActionHandlers['handleRecipeMarkCooked'];
  mealPlan: RecipeAppDataValue['mealPlan'];
  plannedMealCount: number;
};

type RecipeRatingsContextValue = {
  handleRecipeRatingChange: RecipeAppActionHandlers['handleRecipeRatingChange'];
  hasResolvedRecipeRatings: RecipeAppDataValue['hasResolvedRecipeRatings'];
  recipeRatings: RecipeAppDataValue['recipeRatings'];
};

type RecipePreferencesContextValue = {
  handleDefaultServingSizeChange: RecipeAppActionHandlers['handleDefaultServingSizeChange'];
  handleRecipeBookmarkAdd: RecipeAppActionHandlers['handleRecipeBookmarkAdd'];
  handleRecipeBookmarkTextChange: RecipeAppActionHandlers['handleRecipeBookmarkTextChange'];
  handleRecipeBookmarkRemove: RecipeAppActionHandlers['handleRecipeBookmarkRemove'];
  handleRecipeNoteChange: RecipeAppActionHandlers['handleRecipeNoteChange'];
  handleRecipeServingChange: RecipeAppActionHandlers['handleRecipeServingChange'];
  hasResolvedRecipeBookmarks: RecipeAppDataValue['hasResolvedRecipeBookmarks'];
  recipeBookmarks: RecipeAppDataValue['recipeBookmarks'];
  recipeNotes: RecipeAppDataValue['recipeNotes'];
  recipeServings: RecipeAppDataValue['recipeServings'];
  recipeSettings: RecipeAppDataValue['recipeSettings'];
};

type ShoppingListDataContextValue = {
  handleShoppingListCustomItemAdd: RecipeAppActionHandlers['handleShoppingListCustomItemAdd'];
  handleShoppingListCustomItemRemove: RecipeAppActionHandlers['handleShoppingListCustomItemRemove'];
  handleShoppingListItemCheckChange: RecipeAppActionHandlers['handleShoppingListItemCheckChange'];
  shoppingListChecks: RecipeAppDataValue['shoppingListChecks'];
  shoppingListCustomItems: RecipeAppDataValue['shoppingListCustomItems'];
};

type RecipeCatalogContextValue = {
  getRecipeById: (recipeId: string) => Recipe | undefined;
  handleRecipeAdd: (recipe: Recipe) => Promise<void>;
  hasLoadedRecipes: boolean;
  recipes: Recipe[];
};

type RecipeLoader = () => Promise<Recipe[]>;

const MealPlanDataContext = createContext<MealPlanDataContextValue | null>(null);
const RecipeRatingsContext = createContext<RecipeRatingsContextValue | null>(null);
const RecipePreferencesContext = createContext<RecipePreferencesContextValue | null>(null);
const ShoppingListDataContext = createContext<ShoppingListDataContextValue | null>(null);
const RecipeCatalogContext = createContext<RecipeCatalogContextValue | null>(null);

async function loadRecipesFromCatalog() {
  return fetchRecipeCatalog({ onError: console.error });
}

function useRequiredContext<T>(contextValue: T | null, hookName: string): T {
  if (!contextValue) {
    throw new Error(`${hookName} must be used within RecipeAppDataProvider.`);
  }

  return contextValue;
}

function getRecipeAppActionHandlers(recipeAppData: RecipeAppDataValue): RecipeAppActionHandlers {
  return {
    handleCookedMealDateChange: recipeAppData.handleCookedMealDateChange,
    handleCookedMealRemove: recipeAppData.handleCookedMealRemove,
    handleDefaultServingSizeChange: recipeAppData.handleDefaultServingSizeChange,
    handleMealPlanRecipeAdd: recipeAppData.handleMealPlanRecipeAdd,
    handleMealPlanRecipeDateChange: recipeAppData.handleMealPlanRecipeDateChange,
    handleMealPlanRecipeMarkCooked: recipeAppData.handleMealPlanRecipeMarkCooked,
    handleMealPlanRecipeRemove: recipeAppData.handleMealPlanRecipeRemove,
    handleRecipeMarkCooked: recipeAppData.handleRecipeMarkCooked,
    handleRecipeBookmarkAdd: recipeAppData.handleRecipeBookmarkAdd,
    handleRecipeBookmarkTextChange: recipeAppData.handleRecipeBookmarkTextChange,
    handleRecipeBookmarkRemove: recipeAppData.handleRecipeBookmarkRemove,
    handleRecipeNoteChange: recipeAppData.handleRecipeNoteChange,
    handleRecipeRatingChange: recipeAppData.handleRecipeRatingChange,
    handleRecipeServingChange: recipeAppData.handleRecipeServingChange,
    handleShoppingListCustomItemAdd: recipeAppData.handleShoppingListCustomItemAdd,
    handleShoppingListCustomItemRemove: recipeAppData.handleShoppingListCustomItemRemove,
    handleShoppingListItemCheckChange: recipeAppData.handleShoppingListItemCheckChange
  };
}

export function RecipeAppDataProvider({
  children,
  loadRecipes = loadRecipesFromCatalog
}: {
  children: ReactNode;
  loadRecipes?: RecipeLoader;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [hasLoadedRecipes, setHasLoadedRecipes] = useState(false);
  const [cloudSyncRefreshToken, setCloudSyncRefreshToken] = useState(0);
  const recipeById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe] as const)),
    [recipes]
  );
  const getRecipeById = useCallback(
    (recipeId: string) => {
      return recipeById.get(recipeId);
    },
    [recipeById]
  );
  const recipeAppData = useRecipeAppData({
    cloudSyncRefreshToken,
    getRecipeById,
    hasLoadedRecipes
  });
  const handleRecipeAdd = useCallback(async (recipe: Recipe) => {
    const nextRecipes = await persistRecipeCatalog(recipe);
    setRecipes(nextRecipes);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadRecipeList() {
      const loadedRecipes = await loadRecipes();

      if (!isCurrent) {
        return;
      }

      setRecipes(loadedRecipes);
      setHasLoadedRecipes(true);
    }

    void loadRecipeList().catch((error) => {
      console.error(error);

      if (!isCurrent) {
        return;
      }

      setRecipes([]);
      setHasLoadedRecipes(true);
    });

    return () => {
      isCurrent = false;
    };
  }, [loadRecipes]);

  useEffect(() => {
    let isCurrent = true;

    function handleCloudSyncAppDataRefresh() {
      void (async () => {
        try {
          const loadedRecipes = await loadRecipes();

          if (!isCurrent) {
            return;
          }

          setRecipes(loadedRecipes);
          setHasLoadedRecipes(true);
          setCloudSyncRefreshToken((currentToken) => currentToken + 1);
        } catch (error) {
          console.error(error);
        }
      })();
    }

    window.addEventListener(CLOUD_SYNC_APP_DATA_REFRESH_EVENT, handleCloudSyncAppDataRefresh);

    return () => {
      isCurrent = false;
      window.removeEventListener(
        CLOUD_SYNC_APP_DATA_REFRESH_EVENT,
        handleCloudSyncAppDataRefresh
      );
    };
  }, [loadRecipes]);

  const plannedMealCount = useMemo(
    () => countKnownDatedRecipes(recipeAppData.mealPlan, (recipeId) => Boolean(getRecipeById(recipeId))),
    [getRecipeById, recipeAppData.mealPlan]
  );

  const latestActionHandlers = getRecipeAppActionHandlers(recipeAppData);
  const actionHandlersRef = useRef<RecipeAppActionHandlers>(latestActionHandlers);

  actionHandlersRef.current = latestActionHandlers;

  const stableActionHandlers = useMemo<RecipeAppActionHandlers>(
    () => ({
      handleDefaultServingSizeChange: (...args) =>
        actionHandlersRef.current.handleDefaultServingSizeChange(...args),
      handleCookedMealDateChange: (...args) =>
        actionHandlersRef.current.handleCookedMealDateChange(...args),
      handleCookedMealRemove: (...args) =>
        actionHandlersRef.current.handleCookedMealRemove(...args),
      handleMealPlanRecipeAdd: (...args) => actionHandlersRef.current.handleMealPlanRecipeAdd(...args),
      handleMealPlanRecipeDateChange: (...args) =>
        actionHandlersRef.current.handleMealPlanRecipeDateChange(...args),
      handleMealPlanRecipeMarkCooked: (...args) =>
        actionHandlersRef.current.handleMealPlanRecipeMarkCooked(...args),
      handleMealPlanRecipeRemove: (...args) =>
        actionHandlersRef.current.handleMealPlanRecipeRemove(...args),
      handleRecipeMarkCooked: (...args) =>
        actionHandlersRef.current.handleRecipeMarkCooked(...args),
      handleRecipeBookmarkAdd: (...args) =>
        actionHandlersRef.current.handleRecipeBookmarkAdd(...args),
      handleRecipeBookmarkTextChange: (...args) =>
        actionHandlersRef.current.handleRecipeBookmarkTextChange(...args),
      handleRecipeBookmarkRemove: (...args) =>
        actionHandlersRef.current.handleRecipeBookmarkRemove(...args),
      handleRecipeNoteChange: (...args) => actionHandlersRef.current.handleRecipeNoteChange(...args),
      handleRecipeRatingChange: (...args) =>
        actionHandlersRef.current.handleRecipeRatingChange(...args),
      handleRecipeServingChange: (...args) =>
        actionHandlersRef.current.handleRecipeServingChange(...args),
      handleShoppingListCustomItemAdd: (...args) =>
        actionHandlersRef.current.handleShoppingListCustomItemAdd(...args),
      handleShoppingListCustomItemRemove: (...args) =>
        actionHandlersRef.current.handleShoppingListCustomItemRemove(...args),
      handleShoppingListItemCheckChange: (...args) =>
        actionHandlersRef.current.handleShoppingListItemCheckChange(...args)
    }),
    []
  );

  const recipeCatalogValue = useMemo(
    () => ({
      getRecipeById,
      handleRecipeAdd,
      hasLoadedRecipes,
      recipes
    }),
    [getRecipeById, handleRecipeAdd, hasLoadedRecipes, recipes]
  );

  const mealPlanDataValue = useMemo(
    () => ({
      cookedMealHistory: recipeAppData.cookedMealHistory,
      handleCookedMealDateChange: stableActionHandlers.handleCookedMealDateChange,
      handleCookedMealRemove: stableActionHandlers.handleCookedMealRemove,
      handleMealPlanRecipeAdd: stableActionHandlers.handleMealPlanRecipeAdd,
      handleMealPlanRecipeDateChange: stableActionHandlers.handleMealPlanRecipeDateChange,
      handleMealPlanRecipeMarkCooked: stableActionHandlers.handleMealPlanRecipeMarkCooked,
      handleMealPlanRecipeRemove: stableActionHandlers.handleMealPlanRecipeRemove,
      handleRecipeMarkCooked: stableActionHandlers.handleRecipeMarkCooked,
      mealPlan: recipeAppData.mealPlan,
      plannedMealCount
    }),
    [
      plannedMealCount,
      recipeAppData.cookedMealHistory,
      recipeAppData.mealPlan,
      stableActionHandlers
    ]
  );

  const recipeRatingsValue = useMemo(
    () => ({
      handleRecipeRatingChange: stableActionHandlers.handleRecipeRatingChange,
      hasResolvedRecipeRatings: recipeAppData.hasResolvedRecipeRatings,
      recipeRatings: recipeAppData.recipeRatings
    }),
    [
      recipeAppData.hasResolvedRecipeRatings,
      recipeAppData.recipeRatings,
      stableActionHandlers
    ]
  );

  const recipePreferencesValue = useMemo(
    () => ({
      handleDefaultServingSizeChange: stableActionHandlers.handleDefaultServingSizeChange,
      handleRecipeBookmarkAdd: stableActionHandlers.handleRecipeBookmarkAdd,
      handleRecipeBookmarkTextChange: stableActionHandlers.handleRecipeBookmarkTextChange,
      handleRecipeBookmarkRemove: stableActionHandlers.handleRecipeBookmarkRemove,
      handleRecipeNoteChange: stableActionHandlers.handleRecipeNoteChange,
      handleRecipeServingChange: stableActionHandlers.handleRecipeServingChange,
      hasResolvedRecipeBookmarks: recipeAppData.hasResolvedRecipeBookmarks,
      recipeBookmarks: recipeAppData.recipeBookmarks,
      recipeNotes: recipeAppData.recipeNotes,
      recipeServings: recipeAppData.recipeServings,
      recipeSettings: recipeAppData.recipeSettings
    }),
    [
      recipeAppData.hasResolvedRecipeBookmarks,
      recipeAppData.recipeBookmarks,
      recipeAppData.recipeNotes,
      recipeAppData.recipeServings,
      recipeAppData.recipeSettings,
      stableActionHandlers
    ]
  );

  const shoppingListDataValue = useMemo(
    () => ({
      handleShoppingListCustomItemAdd: stableActionHandlers.handleShoppingListCustomItemAdd,
      handleShoppingListCustomItemRemove: stableActionHandlers.handleShoppingListCustomItemRemove,
      handleShoppingListItemCheckChange: stableActionHandlers.handleShoppingListItemCheckChange,
      shoppingListChecks: recipeAppData.shoppingListChecks,
      shoppingListCustomItems: recipeAppData.shoppingListCustomItems
    }),
    [
      recipeAppData.shoppingListChecks,
      recipeAppData.shoppingListCustomItems,
      stableActionHandlers
    ]
  );

  return (
    <RecipeCatalogContext.Provider value={recipeCatalogValue}>
      <MealPlanDataContext.Provider value={mealPlanDataValue}>
        <RecipeRatingsContext.Provider value={recipeRatingsValue}>
          <RecipePreferencesContext.Provider value={recipePreferencesValue}>
            <ShoppingListDataContext.Provider value={shoppingListDataValue}>
              {children}
            </ShoppingListDataContext.Provider>
          </RecipePreferencesContext.Provider>
        </RecipeRatingsContext.Provider>
      </MealPlanDataContext.Provider>
    </RecipeCatalogContext.Provider>
  );
}

export function useRecipeCatalogContext() {
  return useRequiredContext(useContext(RecipeCatalogContext), 'useRecipeCatalogContext');
}

export function useMealPlanDataContext() {
  return useRequiredContext(useContext(MealPlanDataContext), 'useMealPlanDataContext');
}

export function useRecipeRatingsContext() {
  return useRequiredContext(useContext(RecipeRatingsContext), 'useRecipeRatingsContext');
}

export function useRecipePreferencesContext() {
  return useRequiredContext(
    useContext(RecipePreferencesContext),
    'useRecipePreferencesContext'
  );
}

export function useShoppingListDataContext() {
  return useRequiredContext(
    useContext(ShoppingListDataContext),
    'useShoppingListDataContext'
  );
}
