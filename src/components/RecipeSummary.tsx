import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  formatRecipeTitle,
  getRecipeTags
} from '../helpers/recipeMetadata';
import { formatCookTimeLabel } from '../helpers/recipeTiming';
import {
  cardTagChipClass,
  chipClass,
  cn,
  displayHeadingClass,
  metaLabelClass
} from '../helpers/uiClasses';
import { RecipeRatingStars } from './RecipeRatingStars';
import type { RecipePageLocationState } from '../types/app';
import type { Recipe } from '../types/recipe';

const recipeCardPaddingClass = 'p-[0.95rem] min-[720px]:p-[1.18rem]';

function RecipeSummaryChip({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn(chipClass, className)}>{children}</span>;
}

export function RecipeMetadataChips({
  chipClassName,
  className,
  recipe,
  timeLabel,
  timeLabelClassName,
  timePosition = 'end'
}: {
  chipClassName?: string;
  className?: string;
  recipe: Recipe;
  timeLabel?: string;
  timeLabelClassName?: string;
  timePosition?: 'end' | 'start';
}) {
  const recipeTags = getRecipeTags(recipe);
  const formattedCookTime = formatCookTimeLabel(recipe.totalTime);
  const timeChip = (
    <RecipeSummaryChip className={chipClassName}>
      {timeLabel ? (
        <>
          <span className={cn(metaLabelClass, timeLabelClassName)}>{timeLabel}</span>
          <strong className="text-[1.1rem]">{formattedCookTime}</strong>
        </>
      ) : (
        formattedCookTime
      )}
    </RecipeSummaryChip>
  );
  const tagChips = recipeTags.map((tag) => (
    <RecipeSummaryChip key={tag} className={chipClassName}>
      {tag}
    </RecipeSummaryChip>
  ));

  return (
    <div className={className}>
      {timePosition === 'start' ? timeChip : null}
      {tagChips}
      {timePosition === 'end' ? timeChip : null}
    </div>
  );
}

function RecipeSummaryHeading({
  recipe,
  ratingClassName,
  showRating = false,
  titleClassName,
  titleWrapClassName
}: {
  recipe: Recipe;
  ratingClassName?: string;
  showRating?: boolean;
  titleClassName?: string;
  titleWrapClassName?: string;
}) {
  const formattedRecipeTitle = formatRecipeTitle(recipe.title);

  return (
    <div className={cn('grid w-full justify-items-start gap-2', titleWrapClassName)}>
      <h3 className={cn(displayHeadingClass, 'm-0', titleClassName)}>
        {formattedRecipeTitle}
      </h3>
      {showRating && recipe.rating !== undefined ? (
        <RecipeRatingStars
          rating={recipe.rating}
          className={ratingClassName}
        />
      ) : null}
    </div>
  );
}

function RecipeSummaryLink({
  className,
  children,
  recipe,
  ratingClassName,
  showRating = false,
  state,
  titleClassName,
  titleWrapClassName,
  to
}: {
  children?: ReactNode;
  className?: string;
  recipe: Recipe;
  ratingClassName?: string;
  showRating?: boolean;
  state?: RecipePageLocationState;
  titleClassName?: string;
  titleWrapClassName?: string;
  to: string;
}) {
  return (
    <Link className={className} to={to} state={state}>
      <RecipeSummaryHeading
        recipe={recipe}
        ratingClassName={ratingClassName}
        showRating={showRating}
        titleClassName={titleClassName}
        titleWrapClassName={titleWrapClassName}
      />
      {children}
    </Link>
  );
}

export function RecipeCard({
  action,
  className,
  recipe,
  state,
  to,
}: {
  action?: ReactNode;
  className?: string;
  recipe: Recipe;
  state?: RecipePageLocationState;
  to: string;
}) {
  return (
    <article
      className={cn('relative', className)}
      style={{ padding: 0 }}
    >
      {action}
      <RecipeSummaryLink
        className={cn(
          'relative z-10 flex min-w-0 flex-1 cursor-pointer flex-col gap-[0.9rem] rounded-[inherit] focus-visible:outline-none focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)]',
          recipeCardPaddingClass
        )}
        recipe={recipe}
        ratingClassName="text-[1.26rem] min-[720px]:text-[1.35rem]"
        showRating
        state={state}
        titleClassName="min-w-0 pr-12 text-[1.18rem] leading-[1.08] tracking-[-0.03em] min-[720px]:pr-13 min-[720px]:text-[1.34rem] min-[720px]:tracking-[-0.035em]"
        to={to}
      >
        <RecipeMetadataChips
          chipClassName={cardTagChipClass}
          className="mt-auto flex flex-wrap items-end gap-2"
          recipe={recipe}
          timePosition="start"
        />
      </RecipeSummaryLink>
    </article>
  );
}

export function RecipeListRow({
  actions,
  className,
  recipe,
  state,
  to
}: {
  actions?: ReactNode;
  className?: string;
  recipe: Recipe;
  state?: RecipePageLocationState;
  to: string;
}) {
  const formattedRecipeTitle = formatRecipeTitle(recipe.title);

  return (
    <article className={cn('group relative', className)}>
      <Link
        className="absolute inset-0 z-10 rounded-[16px] cursor-pointer focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)] focus-visible:outline-none"
        to={to}
        state={state}
        aria-label={`Open ${formattedRecipeTitle}`}
      />

      <div className="flex flex-col gap-2 min-[720px]:flex-row min-[720px]:items-center min-[720px]:gap-4">
        <RecipeSummaryHeading
          recipe={recipe}
          titleClassName="m-0 text-[1.1rem] leading-[1.08] tracking-[-0.03em] transition group-hover:text-app-brand-strong min-[720px]:text-[1.18rem]"
          titleWrapClassName="min-w-0 flex-1"
        />
        <div className="flex w-full flex-col items-start gap-1.5 min-[720px]:ml-auto min-[720px]:w-auto min-[720px]:shrink-0 min-[720px]:flex-row min-[720px]:items-center min-[720px]:justify-end">
          <RecipeMetadataChips
            chipClassName={cardTagChipClass}
            className="flex flex-wrap items-center gap-2 min-[720px]:flex-nowrap min-[720px]:justify-end"
            recipe={recipe}
          />
          {actions ? (
            <div className="relative z-20 flex w-full flex-wrap items-center justify-end gap-1.5 pt-0.5 min-[720px]:w-auto min-[720px]:shrink-0 min-[720px]:flex-nowrap min-[720px]:gap-2 min-[720px]:pt-0">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
