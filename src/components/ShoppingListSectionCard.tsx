import { useState } from 'react';
import { CheckIcon } from './CheckIcon';
import { ChevronIcon } from './ChevronIcon';
import { ShoppingListItemRow } from './ShoppingListItemRow';
import {
  cn,
  subheadingChipClass,
  subheadingLabelClass,
  surfaceListItemCardClass
} from '../helpers/uiClasses';
import type { ShoppingListItem, ShoppingListSection } from '../helpers/shoppingList';

function getCheckedItemsSummary(items: ShoppingListItem[]) {
  const itemCountLabel = `${items.length} bought ${items.length === 1 ? 'item' : 'items'}`;
  const itemPreviewLabel = items
    .slice(0, 3)
    .map((item) => item.ingredientName)
    .join(', ');

  if (items.length <= 3) {
    return {
      itemCountLabel,
      itemPreviewLabel
    };
  }

  return {
    itemCountLabel,
    itemPreviewLabel: `${itemPreviewLabel} +${items.length - 3} more`
  };
}

export function ShoppingListSectionCard({
  activeSourcePopoverRenderKey,
  isCustomItemPending,
  isItemPending,
  onCustomItemRemove,
  onItemToggle,
  onSourcePopoverRenderKeyChange,
  section
}: {
  activeSourcePopoverRenderKey: string | null;
  isCustomItemPending: (customItemId: string) => boolean;
  isItemPending: (renderKey: string) => boolean;
  onCustomItemRemove: (customItemId: string) => void;
  onItemToggle: (item: ShoppingListItem, checked: boolean) => void;
  onSourcePopoverRenderKeyChange: (nextRenderKey: string | null) => void;
  section: ShoppingListSection;
}) {
  const [isCheckedItemsExpanded, setIsCheckedItemsExpanded] = useState(false);
  const checkedItems = section.items.filter((item) => item.isChecked);
  const uncheckedItems = section.items.filter((item) => !item.isChecked);
  const checkedItemsSummary = getCheckedItemsSummary(checkedItems);

  function renderItemRow(item: ShoppingListItem) {
    return (
      <ShoppingListItemRow
        key={item.renderKey}
        item={item}
        isPending={
          isItemPending(item.renderKey) ||
          (item.customItemId !== undefined && isCustomItemPending(item.customItemId))
        }
        isSourcePopoverOpen={activeSourcePopoverRenderKey === item.renderKey}
        onItemToggle={onItemToggle}
        onCustomItemRemove={onCustomItemRemove}
        onSourcePopoverClose={() => {
          onSourcePopoverRenderKeyChange(null);
        }}
        onSourcePopoverToggle={() => {
          onSourcePopoverRenderKeyChange(
            activeSourcePopoverRenderKey === item.renderKey ? null : item.renderKey
          );
        }}
      />
    );
  }

  function toggleCheckedItemsExpansion() {
    setIsCheckedItemsExpanded((currentValue) => {
      if (currentValue) {
        onSourcePopoverRenderKeyChange(null);
      }

      return !currentValue;
    });
  }

  return (
    <section className="grid gap-2 pt-5 first:pt-0 min-[720px]:gap-2.5 min-[720px]:pt-6 min-[720px]:first:pt-0">
      <h2
        className={cn(
          subheadingLabelClass,
          subheadingChipClass
        )}
      >
        {section.label}
      </h2>

      <div className="grid gap-2.5 min-[720px]:gap-3">
        {uncheckedItems.map(renderItemRow)}

        {checkedItems.length ? (
          <>
            <button
              type="button"
              className={cn(
                surfaceListItemCardClass,
                'grid min-h-[3.8rem] cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-app-line bg-app-surface text-left text-app-muted transition hover:border-app-field-border hover:bg-app-surface-tint focus-visible:border-app-brand-strong focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)] focus-visible:outline-none'
              )}
              aria-expanded={isCheckedItemsExpanded}
              onClick={toggleCheckedItemsExpansion}
            >
              <span className="inline-flex size-[1.62rem] items-center justify-center rounded-full border border-app-field-border bg-app-button-tint text-app-brand-strong">
                <CheckIcon className="size-[1.02rem]" strokeWidth={2.15} />
              </span>
              <span className="grid min-w-0 gap-1">
                <span className="text-[1rem] leading-[1.15] font-semibold text-app-ink">
                  {checkedItemsSummary.itemCountLabel}
                </span>
                <span className="truncate text-[0.86rem] leading-[1.2] font-medium text-app-muted-soft">
                  {checkedItemsSummary.itemPreviewLabel}
                </span>
              </span>
              <ChevronIcon
                className="size-[1.2rem] text-app-muted-soft"
                direction={isCheckedItemsExpanded ? 'up' : 'down'}
                strokeWidth={2.15}
              />
            </button>

            {isCheckedItemsExpanded ? checkedItems.map(renderItemRow) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
