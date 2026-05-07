import { RecipeRatingSelector } from './RecipeRatingSelector';
import { chipClass, cn } from '../helpers/uiClasses';

export function EditableRecipeRating({
  rating,
  onChange,
  isDisabled
}: {
  rating?: number;
  onChange: (nextRating: number) => void;
  isDisabled?: boolean;
}) {
  return (
    <fieldset
      className={cn(
        chipClass,
        'w-full max-w-full min-h-[2.6rem] flex-wrap items-center justify-between gap-2.5 whitespace-normal px-[0.82rem] py-[0.4rem] min-[720px]:w-auto min-[720px]:min-h-[2.6rem] min-[720px]:justify-start min-[720px]:gap-2.5 min-[720px]:flex-nowrap min-[720px]:px-[0.9rem] min-[720px]:py-[0.38rem] min-[720px]:whitespace-nowrap'
      )}
      disabled={isDisabled}
    >
      <legend className="sr-only">Update recipe rating</legend>
      <span className="inline-flex items-center leading-none text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-app-muted min-[720px]:text-[0.74rem] min-[720px]:tracking-[0.13em]">
        Rating
      </span>
      <div className="inline-flex items-center max-w-full leading-none">
        <RecipeRatingSelector
          rating={rating}
          isDisabled={isDisabled}
          onChange={onChange}
          starsClassName="-translate-y-[0.03em] text-[1.38rem] min-[720px]:-translate-y-[0.02em] min-[720px]:text-[1.6rem]"
        />
      </div>
    </fieldset>
  );
}
