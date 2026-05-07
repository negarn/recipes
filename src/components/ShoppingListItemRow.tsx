import { Link } from 'react-router-dom';
import type { MouseEvent } from 'react';
import { CheckIcon } from './CheckIcon';
import { CloseIcon } from './CloseIcon';
import { IconActionButton } from './IconActionButton';
import {
  SourceDisclosurePopover,
  sourceDisclosureContentClass,
  sourceDisclosureLinkClass
} from './SourceDisclosurePopover';
import { getRecipeRoutePath } from '../helpers/appRoutes';
import { formatMealPlanDayLabel } from '../helpers/mealPlan';
import { createShoppingListRecipePageState } from '../helpers/recipePageNavigation';
import { cn, surfaceListItemCardClass } from '../helpers/uiClasses';
import type { ShoppingListItem } from '../helpers/shoppingList';

const shoppingListCheckButtonClass =
  'mt-[0.08rem] inline-flex size-[1.62rem] shrink-0 items-center justify-center rounded-full border transition enabled:cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none';

export function ShoppingListItemRow({
  isPending,
  isSourcePopoverOpen,
  item,
  onCustomItemRemove,
  onItemToggle,
  onSourcePopoverClose,
  onSourcePopoverToggle
}: {
  isPending: boolean;
  isSourcePopoverOpen: boolean;
  item: ShoppingListItem;
  onCustomItemRemove: (customItemId: string) => void;
  onItemToggle: (item: ShoppingListItem, checked: boolean) => void;
  onSourcePopoverClose: () => void;
  onSourcePopoverToggle: () => void;
}) {
  const customItemId = item.customItemId;
  const sourcesPopoverId = `shopping-list-sources-${item.renderKey}`;

  function handleRowClick(event: MouseEvent<HTMLElement>) {
    if (isPending) {
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest('[data-shopping-list-ignore-toggle="true"]')
    ) {
      return;
    }

    onItemToggle(item, !item.isChecked);
  }

  return (
    <article
      className={cn(
        surfaceListItemCardClass,
        'relative',
        isPending ? 'cursor-not-allowed' : 'cursor-pointer',
        '!border-app-field-border !bg-app-meal-row',
        item.isChecked && '!border-app-line !bg-app-surface'
      )}
      onClick={handleRowClick}
    >
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0">
        <IconActionButton
          className={cn(
            shoppingListCheckButtonClass,
            'row-span-2',
            item.isChecked
              ? 'border-app-field-border bg-app-button-tint text-app-brand-strong shadow-[0_6px_14px_rgba(31,64,54,0.08)]'
              : 'border-app-field-border bg-app-surface-tint text-app-brand-strong hover:border-app-brand-strong hover:text-app-brand-strong focus-visible:border-app-brand-strong focus-visible:text-app-brand-strong'
          )}
          disabled={isPending}
          label={
            item.isChecked
              ? `Mark ${item.ingredientName} as not bought`
              : `Mark ${item.ingredientName} as bought`
          }
          useBaseStyles={false}
        >
          <CheckIcon
            className={cn(
              'size-[1.02rem] transition',
              item.isChecked ? 'opacity-100' : 'opacity-0'
            )}
            strokeWidth={2.15}
          />
        </IconActionButton>

        <button
          type="button"
          className={cn(
            'col-start-2 row-start-1 w-fit max-w-full cursor-pointer rounded-[8px] bg-transparent p-0 text-left text-[1.02rem] leading-[1.15] font-semibold text-app-ink transition hover:text-app-brand-strong focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70',
            !item.isChecked && 'focus-visible:text-app-brand-strong',
            item.isChecked && 'text-app-muted line-through'
          )}
          disabled={isPending}
          aria-label={
            item.isChecked
              ? `Mark ${item.ingredientName} as not bought`
              : `Mark ${item.ingredientName} as bought`
          }
        >
          {item.ingredientName}
        </button>

        {item.sources.length ? (
          <SourceDisclosurePopover
            className="col-start-3 row-start-1 justify-self-end"
            dataAttributes={{
              'data-shopping-list-ignore-toggle': 'true',
              'data-shopping-list-source-disclosure': 'true'
            }}
            id={sourcesPopoverId}
            isOpen={isSourcePopoverOpen}
            onToggle={onSourcePopoverToggle}
            buttonClassName={cn(
              item.isChecked && 'text-app-muted',
              isSourcePopoverOpen && 'text-app-brand-strong'
            )}
            buttonLabel={`Show recipes using ${item.ingredientName}`}
          >
            <div className={sourceDisclosureContentClass}>
              {item.sources.map((source, sourceIndex) => (
                <p
                  key={`${item.renderKey}-${source.date}-${source.recipeId}-${sourceIndex}`}
                  className={cn('m-0', item.isChecked && 'text-app-muted-soft')}
                >
                  <span className={cn(item.isChecked && 'line-through')}>
                    {formatMealPlanDayLabel(source.date)} ·{' '}
                  </span>
                  <Link
                    to={getRecipeRoutePath(source.recipeId)}
                    state={createShoppingListRecipePageState()}
                    className={cn(sourceDisclosureLinkClass, item.isChecked && 'line-through text-app-muted-soft')}
                    onClick={onSourcePopoverClose}
                  >
                    {source.recipeTitle}
                  </Link>
                </p>
              ))}
            </div>
          </SourceDisclosurePopover>
        ) : customItemId ? (
          <div
            className="col-start-3 row-start-1 justify-self-end"
            data-shopping-list-ignore-toggle="true"
          >
            <IconActionButton
              className="inline-flex size-[1.62rem] cursor-pointer items-center justify-center rounded-full border border-app-field-border bg-app-surface-tint text-app-muted-soft transition hover:border-app-danger hover:text-app-danger focus-visible:border-app-danger focus-visible:text-app-danger focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => {
                onCustomItemRemove(customItemId);
              }}
              disabled={isPending}
              label={`Remove ${item.ingredientName}`}
              useBaseStyles={false}
            >
              <CloseIcon className="size-[1.24rem]" strokeWidth={2.35} />
            </IconActionButton>
          </div>
        ) : null}

        <strong
          className={cn(
            'col-start-2 row-start-2 -mt-[0.24rem] text-[0.94rem] leading-[1.15] font-medium text-app-brand-strong',
            item.isChecked && 'text-app-muted-soft line-through'
          )}
        >
          {item.amountLabel}
        </strong>
      </div>
    </article>
  );
}
