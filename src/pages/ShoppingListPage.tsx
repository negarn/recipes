import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { InlineMessage } from '../components/InlineMessage';
import {
  EmptyStateCard,
  ErrorPillMessage
} from '../components/PageStatusMessage';
import { PlusIcon } from '../components/PlusIcon';
import { ShoppingListCustomItemForm } from '../components/ShoppingListCustomItemForm';
import { ShoppingListPageSkeleton } from '../components/ShoppingListPageSkeleton';
import { ShoppingListSectionCard } from '../components/ShoppingListSectionCard';
import { MobileNavigationTrigger } from '../components/MobileNavigationTrigger';
import { TabbedPanelLayout } from '../components/TabbedPanelLayout';
import {
  useMealPlanDataContext,
  useRecipeCatalogContext,
  useRecipePreferencesContext,
  useShoppingListDataContext
} from '../contexts/RecipeAppDataContext';
import { normalizeShoppingListCustomItemDraft } from '../helpers/recipePreferenceData';
import {
  deriveShoppingList,
  type ShoppingListItem
} from '../helpers/shoppingList';
import {
  cn,
  elevatedBrandIconActionButtonClass,
  pageTitleClass
} from '../helpers/uiClasses';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useAsyncActionGroup } from '../hooks/useAsyncActionGroup';
import { usePendingValueSet } from '../hooks/usePendingValueSet';
import type { ShoppingListCustomItemDraft } from '../types/app';

const EMPTY_CUSTOM_ITEM_DRAFT: ShoppingListCustomItemDraft = {
  amountText: '',
  ingredientName: ''
};

