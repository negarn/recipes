import {
  cn,
  subheadingChipClass,
  subheadingLabelClass
} from '../helpers/uiClasses';

const skeletonBlockClass =
  'relative overflow-hidden rounded-full bg-app-button-tint/82 animate-pulse';

function ShoppingListSkeletonRow({
  rowIndex
}: {
  rowIndex: number;
}) {
  return (
    <article
      className="rounded-[20px] border border-app-field-border bg-app-meal-row p-4 shadow-[0_10px_24px_rgba(31,64,54,0.04)]"
      aria-hidden="true"
    >
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1">
        <span className={cn(skeletonBlockClass, 'mt-[0.08rem] size-[1.62rem]')} />

        <span
          className={cn(
            skeletonBlockClass,
            'h-[1.2rem] w-[72%] rounded-[10px]',
            rowIndex % 3 === 0 && 'w-[56%]',
            rowIndex % 3 === 1 && 'w-[66%]'
          )}
        />
        <span className={cn(skeletonBlockClass, 'size-[1.62rem] rounded-[10px]')} />

        <span className={cn(skeletonBlockClass, 'col-start-2 h-[1rem] w-[6rem] rounded-[10px]')} />
      </div>
    </article>
  );
}

export function ShoppingListPageSkeleton() {
  return (
    <div className="grid gap-4" role="status" aria-label="Loading shopping list">
      {Array.from({ length: 3 }, (_, sectionIndex) => (
        <section
          key={sectionIndex}
          className="grid gap-2 pt-5 first:pt-0 min-[720px]:gap-2.5 min-[720px]:pt-6 min-[720px]:first:pt-0"
          aria-hidden="true"
        >
          <h2
            className={cn(
              subheadingLabelClass,
              subheadingChipClass
            )}
          >
            <span className={cn(skeletonBlockClass, 'h-[1.02rem] w-[6.8rem] rounded-[10px]')} />
          </h2>

          <div className="grid gap-2.5 min-[720px]:gap-3">
            {Array.from({ length: sectionIndex === 0 ? 4 : 3 }, (_, rowIndex) => (
              <ShoppingListSkeletonRow
                key={rowIndex}
                rowIndex={rowIndex + sectionIndex}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
