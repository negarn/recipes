import { formatQuantity } from '../helpers/quantityFormatting';
import { cn } from '../helpers/uiClasses';
import { RecipeRatingStars } from './RecipeRatingStars';

const recipeRatingOptions = Array.from({ length: 10 }, (_, index) => (index + 1) / 2);

export function RecipeRatingSelector({
  rating,
  isDisabled,
  onChange,
  onClear,
  starsClassName
}: {
  rating?: number;
  isDisabled?: boolean;
  onChange: (nextRating: number) => void;
  onClear?: () => void;
  starsClassName?: string;
}) {
  return (
    <div className="relative inline-flex items-center align-middle leading-none">
      <RecipeRatingStars
        rating={rating}
        className={cn('pointer-events-none', starsClassName)}
        isDecorative
      />
      <div className="absolute inset-0 grid grid-cols-10">
        {recipeRatingOptions.map((starValue) => {
          const isSelected = rating === starValue;

          return (
            <button
              key={starValue}
              type="button"
              className={cn(
                'relative block h-full rounded-[6px] focus-visible:shadow-[inset_0_0_0_2px_var(--color-app-line-focus)] focus-visible:outline-none',
                isDisabled ? 'cursor-progress opacity-55' : 'cursor-pointer'
              )}
              disabled={isDisabled}
              aria-label={
                isSelected && onClear
                  ? `Clear ${formatQuantity(starValue)} star rating`
                  : `Set rating to ${formatQuantity(starValue)} star${
                      starValue === 1 ? '' : 's'
                    }`
              }
              onClick={() => {
                if (isSelected && onClear) {
                  onClear();
                  return;
                }

                if (!isSelected) {
                  onChange(starValue);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
