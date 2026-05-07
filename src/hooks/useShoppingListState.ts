import { normalizeShoppingListCustomItemDraft } from '../helpers/recipePreferenceData';
import {
  persistShoppingListChecks,
  persistShoppingListCustomItems
} from '../helpers/recipePreferences';
import {
  areShoppingListChecksEqual,
  reconcileShoppingListChecks
} from '../helpers/shoppingList';
import { queuePersistedStateUpdate } from '../helpers/persistedState';
import type { AsyncActionQueueRef } from '../helpers/asyncQueue';
import { useAsyncQueueRef } from './useAsyncQueueRef';
import { useRefBackedState } from './useRefBackedState';
import type {
  MealPlanMap,
  RecipeServingMap,
  RecipeSettings,
  ShoppingListCheckMap,
  ShoppingListCustomItemList
} from '../types/app';
import type { Recipe } from '../types/recipe';

function createShoppingListCustomItemId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `custom-${crypto.randomUUID()}`;
  }

  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getNextShoppingListChecksState({
  checked,
  currentShoppingListChecks,
  itemKey,
  sourceKeys
}: {
  checked: boolean;
  currentShoppingListChecks: ShoppingListCheckMap;
  itemKey: string;
  sourceKeys: string[];
}) {
  const existingSourceKeys = currentShoppingListChecks[itemKey] ?? [];
  const nextSourceKeys = checked
    ? [...new Set([...existingSourceKeys, ...sourceKeys])].sort()
    : existingSourceKeys.filter((sourceKey) => !sourceKeys.includes(sourceKey));
  const nextShoppingListChecks = {
    ...currentShoppingListChecks
  };

  if (nextSourceKeys.length) {
    nextShoppingListChecks[itemKey] = nextSourceKeys;
  } else {
    delete nextShoppingListChecks[itemKey];
  }

  return nextShoppingListChecks;
}

function appendShoppingListCustomItem(
  currentShoppingListCustomItems: ShoppingListCustomItemList,
  customItem: Pick<ShoppingListCustomItemList[number], 'amountText' | 'ingredientName'>
) {
  return [
    ...currentShoppingListCustomItems,
    {
      ...customItem,
      id: createShoppingListCustomItemId()
    }
  ];
}

function removeShoppingListCustomItemById(
  currentShoppingListCustomItems: ShoppingListCustomItemList,
  customItemId: string
) {
  const nextShoppingListCustomItems = currentShoppingListCustomItems.filter(
    (shoppingListCustomItem) => shoppingListCustomItem.id !== customItemId
  );

  return nextShoppingListCustomItems.length === currentShoppingListCustomItems.length
    ? currentShoppingListCustomItems
    : nextShoppingListCustomItems;
}

function createQueuedPersistedStateUpdater<T>({
  applyState,
  getCurrentValue,
  persist,
  queueRef,
  shouldSkip
}: {
  applyState: (value: T) => void | Promise<void>;
  getCurrentValue: () => T;
  persist: (value: T) => Promise<T>;
  queueRef: AsyncActionQueueRef;
  shouldSkip?: (nextValue: T, currentValue: T) => boolean;
}) {
  return (getNextValue: (currentValue: T) => T) =>
    queuePersistedStateUpdate({
      queueRef,
      getCurrentValue,
      getNextValue,
      persist,
      applyState,
      shouldSkip
    });
}

