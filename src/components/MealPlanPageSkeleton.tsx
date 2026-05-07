import {
  cn,
  subheadingChipClass,
  subheadingLabelClass
} from '../helpers/uiClasses';

const skeletonBlockClass =
  'relative overflow-hidden rounded-full bg-app-button-tint/82 animate-pulse';

function MealPlanSkeletonRow({
  showActions,
  rowIndex
}: {
  showActions: boolean;
  rowIndex: number;
}) {
  return (
    <article
      className="min-w-0 rounded-[24px] border border-app-field-border bg-app-meal-row p-3 shadow-[0_10px_24px_rgba(31,64,54,0.04)] min-[720px]:p-4"
      aria-hidden="true"
    >
      <div className="grid min-w-0 gap-2 min-[720px]:grid-cols-[minmax(0,1fr)_auto] min-[720px]:items-center min-[720px]:gap-3">
        <div className="grid min-w-0 flex-1 gap-2">
          <span
            className={cn(
              skeletonBlockClass,
              'h-[1.45rem] w-[68%] rounded-[12px]',
              rowIndex % 3 === 0 && 'w-[56%]',
              rowIndex % 3 === 1 && 'w-[74%]'
            )}
          />
          <span className={cn(skeletonBlockClass, 'h-[1.15rem] w-[7rem] rounded-[10px]')} />
        </div>

        <div className="grid min-w-0 gap-2 min-[720px]:hidden">
          <div className="flex items-center justify-start gap-2">
            <span className={cn(skeletonBlockClass, 'h-8 w-[5.2rem]')} />
          </div>
          {showActions ? (
            <div className="flex items-center justify-end gap-2">
              <span className={cn(skeletonBlockClass, 'size-8 shrink-0')} />
              <span className={cn(skeletonBlockClass, 'size-8 shrink-0')} />
              <span className={cn(skeletonBlockClass, 'size-8 shrink-0')} />
            </div>
          ) : null}
        </div>

        <div className="hidden min-[720px]:flex min-[720px]:shrink-0 min-[720px]:items-center min-[720px]:justify-end min-[720px]:gap-2">
          <span className={cn(skeletonBlockClass, 'h-8 w-[5.2rem]')} />
          {showActions ? (
            <>
              <span className={cn(skeletonBlockClass, 'size-8 shrink-0')} />
              <span className={cn(skeletonBlockClass, 'size-8 shrink-0')} />
              <span className={cn(skeletonBlockClass, 'size-8 shrink-0')} />
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function MealPlanPageSkeleton({
  tab
}: {
  tab: 'plan' | 'history';
}) {
  const daySectionRowCounts = tab === 'history' ? [2, 2, 1] : [2, 1, 1];
  const showActions = tab === 'plan';

  return (
    <div
      className="grid min-w-0 gap-4"
      role="status"
      aria-label={tab === 'history' ? 'Loading cooked history' : 'Loading meal plan'}
    >
      {daySectionRowCounts.map((rowCount, dayIndex) => (
        <section
          key={dayIndex}
          className="grid min-w-0 gap-2 pt-5 first:pt-0 min-[720px]:gap-2.5 min-[720px]:pt-6 min-[720px]:first:pt-0"
          aria-hidden="true"
        >
          <h2
            className={cn(
              subheadingLabelClass,
              subheadingChipClass
            )}
          >
            <span className={cn(skeletonBlockClass, 'h-[1.02rem] w-[8.7rem] rounded-[10px]')} />
          </h2>

          <div className="grid min-w-0 gap-2.5 min-[720px]:gap-3">
            {Array.from({ length: rowCount }, (_, rowIndex) => (
              <MealPlanSkeletonRow
                key={rowIndex}
                rowIndex={rowIndex + dayIndex}
                showActions={showActions}
              />
            ))}
          </div>
        </section>
      ))}

      {tab === 'history' ? (
        <div className="mt-auto flex items-center justify-center gap-3 pt-6" aria-hidden="true">
          <span className={cn(skeletonBlockClass, 'size-[2.6rem]')} />
          <span className={cn(skeletonBlockClass, 'h-[2rem] w-[9.6rem]')} />
          <span className={cn(skeletonBlockClass, 'size-[2.6rem]')} />
        </div>
      ) : null}
    </div>
  );
}
