import { useEffect, useId, useRef } from 'react';
import { formatRecipeTitle } from '../helpers/recipeMetadata';
import { cn, iconButtonClass } from '../helpers/uiClasses';
import { EllipsisIcon } from './EllipsisIcon';
import { IconActionButton } from './IconActionButton';
import type { Recipe } from '../types/recipe';

const recipeCardMenuButtonClass = cn(
  iconButtonClass,
  'size-[2.15rem] min-[720px]:size-[2.25rem]',
  '!border-app-card-accent-line !bg-app-meal-day-chip !text-app-ink-soft',
  'shadow-[0_12px_24px_rgba(31,64,54,0.08)]',
  'ring-0',
  'focus-visible:ring-2 focus-visible:ring-app-brand-strong focus-visible:ring-offset-0',
  'enabled:hover:!bg-app-meal-day-chip',
  'enabled:focus-visible:!bg-app-meal-day-chip'
);

const recipeCardMenuPanelClass =
  'absolute right-0 top-[calc(100%+0.35rem)] z-30 w-[13.5rem] max-w-[calc(100vw-2rem)] rounded-[18px] border border-app-field-border bg-app-surface-strong p-2.5 shadow-[0_16px_32px_rgba(31,64,54,0.12)]';

const recipeCardMenuItemClass =
  'flex w-full items-center rounded-[12px] px-3 py-2 text-[0.94rem] font-semibold text-app-ink transition hover:bg-app-button-tint hover:text-app-brand-strong focus-visible:bg-app-button-tint focus-visible:text-app-brand-strong focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)] focus-visible:outline-none';

const recipeCardMenuLinkClass = cn(recipeCardMenuItemClass, 'cursor-pointer');
const recipeCardMenuButtonClassName = cn(
  recipeCardMenuItemClass,
  'enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-45'
);

export function HomePageRecipeCardMenu({
  isAddToMealPlanDisabled = false,
  isOpen,
  onAddToMealPlan,
  onClose,
  onEdit,
  onToggle,
  recipe
}: {
  isAddToMealPlanDisabled?: boolean;
  isOpen: boolean;
  onAddToMealPlan: () => void;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
  recipe: Pick<Recipe, 'title'>;
}) {
  const menuId = useId();
  const editLinkRef = useRef<HTMLButtonElement | null>(null);
  const formattedRecipeTitle = formatRecipeTitle(recipe.title);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusAnimationFrameId = window.requestAnimationFrame(() => {
      editLinkRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusAnimationFrameId);
    };
  }, [isOpen]);

  return (
    <div className="absolute right-[0.78rem] top-[0.78rem] z-20 min-[720px]:right-[0.9rem] min-[720px]:top-[0.9rem]">
      <div data-recipe-card-menu="true" className="relative">
        <IconActionButton
          className={cn(
            recipeCardMenuButtonClass,
            isOpen &&
              '!bg-app-meal-day-chip !-translate-y-px !shadow-[0_10px_22px_rgba(31,64,54,0.08)]'
          )}
          onClick={onToggle}
          label={`More actions for ${formattedRecipeTitle}`}
          aria-controls={menuId}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          useBaseStyles={false}
        >
          <EllipsisIcon className="size-[1.15rem]" />
        </IconActionButton>

        {isOpen ? (
          <div
            id={menuId}
            role="menu"
            aria-label={`${formattedRecipeTitle} actions`}
            className={recipeCardMenuPanelClass}
          >
            <div className="grid gap-1">
              <button
                ref={editLinkRef}
                type="button"
                role="menuitem"
                className={recipeCardMenuLinkClass}
                onClick={() => {
                  onClose();
                  onEdit();
                }}
              >
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                className={recipeCardMenuButtonClassName}
                disabled={isAddToMealPlanDisabled}
                onClick={() => {
                  onClose();
                  onAddToMealPlan();
                }}
              >
                Add to meal plan
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