export function useShoppingListState({
  getMealPlan,
  getRecipeById,
  getRecipeServings,
  getRecipeSettings,
  onError
}: {
  getMealPlan: () => MealPlanMap;
  getRecipeById: (recipeId: string) => Recipe | undefined;
  getRecipeServings: () => RecipeServingMap;
  getRecipeSettings: () => RecipeSettings;
  onError: (error: unknown) => void;
}) {
  const [shoppingListChecks, setShoppingListChecksState, shoppingListChecksRef] =
    useRefBackedState<ShoppingListCheckMap>({});
  const [
    shoppingListCustomItems,
    setShoppingListCustomItemsState,
    shoppingListCustomItemsRef
  ] = useRefBackedState<ShoppingListCustomItemList>([]);
  const shoppingListChecksQueueRef = useAsyncQueueRef();
  const shoppingListCustomItemsQueueRef = useAsyncQueueRef();

  const queueShoppingListChecksStateUpdate =
    createQueuedPersistedStateUpdater<ShoppingListCheckMap>({
      applyState: setShoppingListChecksState,
      getCurrentValue: () => shoppingListChecksRef.current,
      persist: persistShoppingListChecks,
      queueRef: shoppingListChecksQueueRef,
      shouldSkip: areShoppingListChecksEqual
    });

  function getReconciledShoppingListChecks({
    mealPlan = getMealPlan(),
    shoppingListChecks: nextShoppingListChecks = shoppingListChecksRef.current,
    shoppingListCustomItems: nextShoppingListCustomItems = shoppingListCustomItemsRef.current
  }: {
    mealPlan?: MealPlanMap;
    shoppingListChecks?: ShoppingListCheckMap;
    shoppingListCustomItems?: ShoppingListCustomItemList;
  } = {}) {
    return reconcileShoppingListChecks({
      getRecipeById,
      mealPlan,
      recipeServings: getRecipeServings(),
      recipeSettings: getRecipeSettings(),
      shoppingListChecks: nextShoppingListChecks,
      shoppingListCustomItems: nextShoppingListCustomItems
    });
  }

  function reconcileAndApplyShoppingListChecks({
    mealPlan,
    shoppingListCustomItems: nextShoppingListCustomItems
  }: {
    mealPlan?: MealPlanMap;
    shoppingListCustomItems?: ShoppingListCustomItemList;
  } = {}) {
    return queueShoppingListChecksStateUpdate((currentShoppingListChecks) =>
      getReconciledShoppingListChecks({
        mealPlan,
        shoppingListChecks: currentShoppingListChecks,
        shoppingListCustomItems: nextShoppingListCustomItems
      })
    ).catch((error) => {
      onError(error);
      throw error;
    });
  }

  function applyShoppingListCustomItemsState(
    nextShoppingListCustomItems: ShoppingListCustomItemList
  ) {
    setShoppingListCustomItemsState(nextShoppingListCustomItems);
    return reconcileAndApplyShoppingListChecks({
      shoppingListCustomItems: nextShoppingListCustomItems
    });
  }

  const queueShoppingListCustomItemsStateUpdate =
    createQueuedPersistedStateUpdater<ShoppingListCustomItemList>({
      applyState: applyShoppingListCustomItemsState,
      getCurrentValue: () => shoppingListCustomItemsRef.current,
      persist: persistShoppingListCustomItems,
      queueRef: shoppingListCustomItemsQueueRef
    });

  async function handleShoppingListItemCheckChange(
    itemKey: string,
    sourceKeys: string[],
    checked: boolean
  ) {
    await queueShoppingListChecksStateUpdate((currentShoppingListChecks) =>
      getNextShoppingListChecksState({
        checked,
        currentShoppingListChecks,
        itemKey,
        sourceKeys
      })
    );
  }

  async function handleShoppingListCustomItemAdd(
    ingredientName: string,
    amountText: string
  ) {
    const normalizedCustomItem = normalizeShoppingListCustomItemDraft({
      amountText,
      ingredientName
    });

    if (!normalizedCustomItem) {
      return;
    }

    await queueShoppingListCustomItemsStateUpdate((currentShoppingListCustomItems) =>
      appendShoppingListCustomItem(currentShoppingListCustomItems, normalizedCustomItem)
    );
  }

  async function handleShoppingListCustomItemRemove(customItemId: string) {
    await queueShoppingListCustomItemsStateUpdate((currentShoppingListCustomItems) =>
      removeShoppingListCustomItemById(currentShoppingListCustomItems, customItemId)
    );
  }

  function hydrateShoppingListState({
    shoppingListChecks: nextShoppingListChecks,
    shoppingListCustomItems: nextShoppingListCustomItems
  }: {
    shoppingListChecks: ShoppingListCheckMap;
    shoppingListCustomItems: ShoppingListCustomItemList;
  }) {
    setShoppingListCustomItemsState(nextShoppingListCustomItems);
    setShoppingListChecksState(nextShoppingListChecks);
  }

  return {
    getShoppingListChecks: () => shoppingListChecksRef.current,
    getShoppingListCustomItems: () => shoppingListCustomItemsRef.current,
    handleShoppingListCustomItemAdd,
    handleShoppingListCustomItemRemove,
    handleShoppingListItemCheckChange,
    hydrateShoppingListState,
    reconcileAndApplyShoppingListChecks,
    shoppingListChecks,
    shoppingListCustomItems
  };
}
