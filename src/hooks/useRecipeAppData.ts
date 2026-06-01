import { useEffect, useRef, useState } from 'react';
import {
  fetchRecipeAppDataSnapshot,
  markRecipeAsCooked,
  markMealPlanEntryAsCooked,
  moveCookedMealHistoryEntry,
  moveMealPlanEntry,
  persistMealPlanRecipe,
  persistDefaultServingSize,
  persistRecipeBookmarks,
  removeMealPlanEntry,
  persistRecipeNote,
  persistRecipeRating,
  persistRecipeServing,
  removeCookedMealHistoryEntry
} from '../helpers/recipePreferences';
import {
  createPersistedStateMutationHandler,
  queuePersistedStateUpdate
} from '../helpers/persistedState';
import type { AsyncActionQueueRef } from '../helpers/asyncQueue';
import type {
  RecipeAppPreferenceKey,
  RecipeAppPreferenceValueMap
} from '../helpers/recipePreferenceStores';
import {
  normalizeRecipeBookmarkLabelText,
  normalizeRecipeBookmarkText
} from '../helpers/recipePreferenceData';
import { reconcileShoppingListChecks } from '../helpers/shoppingList';
import { useAsyncQueueRef } from './useAsyncQueueRef';
import { useRefBackedState } from './useRefBackedState';
import { useShoppingListState } from './useShoppingListState';
import type {
  CookedMealHistoryMap,
  MealPlanMap,
  RecipeBookmark,
  RecipeBookmarkMap,
  RecipeNoteMap,
  RecipeRatingMap,
  RecipeServingMap,
  RecipeSettings
} from '../types/app';
import type { Recipe } from '../types/recipe';

function logError(error: unknown) {
  console.error(error);
}

type LoadedRecipeAppData = RecipeAppPreferenceValueMap;

