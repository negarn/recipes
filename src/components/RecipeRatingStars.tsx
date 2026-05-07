import { useId } from 'react';
import { formatQuantity } from '../helpers/quantityFormatting';
import { cn } from '../helpers/uiClasses';

const RECIPE_STAR_PATH =
  'M12 1.85 15.14 8.21 22.16 9.23 17.08 14.18 18.28 21.16 12 17.86 5.72 21.16 6.92 14.18 1.84 9.23 8.86 8.21 12 1.85Z';

function formatRecipeRatingLabel(rating?: number) {
  return rating === undefined
    ? 'Not yet rated'
    : `${formatQuantity(rating)} out of 5 stars`;
}

function getStarFillPercentage(rating: number | undefined, starIndex: number) {
  const normalizedRating = rating ?? 0;
  const fillAmount = Math.max(0, Math.min(1, normalizedRating - starIndex));
  return fillAmount * 100;
}

export function RecipeRatingStars({
  rating,
  className,
  isDecorative = false
}: {
  rating?: number;
  className?: string;
  isDecorative?: boolean;
}) {
  const ratingId = useId().replace(/:/g, '');
  const combinedClassName = cn('inline-flex items-center gap-[0.06rem] leading-none', className);

  return (
    <span
      className={combinedClassName}
      role={isDecorative ? undefined : 'img'}
      aria-label={isDecorative ? undefined : formatRecipeRatingLabel(rating)}
      aria-hidden={isDecorative || undefined}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const clipPathId = `${ratingId}-star-${index}`;
        const filledWidth = (24 * getStarFillPercentage(rating, index)) / 100;

        return (
          <span
            key={index}
            className="relative inline-block size-[1em] flex-none"
            aria-hidden="true"
          >
            <svg className="block size-full overflow-visible" viewBox="0 0 24 24" focusable="false">
              <defs>
                <clipPath id={clipPathId} clipPathUnits="userSpaceOnUse">
                  <rect x="0" y="0" width={filledWidth} height="24" />
                </clipPath>
              </defs>
              <path className="fill-app-rating-star-empty" d={RECIPE_STAR_PATH} />
              <path
                className="fill-app-rating-star"
                d={RECIPE_STAR_PATH}
                clipPath={`url(#${clipPathId})`}
              />
            </svg>
          </span>
        );
      })}
    </span>
  );
}
