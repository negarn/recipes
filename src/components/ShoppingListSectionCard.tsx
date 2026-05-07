import { ShoppingListItemRow } from './ShoppingListItemRow';
import {
  cn,
  subheadingChipClass,
  subheadingLabelClass
} from '../helpers/uiClasses';
import type { ShoppingListItem, ShoppingListSection } from '../helpers/shoppingList';

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
        {section.items.map((item) => (
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
        ))}
      </div>
    </section>
  );
}