export function useRecipeAppData({
  cloudSyncRefreshToken = 0,
  hasLoadedRecipes,
  getRecipeById
}: {
  cloudSyncRefreshToken?: number;
  hasLoadedRecipes: boolean;
  getRecipeById: (recipeId: string) => Recipe | undefined;
}) {
  const [cookedMealHistory, setCookedMealHistoryState, cookedMealHistoryRef] =
    useRefBackedState<CookedMealHistoryMap>({});
  const [mealPlan, setMealPlanState, mealPlanRef] = useRefBackedState<MealPlanMap>({});
  const [recipeRatings, setRecipeRatingsState, recipeRatingsRef] =
    useRefBackedState<RecipeRatingMap>({});
  const [recipeServings, setRecipeServingsState, recipeServingsRef] =
    useRefBackedState<RecipeServingMap>({});
  const [recipeNotes, setRecipeNotesState, recipeNotesRef] =
    useRefBackedState<RecipeNoteMap>({});
  const [recipeBookmarks, setRecipeBookmarksState, recipeBookmarksRef] =
    useRefBackedState<RecipeBookmarkMap>({});
  const [recipeSettings, setRecipeSettingsState, recipeSettingsRef] =
    useRefBackedState<RecipeSettings>({});
  const [hasResolvedRecipeRatings, setHasResolvedRecipeRatings] = useState(false);
  const [hasResolvedRecipeBookmarks, setHasResolvedRecipeBookmarks] = useState(false);
  const hasHydratedAppDataRef = useRef(false);
  const dirtyPreferenceKeysRef = useRef<Set<RecipeAppPreferenceKey>>(new Set());
  const recipeNotesMutationQueueRef = useAsyncQueueRef();
  const recipeRatingsMutationQueueRef = useAsyncQueueRef();
  const recipeServingsMutationQueueRef = useAsyncQueueRef();
  const recipeBookmarksMutationQueueRef = useAsyncQueueRef();
  const shoppingListState = useShoppingListState({
    getMealPlan: () => mealPlanRef.current,
    getRecipeById,
    getRecipeServings: () => recipeServingsRef.current,
    getRecipeSettings: () => recipeSettingsRef.current,
    onError: logError
  });

  function createShoppingListAwareStateApplier<T>(
    setState: (value: T) => void,
    reconcile: (value: T) => Promise<void> = () => {
      return shoppingListState.reconcileAndApplyShoppingListChecks();
    }
  ) {
    return (
      nextValue: T,
      { shouldReconcileShoppingList = true }: { shouldReconcileShoppingList?: boolean } = {}
    ) => {
      setState(nextValue);

      if (!shouldReconcileShoppingList) {
        return;
      }

      return reconcile(nextValue);
    };
  }

  function createRecipeBookmarkId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `bookmark-${crypto.randomUUID()}`;
    }

    return `bookmark-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeRecipeBookmarkLabel(label: string) {
    return normalizeRecipeBookmarkLabelText(label);
  }

  function getNextRecipeBookmarksState(
    currentRecipeBookmarks: RecipeBookmarkMap,
    recipeId: string,
    bookmark: Pick<RecipeBookmark, 'label' | 'text'>,
    bookmarkId: string
  ) {
    const normalizedLabel = normalizeRecipeBookmarkLabel(bookmark.label);
    const normalizedText = normalizeRecipeBookmarkText(bookmark.text);

    if (!normalizedLabel || !normalizedText) {
      return {
        didChange: false,
        value: currentRecipeBookmarks
      };
    }

    const existingRecipeBookmarks = currentRecipeBookmarks[recipeId] ?? [];

    if (
      existingRecipeBookmarks.some(
        (existingBookmark) =>
          existingBookmark.label === normalizedLabel &&
          existingBookmark.text === normalizedText
      )
    ) {
      return {
        didChange: false,
        value: currentRecipeBookmarks
      };
    }

    return {
      didChange: true,
      value: {
        ...currentRecipeBookmarks,
        [recipeId]: [
          ...existingRecipeBookmarks,
          {
            id: bookmarkId,
            label: normalizedLabel,
            text: normalizedText
          }
        ]
      }
    };
  }

  function removeRecipeBookmarkFromState(
    currentRecipeBookmarks: RecipeBookmarkMap,
    recipeId: string,
    bookmarkId: string
  ) {
    const existingRecipeBookmarks = currentRecipeBookmarks[recipeId];

    if (!existingRecipeBookmarks) {
      return currentRecipeBookmarks;
    }

    const nextRecipeBookmarks = existingRecipeBookmarks.filter(
      (bookmark) => bookmark.id !== bookmarkId
    );

    if (nextRecipeBookmarks.length === existingRecipeBookmarks.length) {
      return currentRecipeBookmarks;
    }

    const nextBookmarks = {
      ...currentRecipeBookmarks
    };

    if (nextRecipeBookmarks.length) {
      nextBookmarks[recipeId] = nextRecipeBookmarks;
    } else {
      delete nextBookmarks[recipeId];
    }

    return nextBookmarks;
  }

  const applyRecipeServingsState =
    createShoppingListAwareStateApplier<RecipeServingMap>(setRecipeServingsState);
  const applyRecipeSettingsState =
    createShoppingListAwareStateApplier<RecipeSettings>(setRecipeSettingsState);
  const applyMealPlanState = createShoppingListAwareStateApplier<MealPlanMap>(
    setMealPlanState,
    (nextMealPlan) => {
      return shoppingListState.reconcileAndApplyShoppingListChecks({
        mealPlan: nextMealPlan
      });
    }
  );

  function markPreferenceKeysDirty(...keys: RecipeAppPreferenceKey[]) {
    if (hasHydratedAppDataRef.current) {
      return;
    }

    keys.forEach((key) => {
      dirtyPreferenceKeysRef.current.add(key);
    });
  }

  function createPreferencePersistedStateHandler<Args extends unknown[], T>({
    applyState,
    dirtyKeys,
    queueRef,
    persist
  }: {
    applyState: (value: T) => void | Promise<void>;
    dirtyKeys: RecipeAppPreferenceKey[];
    queueRef?: AsyncActionQueueRef;
    persist: (...args: Args) => Promise<T>;
  }) {
    return createPersistedStateMutationHandler({
      applyState,
      onSuccess: () => {
        markPreferenceKeysDirty(...dirtyKeys);
      },
      persist,
      queueRef
    });
  }

  function getCurrentRecipeAppDataSnapshot(): LoadedRecipeAppData {
    return {
      cookedMealHistory: cookedMealHistoryRef.current,
      mealPlan: mealPlanRef.current,
      recipeBookmarks: recipeBookmarksRef.current,
      recipeNotes: recipeNotesRef.current,
      recipeRatings: recipeRatingsRef.current,
      recipeServings: recipeServingsRef.current,
      recipeSettings: recipeSettingsRef.current,
      shoppingListChecks: shoppingListState.getShoppingListChecks(),
      shoppingListCustomItems: shoppingListState.getShoppingListCustomItems()
    };
  }

  function resolveHydratedPreferenceValue<K extends RecipeAppPreferenceKey>(
    key: K,
    loadedValue: LoadedRecipeAppData[K],
    currentValue: LoadedRecipeAppData[K]
  ) {
    return dirtyPreferenceKeysRef.current.has(key) ? currentValue : loadedValue;
  }

  const mealPlanMutationDirtyKeys: RecipeAppPreferenceKey[] = [
    'mealPlan',
    'shoppingListChecks'
  ];
  const shoppingListMutationDirtyKeys: RecipeAppPreferenceKey[] = [
    'shoppingListChecks',
    'shoppingListCustomItems'
  ];
  const handleRecipeRatingChange = createPreferencePersistedStateHandler({
    applyState: setRecipeRatingsState,
    dirtyKeys: ['recipeRatings'],
    queueRef: recipeRatingsMutationQueueRef,
    persist: persistRecipeRating
  });
  const handleRecipeServingChange = createPreferencePersistedStateHandler({
    applyState: applyRecipeServingsState,
    dirtyKeys: ['recipeServings', 'shoppingListChecks'],
    queueRef: recipeServingsMutationQueueRef,
    persist: persistRecipeServing
  });
  const handleRecipeNoteChange = createPreferencePersistedStateHandler({
    applyState: setRecipeNotesState,
    dirtyKeys: ['recipeNotes'],
    queueRef: recipeNotesMutationQueueRef,
    persist: persistRecipeNote
  });
  const handleRecipeBookmarkAdd = async (
    recipeId: string,
    bookmark: Pick<RecipeBookmark, 'label' | 'text'>
  ) => {
    const bookmarkId = createRecipeBookmarkId();
    let createdBookmarkId: string | null = null;

    await queuePersistedStateUpdate({
      applyState: setRecipeBookmarksState,
      getCurrentValue: () => recipeBookmarksRef.current,
      getNextValue: (currentRecipeBookmarks) => {
        const nextRecipeBookmarks = getNextRecipeBookmarksState(
          currentRecipeBookmarks,
          recipeId,
          bookmark,
          bookmarkId
        );

        createdBookmarkId = nextRecipeBookmarks.didChange ? bookmarkId : null;
        return nextRecipeBookmarks.value;
      },
      persist: persistRecipeBookmarks,
      queueRef: recipeBookmarksMutationQueueRef
    });

    if (createdBookmarkId) {
      markPreferenceKeysDirty('recipeBookmarks');
    }

    return createdBookmarkId;
  };
  const handleRecipeBookmarkTextChange = async (
    recipeId: string,
    bookmarkId: string,
    updateText: (currentText: string) => string
  ) => {
    await queuePersistedStateUpdate({
      applyState: setRecipeBookmarksState,
      getCurrentValue: () => recipeBookmarksRef.current,
      getNextValue: (currentRecipeBookmarks) => {
        const existingRecipeBookmarks = currentRecipeBookmarks[recipeId];

        if (!existingRecipeBookmarks) {
          return currentRecipeBookmarks;
        }

        let hasChanges = false;

        const nextRecipeBookmarks = existingRecipeBookmarks.map((bookmark) => {
          if (bookmark.id !== bookmarkId) {
            return bookmark;
          }

          const normalizedText = normalizeRecipeBookmarkText(
            updateText(bookmark.text)
          );

          if (bookmark.text === normalizedText) {
            return bookmark;
          }

          hasChanges = true;

          return {
            ...bookmark,
            text: normalizedText
          };
        });

        if (!hasChanges) {
          return currentRecipeBookmarks;
        }

        return {
          ...currentRecipeBookmarks,
          [recipeId]: nextRecipeBookmarks
        };
      },
      persist: persistRecipeBookmarks,
      queueRef: recipeBookmarksMutationQueueRef
    });

    markPreferenceKeysDirty('recipeBookmarks');
  };
  const handleRecipeBookmarkRemove = async (recipeId: string, bookmarkId: string) => {
    await queuePersistedStateUpdate({
      applyState: setRecipeBookmarksState,
      getCurrentValue: () => recipeBookmarksRef.current,
      getNextValue: (currentRecipeBookmarks) =>
        removeRecipeBookmarkFromState(currentRecipeBookmarks, recipeId, bookmarkId),
      persist: persistRecipeBookmarks,
      queueRef: recipeBookmarksMutationQueueRef
    });

    markPreferenceKeysDirty('recipeBookmarks');
  };
  const handleMealPlanRecipeAdd = createPreferencePersistedStateHandler({
    applyState: applyMealPlanState,
    dirtyKeys: mealPlanMutationDirtyKeys,
    persist: persistMealPlanRecipe
  });
  const handleMealPlanRecipeDateChange = createPreferencePersistedStateHandler({
    applyState: applyMealPlanState,
    dirtyKeys: mealPlanMutationDirtyKeys,
    persist: moveMealPlanEntry
  });
  const handleMealPlanRecipeRemove = createPreferencePersistedStateHandler({
    applyState: applyMealPlanState,
    dirtyKeys: mealPlanMutationDirtyKeys,
    persist: removeMealPlanEntry
  });
  const handleCookedMealDateChange = createPreferencePersistedStateHandler({
    applyState: setCookedMealHistoryState,
    dirtyKeys: ['cookedMealHistory'],
    persist: moveCookedMealHistoryEntry
  });
  const handleCookedMealRemove = createPreferencePersistedStateHandler({
    applyState: setCookedMealHistoryState,
    dirtyKeys: ['cookedMealHistory'],
    persist: removeCookedMealHistoryEntry
  });
  const handleDefaultServingSizeChange = createPreferencePersistedStateHandler({
    applyState: applyRecipeSettingsState,
    dirtyKeys: ['recipeSettings', 'shoppingListChecks'],
    persist: persistDefaultServingSize
  });

  function applyLoadedRecipeAppData(loadedRecipeAppData: LoadedRecipeAppData) {
    const currentRecipeAppData = getCurrentRecipeAppDataSnapshot();
    const nextRecipeAppData = {
      cookedMealHistory: resolveHydratedPreferenceValue(
        'cookedMealHistory',
        loadedRecipeAppData.cookedMealHistory,
        currentRecipeAppData.cookedMealHistory
      ),
      mealPlan: resolveHydratedPreferenceValue(
        'mealPlan',
        loadedRecipeAppData.mealPlan,
        currentRecipeAppData.mealPlan
      ),
      recipeBookmarks: resolveHydratedPreferenceValue(
        'recipeBookmarks',
        loadedRecipeAppData.recipeBookmarks,
        currentRecipeAppData.recipeBookmarks
      ),
      recipeNotes: resolveHydratedPreferenceValue(
        'recipeNotes',
        loadedRecipeAppData.recipeNotes,
        currentRecipeAppData.recipeNotes
      ),
      recipeRatings: resolveHydratedPreferenceValue(
        'recipeRatings',
        loadedRecipeAppData.recipeRatings,
        currentRecipeAppData.recipeRatings
      ),
      recipeServings: resolveHydratedPreferenceValue(
        'recipeServings',
        loadedRecipeAppData.recipeServings,
        currentRecipeAppData.recipeServings
      ),
      recipeSettings: resolveHydratedPreferenceValue(
        'recipeSettings',
        loadedRecipeAppData.recipeSettings,
        currentRecipeAppData.recipeSettings
      ),
      shoppingListChecks: resolveHydratedPreferenceValue(
        'shoppingListChecks',
        loadedRecipeAppData.shoppingListChecks,
        currentRecipeAppData.shoppingListChecks
      ),
      shoppingListCustomItems: resolveHydratedPreferenceValue(
        'shoppingListCustomItems',
        loadedRecipeAppData.shoppingListCustomItems,
        currentRecipeAppData.shoppingListCustomItems
      )
    } satisfies LoadedRecipeAppData;
    const nextShoppingListChecks = hasLoadedRecipes
      ? reconcileShoppingListChecks({
          getRecipeById,
          mealPlan: nextRecipeAppData.mealPlan,
          recipeServings: nextRecipeAppData.recipeServings,
          recipeSettings: nextRecipeAppData.recipeSettings,
          shoppingListChecks: nextRecipeAppData.shoppingListChecks,
          shoppingListCustomItems: nextRecipeAppData.shoppingListCustomItems
        })
      : nextRecipeAppData.shoppingListChecks;

    setCookedMealHistoryState(nextRecipeAppData.cookedMealHistory);
    setMealPlanState(nextRecipeAppData.mealPlan);
    setRecipeBookmarksState(nextRecipeAppData.recipeBookmarks);
    setRecipeRatingsState(nextRecipeAppData.recipeRatings);
    setHasResolvedRecipeRatings(true);
    setHasResolvedRecipeBookmarks(true);
    applyRecipeServingsState(nextRecipeAppData.recipeServings, {
      shouldReconcileShoppingList: false
    });
    setRecipeNotesState(nextRecipeAppData.recipeNotes);
    applyRecipeSettingsState(nextRecipeAppData.recipeSettings, {
      shouldReconcileShoppingList: false
    });
    shoppingListState.hydrateShoppingListState({
      shoppingListChecks: nextShoppingListChecks,
      shoppingListCustomItems: nextRecipeAppData.shoppingListCustomItems
    });
    dirtyPreferenceKeysRef.current.clear();
    hasHydratedAppDataRef.current = true;
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadRecipeAppData({ isCloudSyncRefresh = false } = {}) {
      if (isCloudSyncRefresh && dirtyPreferenceKeysRef.current.size > 0) {
        return;
      }

      const loadedRecipeAppData = await fetchRecipeAppDataSnapshot({
        onError: logError
      });

      if (!isCurrent) {
        return;
      }

      applyLoadedRecipeAppData(loadedRecipeAppData);
    }

    void loadRecipeAppData();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedAppDataRef.current || !hasLoadedRecipes) {
      return;
    }

    void shoppingListState.reconcileAndApplyShoppingListChecks().catch(logError);
  }, [getRecipeById, hasLoadedRecipes]);

  useEffect(() => {
    if (!cloudSyncRefreshToken) {
      return;
    }

    let isCurrent = true;

    async function loadCloudSyncedRecipeAppData() {
      if (dirtyPreferenceKeysRef.current.size > 0) {
        return;
      }

      const loadedRecipeAppData = await fetchRecipeAppDataSnapshot({
        onError: logError
      });

      if (!isCurrent) {
        return;
      }

      applyLoadedRecipeAppData(loadedRecipeAppData);
    }

    void loadCloudSyncedRecipeAppData();

    return () => {
      isCurrent = false;
    };
  }, [cloudSyncRefreshToken]);

  async function handleMealPlanRecipeMarkCooked(currentDate: string, entryIndex: number) {
    const nextState = await markMealPlanEntryAsCooked(currentDate, entryIndex);
    markPreferenceKeysDirty('cookedMealHistory', ...mealPlanMutationDirtyKeys);
    await applyMealPlanState(nextState.mealPlan);
    setCookedMealHistoryState(nextState.cookedMealHistory);
  }

  async function handleRecipeMarkCooked(recipeId: string, date: string) {
    const nextCookedMealHistory = await markRecipeAsCooked(recipeId, date);
    markPreferenceKeysDirty('cookedMealHistory');
    setCookedMealHistoryState(nextCookedMealHistory);
  }

  async function handleShoppingListItemCheckChange(
    itemKey: string,
    sourceKeys: string[],
    checked: boolean
  ) {
    await shoppingListState.handleShoppingListItemCheckChange(itemKey, sourceKeys, checked);
    markPreferenceKeysDirty('shoppingListChecks');
  }

  async function handleShoppingListCustomItemAdd(
    ingredientName: string,
    amountText: string
  ) {
    await shoppingListState.handleShoppingListCustomItemAdd(ingredientName, amountText);
    markPreferenceKeysDirty(...shoppingListMutationDirtyKeys);
  }

  async function handleShoppingListCustomItemRemove(customItemId: string) {
    await shoppingListState.handleShoppingListCustomItemRemove(customItemId);
    markPreferenceKeysDirty(...shoppingListMutationDirtyKeys);
  }

  return {
    cookedMealHistory,
    handleCookedMealDateChange,
    handleCookedMealRemove,
    handleDefaultServingSizeChange,
    handleRecipeBookmarkAdd,
    handleRecipeBookmarkTextChange,
    handleRecipeBookmarkRemove,
    handleMealPlanRecipeAdd,
    handleMealPlanRecipeDateChange,
    handleMealPlanRecipeMarkCooked,
    handleMealPlanRecipeRemove,
    handleRecipeMarkCooked,
    handleShoppingListCustomItemAdd,
    handleShoppingListCustomItemRemove,
    handleRecipeNoteChange,
    handleRecipeRatingChange,
    handleRecipeServingChange,
    handleShoppingListItemCheckChange,
    hasResolvedRecipeRatings,
    hasResolvedRecipeBookmarks,
    mealPlan,
    recipeBookmarks,
    recipeNotes,
    recipeRatings,
    recipeServings,
    recipeSettings,
    shoppingListChecks: shoppingListState.shoppingListChecks,
    shoppingListCustomItems: shoppingListState.shoppingListCustomItems
  };
}
