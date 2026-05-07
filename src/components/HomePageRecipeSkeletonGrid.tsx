import { cn } from '../helpers/uiClasses';
import { homePageRecipeCardClass } from '../helpers/homePageRecipeCardStyles';
import { HOME_PAGE_RECIPES_PER_PAGE } from '../hooks/useHomePageRecipeList';

const skeletonBlockClass =
  'relative overflow-hidden rounded-full bg-app-button-tint/82 animate-pulse';

export function HomePageRecipeSkeletonGrid() {
  return (
    <div
      className="relative z-10 grid flex-1 grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-5"
      role="status"
      aria-label="Loading recipes"
    >
      {Array.from({ length: HOME_PAGE_RECIPES_PER_PAGE }, (_, index) => (
        <article
          key={index}
          className={cn(homePageRecipeCardClass, 'pointer-events-none')}
          aria-hidden="true"
        >
          <div className="grid gap-2">
            <div className="grid w-full justify-items-start gap-2">
              <div
                className={cn(
                  skeletonBlockClass,
                  'h-[1.7rem] w-[78%] rounded-xl',
                  index % 3 === 0 && 'w-[92%]'
                )}
              />
              <div className={cn(skeletonBlockClass, 'h-[1.15rem] w-[5.1rem]')} />
            </div>
            <div className={cn(skeletonBlockClass, 'h-4 w-[58%] rounded-[10px]')} />
          </div>

          <div className="mt-auto flex items-center gap-2">
            <span className={cn(skeletonBlockClass, 'h-7 w-[4.6rem]')} />
            <span className={cn(skeletonBlockClass, 'h-7 w-[6.25rem]')} />
          </div>
        </article>
      ))}
    </div>
  );
}
