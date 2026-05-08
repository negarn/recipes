import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatRecipeTitle } from '../helpers/recipeMetadata';
import { cn, iconButtonClass } from '../helpers/uiClasses';
import { EllipsisIcon } from './EllipsisIcon';
import { IconActionButton } from './IconActionButton';
import type { Recipe } from '../types/recipe';

const recipeCardMenuButtonClass = cn(
  iconButtonClass,
  'size-[2.15rem] min-[720px]:size-[2.25rem]',
  'shadow-[0_12px_24px_rgba(31,64,54,0.08)]',
  'ring-0',
  'focus-visible:ring-2 focus-visible:ring-app-brand-strong focus-visible:ring-offset-0'
);

const recipeCardMenuButtonSurfaceClass = cn(
  '!border-app-card-accent-line !bg-app-meal-day-chip !text-app-ink-soft',
  'enabled:hover:!bg-app-meal-day-chip',
  'enabled:focus-visible:!bg-app-meal-day-chip'
);

const recipeCardMenuPanelClass =
  'fixed z-50 w-[13.5rem] max-w-[calc(100vw-2rem)] rounded-[18px] border border-app-field-border bg-app-surface-strong p-2.5 shadow-[0_16px_32px_rgba(31,64,54,0.12)]';

const recipeCardMenuItemClass =
  'flex w-full items-center rounded-[12px] px-3 py-2 text-[0.94rem] font-semibold text-app-ink transition hover:bg-app-button-tint hover:text-app-brand-strong focus-visible:bg-app-button-tint focus-visible:text-app-brand-strong focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)] focus-visible:outline-none';

const recipeCardMenuLinkClass = cn(recipeCardMenuItemClass, 'cursor-pointer');
const recipeCardMenuButtonClassName = cn(
  recipeCardMenuItemClass,
  'enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-45'
);

type RecipeCardMenuPanelPosition = {
  left: number;
  top: number;
};

export function HomePageRecipeCardMenu({
  buttonClassName,
  buttonSurfaceClassName,
  className,
  isAddToMealPlanDisabled = false,
  isOpen,
  onAddToMealPlan,
  onClose,
  onEdit,
  onToggle,
  preferredPanelAlignment = 'end',
  recipe
}: {
  buttonClassName?: string;
  buttonSurfaceClassName?: string;
  className?: string;
  isAddToMealPlanDisabled?: boolean;
  isOpen: boolean;
  onAddToMealPlan: () => void;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
  preferredPanelAlignment?: 'start' | 'end';
  recipe: Pick<Recipe, 'title'>;
}) {
  const menuId = useId();
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const editLinkRef = useRef<HTMLButtonElement | null>(null);
  const [panelPosition, setPanelPosition] =
    useState<RecipeCardMenuPanelPosition | null>(null);
  const formattedRecipeTitle = formatRecipeTitle(recipe.title);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPanelPosition(null);
      return;
    }

    const menuContainer = menuContainerRef.current;

    if (!menuContainer) {
      return;
    }

    const viewportPadding = 16;
    const menuContainerRect = menuContainer.getBoundingClientRect();
    const panelWidth = Math.min(216, window.innerWidth - viewportPadding * 2);
    const canAlignStart =
      menuContainerRect.left + panelWidth <= window.innerWidth - viewportPadding;
    const nextPanelAlignment =
      preferredPanelAlignment === 'start' && canAlignStart ? 'start' : 'end';
    const unclampedLeft =
      nextPanelAlignment === 'start'
        ? menuContainerRect.left
        : menuContainerRect.right - panelWidth;
    const left = Math.max(
      viewportPadding,
      Math.min(unclampedLeft, window.innerWidth - viewportPadding - panelWidth)
    );
    const panelGap = 6;
    const panelEstimatedHeight = 116;
    const topBelow = menuContainerRect.bottom + panelGap;
    const topAbove = menuContainerRect.top - panelGap - panelEstimatedHeight;
    const hasRoomBelow =
      topBelow + panelEstimatedHeight <= window.innerHeight - viewportPadding;

    setPanelPosition({
      left,
      top: hasRoomBelow ? topBelow : Math.max(viewportPadding, topAbove)
    });
  }, [isOpen, preferredPanelAlignment]);

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
    <div
      className={cn(
        'absolute right-[0.78rem] top-[0.78rem] z-20 min-[720px]:right-[0.9rem] min-[720px]:top-[0.9rem]',
        className
      )}
    >
      <div ref={menuContainerRef} data-recipe-card-menu="true" className="relative">
        <IconActionButton
          className={cn(
            recipeCardMenuButtonClass,
            buttonSurfaceClassName ?? recipeCardMenuButtonSurfaceClass,
            isOpen &&
              '!-translate-y-px !shadow-[0_10px_22px_rgba(31,64,54,0.08)]',
            buttonClassName
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

        {isOpen && panelPosition && typeof document !== 'undefined'
          ? createPortal(
              <div
                id={menuId}
                data-recipe-card-menu="true"
                role="menu"
                aria-label={`${formattedRecipeTitle} actions`}
                className={recipeCardMenuPanelClass}
                style={panelPosition}
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
              </div>,
              document.body
            )
          : null}
      </div>
    </div>
  );
}
