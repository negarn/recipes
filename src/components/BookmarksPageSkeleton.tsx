import { homePageRecipeCardClass } from '../helpers/homePageRecipeCardStyles';
import { cn } from '../helpers/uiClasses';

const skeletonBlockClass =
  'relative overflow-hidden rounded-full bg-app-button-tint/82 animate-pulse';

function BookmarkSkeletonRow({ rowIndex }: { rowIndex: number }) {
  return (
    <article
      className={cn(
        homePageRecipeCardClass,
        'pointer-events-none flex flex-col !h-auto !min-h-[4.35rem] !gap-0 !p-0 min-[720px]:!min-h-0',
        '!border-app-field-border !bg-app-meal-row'
      )}
      aria-hidden="true"
    >
      <div className="relative flex min-h-[4.35rem] min-w-0 w-full items-center px-4 py-3 min-[720px]:min-h-[4.75rem] min-[720px]:px-4 min-[720px]:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 min-[720px]:gap-3">
          <span
            className={cn(
              skeletonBlockClass,
              'size-[1.9rem] shrink-0 rounded-full min-[720px]:size-[2rem]'
            )}
          />
          <span
            className={cn(
              skeletonBlockClass,
              'h-[0.92rem] w-[62%] rounded-[10px]',
              rowIndex % 3 === 0 && 'w-[52%]',
              rowIndex % 3 === 1 && 'w-[44%]',
              rowIndex % 3 === 2 && 'w-[70%]'
            )}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2.5 min-[720px]:gap-3">
          <span
            className={cn(
              skeletonBlockClass,
              'size-[27px] rounded-full'
            )}
          />
          <span
            className={cn(
              skeletonBlockClass,
              'size-[30px] rounded-full'
            )}
          />
        </div>
      </div>
    </article>
  );
}

export function BookmarksPageSkeleton() {
  return (
    <div className="grid gap-4" role="status" aria-label="Loading bookmarks">
      <BookmarkSkeletonRow rowIndex={0} />
      <BookmarkSkeletonRow rowIndex={1} />
      <BookmarkSkeletonRow rowIndex={2} />
    </div>
  );
}
