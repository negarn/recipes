import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronIcon } from './ChevronIcon';
import { EditableRecipeRating } from './EditableRecipeRating';
import { HomePageRecipeCardMenu } from './HomePageRecipeCardMenu';
import { InlineMessage } from './InlineMessage';
import { RecipeMetadataChips } from './RecipeSummary';
import { formatRecipeTitle } from '../helpers/recipeMetadata';
import {
  circleBackLinkClass,
  chipClass,
  cn,
  contentPanelClass,
  displayHeadingClass
} from '../helpers/uiClasses';
import type { Recipe } from '../types/recipe';

const recipeMetaChipClass = cn(
  chipClass,
  'min-h-[2.6rem] gap-2 whitespace-nowrap px-[0.84rem] py-[0.4rem] [&>span]:text-[0.7rem] [&>span]:tracking-[0.1em] min-[720px]:min-h-[2.6rem] min-[720px]:px-[0.9rem] min-[720px]:py-[0.38rem] min-[720px]:[&>span]:text-[0.74rem] min-[720px]:[&>span]:tracking-[0.16em]'
);
const recipeBackLinkClass = cn(
  circleBackLinkClass,
  '!size-[1.85rem] min-[720px]:!size-[2.05rem]'
);

export function RecipePageHeader({
  backLinkLabel,
  backLinkTo,
  isAddToMealPlanDisabled,
  isRatingDisabled,
  onAddToMealPlanOpen,
  onEdit,
  onRatingChange,
  ratingError,
  recipe
}: {
  backLinkLabel: string;
  backLinkTo: string;
  isAddToMealPlanDisabled?: boolean;
  isRatingDisabled?: boolean;
  onAddToMealPlanOpen: () => void;
  onEdit: () => void;
  onRatingChange: (nextRating: number) => void;
  ratingError?: string | null;
  recipe: Recipe;
}) {
  const formattedRecipeTitle = formatRecipeTitle(recipe.title);
  const [isRecipeMenuOpen, setIsRecipeMenuOpen] = useState(false);

  useEffect(() => {
    setIsRecipeMenuOpen(false);
  }, [recipe.id]);

  useEffect(() => {
    if (!isRecipeMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest('[data-recipe-card-menu="true"]')
      ) {
        return;
      }

      setIsRecipeMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsRecipeMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecipeMenuOpen]);

  return (
    <section className={cn(contentPanelClass, 'overflow-visible pb-0 min-[720px]:pb-0')}>
      <div className="grid gap-0">
        <div className="-mx-[1.1rem] border-b border-app-field-border px-[1.1rem] pb-4 min-[720px]:-mx-6 min-[720px]:px-6 min-[720px]:pb-5">
          <div className="flex min-w-0 items-center gap-2 min-[720px]:gap-3">
            <Link
              className={recipeBackLinkClass}
              to={backLinkTo}
              aria-label={backLinkLabel}
              title={backLinkLabel}
            >
              <ChevronIcon className="size-[1.35rem] min-[720px]:size-[1.5rem]" />
            </Link>
            <h1
              className={cn(
                displayHeadingClass,
                'm-0 min-w-0 text-[clamp(1.7rem,3.2vw,2.6rem)] leading-[0.94] tracking-[-0.05em]'
              )}
            >
              {formattedRecipeTitle}
            </h1>
            <HomePageRecipeCardMenu
              buttonClassName={recipeBackLinkClass}
              buttonSurfaceClassName="border-app-line-strong bg-app-surface-tint text-app-brand-strong enabled:hover:bg-app-button-tint enabled:focus-visible:bg-app-button-tint"
              className="static z-30 shrink-0"
              isAddToMealPlanDisabled={isAddToMealPlanDisabled}
              isOpen={isRecipeMenuOpen}
              onAddToMealPlan={onAddToMealPlanOpen}
              onClose={() => {
                setIsRecipeMenuOpen(false);
              }}
              onEdit={onEdit}
              onToggle={() => {
                setIsRecipeMenuOpen((currentValue) => !currentValue);
              }}
              preferredPanelAlignment="start"
              recipe={recipe}
            />
          </div>
        </div>

        <div className="-mx-[1.1rem] grid gap-1.5 border-t border-app-field-border bg-app-meal-day-chip/65 px-[1.1rem] py-2 min-[720px]:-mx-6 min-[720px]:px-6 min-[720px]:py-3">
          <div className="grid min-w-0 gap-2.5 min-[720px]:hidden">
            <RecipeMetadataChips
              chipClassName={recipeMetaChipClass}
              className="flex min-w-0 flex-wrap items-stretch gap-2.5"
              recipe={recipe}
              timeLabel="Cook time"
              timeLabelClassName="text-[0.7rem] tracking-[0.1em] min-[720px]:text-[0.74rem] min-[720px]:tracking-[0.16em]"
              timePosition="end"
            />
            <EditableRecipeRating
              rating={recipe.rating}
              isDisabled={isRatingDisabled}
              onChange={onRatingChange}
            />
          </div>

          <div className="hidden min-w-0 min-[720px]:flex min-[720px]:flex-nowrap min-[720px]:items-center min-[720px]:justify-end min-[720px]:gap-3">
            <RecipeMetadataChips
              chipClassName={recipeMetaChipClass}
              className="min-[720px]:flex min-[720px]:shrink-0 min-[720px]:flex-nowrap min-[720px]:items-stretch min-[720px]:gap-3"
              recipe={recipe}
              timeLabel="Cook time"
              timeLabelClassName="text-[0.7rem] tracking-[0.1em] min-[720px]:text-[0.74rem] min-[720px]:tracking-[0.16em]"
              timePosition="end"
            />
            <EditableRecipeRating
              rating={recipe.rating}
              isDisabled={isRatingDisabled}
              onChange={onRatingChange}
            />
          </div>

          {ratingError ? (
            <InlineMessage className="justify-self-start min-[720px]:justify-self-end">
              {ratingError}
            </InlineMessage>
          ) : null}
        </div>
      </div>
    </section>
  );
}