export function ShoppingListPage() {
  const { getRecipeById, hasLoadedRecipes } = useRecipeCatalogContext();
  const { mealPlan } = useMealPlanDataContext();
  const { recipeServings, recipeSettings } = useRecipePreferencesContext();
  const {
    handleShoppingListCustomItemAdd: onShoppingListCustomItemAdd,
    handleShoppingListCustomItemRemove: onShoppingListCustomItemRemove,
    handleShoppingListItemCheckChange: onShoppingListItemCheckChange,
    shoppingListChecks,
    shoppingListCustomItems
  } = useShoppingListDataContext();
  const [activeSourcePopoverRenderKey, setActiveSourcePopoverRenderKey] =
    useState<string | null>(null);
  const [customItemDraft, setCustomItemDraft] =
    useState<ShoppingListCustomItemDraft>(EMPTY_CUSTOM_ITEM_DRAFT);
  const [isCustomItemFormOpen, setIsCustomItemFormOpen] = useState(false);
  const customItemFormId = useId();
  const shoppingListItemToggleAction = useAsyncAction();
  const shoppingListCustomItemAddAction = useAsyncAction();
  const shoppingListCustomItemRemoveAction = useAsyncAction();
  const shoppingListUpdateActions = useAsyncActionGroup([
    shoppingListItemToggleAction,
    shoppingListCustomItemRemoveAction
  ]);
  const pendingCustomItemIds = usePendingValueSet<string>();
  const pendingItemKeys = usePendingValueSet<string>();
  const shoppingListSections = useMemo(
    () =>
      deriveShoppingList({
        getRecipeById,
        mealPlan,
        recipeServings,
        recipeSettings,
        shoppingListChecks,
        shoppingListCustomItems
      }),
    [
      getRecipeById,
      mealPlan,
      recipeServings,
      recipeSettings,
      shoppingListChecks,
      shoppingListCustomItems
    ]
  );
  const normalizedCustomItemDraft = normalizeShoppingListCustomItemDraft(customItemDraft);
  const canSubmitCustomItem =
    Boolean(normalizedCustomItemDraft) && !shoppingListCustomItemAddAction.isPending;
  const shoppingListUpdateError = shoppingListUpdateActions.firstError;
  const emptyShoppingListState = (
    <EmptyStateCard
      title="No shopping items yet"
      description="Add meals to your plan or create a custom item to get started."
    />
  );

  function clearShoppingListUpdateError() {
    shoppingListUpdateActions.clearErrors();
  }

  function closeSourcePopover() {
    setActiveSourcePopoverRenderKey(null);
  }

  function hideCustomItemForm() {
    if (shoppingListCustomItemAddAction.isPending) {
      return;
    }

    shoppingListCustomItemAddAction.reset();
    setCustomItemDraft(EMPTY_CUSTOM_ITEM_DRAFT);
    setIsCustomItemFormOpen(false);
  }

  function updateCustomItemDraft(
    field: keyof ShoppingListCustomItemDraft,
    value: string
  ) {
    shoppingListCustomItemAddAction.clearError();
    setCustomItemDraft((currentDraft) =>
      currentDraft[field] === value
        ? currentDraft
        : {
            ...currentDraft,
            [field]: value
          }
    );
  }

  function showCustomItemForm() {
    shoppingListCustomItemAddAction.clearError();
    setIsCustomItemFormOpen(true);
  }

  async function handleShoppingListItemToggle(
    item: ShoppingListItem,
    checked: boolean
  ) {
    clearShoppingListUpdateError();

    await pendingItemKeys.track(item.renderKey, async () => {
      await shoppingListItemToggleAction.run(
        () => onShoppingListItemCheckChange(item.itemKey, item.checkSourceKeys, checked),
        'Could not update shopping list.'
      );
    });
  }

  async function handleCustomItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedCustomItemDraft || shoppingListCustomItemAddAction.isPending) {
      return;
    }

    const didAddItem = await shoppingListCustomItemAddAction.run(
      () =>
        onShoppingListCustomItemAdd(
          normalizedCustomItemDraft.ingredientName,
          normalizedCustomItemDraft.amountText
        ),
      'Could not save custom shopping list item.'
    );

    if (didAddItem) {
      hideCustomItemForm();
    }
  }

  async function handleCustomItemRemove(customItemId: string) {
    clearShoppingListUpdateError();

    await pendingCustomItemIds.track(customItemId, async () => {
      await shoppingListCustomItemRemoveAction.run(
        () => onShoppingListCustomItemRemove(customItemId),
        'Could not remove custom shopping list item.'
      );
    });
  }

  useEffect(() => {
    if (!activeSourcePopoverRenderKey) {
      return;
    }

    const hasActiveSourcePopoverItem = shoppingListSections.some((section) =>
      section.items.some((item) => item.renderKey === activeSourcePopoverRenderKey)
    );

    if (!hasActiveSourcePopoverItem) {
      closeSourcePopover();
    }
  }, [activeSourcePopoverRenderKey, shoppingListSections]);

  useEffect(() => {
    if (!activeSourcePopoverRenderKey) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest('[data-shopping-list-source-disclosure="true"]')
      ) {
        return;
      }

      closeSourcePopover();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeSourcePopover();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeSourcePopoverRenderKey]);

  return (
    <TabbedPanelLayout backgroundVariant="default">
      <header className="mb-6 min-[900px]:mb-8">
        <div className="flex items-center justify-between gap-3 min-[900px]:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <MobileNavigationTrigger className="min-[720px]:hidden" />
            <h1 className={pageTitleClass}>Shopping list</h1>
          </div>
          {!isCustomItemFormOpen ? (
            <button
              type="button"
              className={cn(
                elevatedBrandIconActionButtonClass,
                'min-[900px]:mt-[0.6rem] size-[1.85rem] shrink-0 min-[900px]:size-[2.1rem]'
              )}
              onClick={showCustomItemForm}
              aria-label="Add a custom shopping list item"
              aria-controls={customItemFormId}
            >
              <PlusIcon className="size-[1.34rem] min-[900px]:size-[1.62rem]" />
            </button>
          ) : null}
        </div>
      </header>

      {shoppingListUpdateError ? (
        <ErrorPillMessage className="mb-4">
          {shoppingListUpdateError}
        </ErrorPillMessage>
      ) : null}

      {isCustomItemFormOpen ? (
        <>
          <ShoppingListCustomItemForm
            canSubmit={canSubmitCustomItem}
            draft={customItemDraft}
            formId={customItemFormId}
            isSaving={shoppingListCustomItemAddAction.isPending}
            onClose={hideCustomItemForm}
            onDraftChange={updateCustomItemDraft}
            onSubmit={handleCustomItemSubmit}
          />
          {shoppingListCustomItemAddAction.error ? (
            <InlineMessage className="-mt-3 mb-6 text-[0.88rem]">
              {shoppingListCustomItemAddAction.error}
            </InlineMessage>
          ) : null}
        </>
      ) : null}

      {!hasLoadedRecipes ? (
        <ShoppingListPageSkeleton />
      ) : shoppingListSections.length ? (
        <div className="grid gap-4">
          {shoppingListSections.map((section) => (
            <ShoppingListSectionCard
              key={section.id}
              section={section}
              activeSourcePopoverRenderKey={activeSourcePopoverRenderKey}
              isCustomItemPending={(customItemId) => pendingCustomItemIds.has(customItemId)}
              isItemPending={(renderKey) => pendingItemKeys.has(renderKey)}
              onCustomItemRemove={(customItemId) => {
                void handleCustomItemRemove(customItemId);
              }}
              onItemToggle={(item, checked) => {
                void handleShoppingListItemToggle(item, checked);
              }}
              onSourcePopoverRenderKeyChange={setActiveSourcePopoverRenderKey}
            />
          ))}
        </div>
      ) : (
        emptyShoppingListState
      )}
    </TabbedPanelLayout>
  );
}
