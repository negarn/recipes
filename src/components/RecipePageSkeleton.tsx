import { cn, contentPanelClass, pageShellClass } from '../helpers/uiClasses';

const skeletonBlockClass =
  'relative overflow-hidden rounded-full bg-app-button-tint/82 animate-pulse';

function RecipeHeaderSkeleton() {
  return (
    <section className={cn(contentPanelClass, 'pb-0 min-[720px]:pb-0')} aria-hidden="true">
      <div className="grid gap-0">
        <div className="-mx-[1.1rem] border-b border-app-field-border px-[1.1rem] pb-4 min-[720px]:-mx-6 min-[720px]:px-6 min-[720px]:pb-5">
          <div className="flex min-w-0 items-center gap-3 min-[720px]:gap-4">
            <span
              className={cn(
                skeletonBlockClass,
                'h-[2.35rem] w-[2.35rem] shrink-0 min-[720px]:h-[2.6rem] min-[720px]:w-[2.6rem]'
              )}
            />
            <div className="grid min-w-0 flex-1 gap-2">
              <span
                className={cn(
                  skeletonBlockClass,
                  'h-[1.7rem] w-[72%] rounded-[12px] min-[720px]:h-[2.05rem]'
                )}
              />
            </div>
          </div>
        </div>

        <div className="-mx-[1.1rem] grid gap-2 border-t border-app-field-border bg-app-meal-day-chip/65 px-[1.1rem] py-2 min-[720px]:-mx-6 min-[720px]:px-6 min-[720px]:py-3">
          <div className="grid min-w-0 gap-2.5 min-[720px]:hidden">
            <div className="flex min-w-0 flex-wrap items-stretch gap-2.5">
              <span className={cn(skeletonBlockClass, 'h-[2.35rem] w-[5.8rem]')} />
              <span className={cn(skeletonBlockClass, 'h-[2.35rem] w-[6.7rem]')} />
              <span className={cn(skeletonBlockClass, 'h-[2.35rem] w-[4.8rem]')} />
            </div>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={cn(skeletonBlockClass, 'h-[2.1rem] min-w-0 flex-1 rounded-full')} />
              <span className={cn(skeletonBlockClass, 'size-[2.6rem] shrink-0')} />
            </div>
          </div>

          <div className="hidden min-w-0 min-[720px]:flex min-[720px]:flex-nowrap min-[720px]:items-center min-[720px]:justify-end min-[720px]:gap-3">
            <span className={cn(skeletonBlockClass, 'h-[2.35rem] w-[6rem]')} />
            <span className={cn(skeletonBlockClass, 'h-[2.35rem] w-[6.9rem]')} />
            <span className={cn(skeletonBlockClass, 'h-[2.1rem] w-[7.2rem] rounded-full')} />
            <span className={cn(skeletonBlockClass, 'size-[2.6rem] shrink-0')} />
          </div>
        </div>
      </div>
    </section>
  );
}

function IngredientsCardSkeleton() {
  return (
    <article className={cn(contentPanelClass, 'min-w-0')} aria-hidden="true">
      <div className="mb-3 grid gap-3 min-[720px]:mb-5 min-[720px]:flex min-[720px]:items-center min-[720px]:justify-between">
        <span className={cn(skeletonBlockClass, 'h-[1.75rem] w-[8.6rem] rounded-[12px]')} />
        <div className="flex w-full items-center justify-center min-[720px]:w-auto min-[720px]:justify-end">
          <div className="grid h-[2.6rem] w-full max-w-[22rem] grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-[0.16rem] rounded-full border border-app-field-border p-[0.16rem] min-[720px]:w-[9.4rem] min-[720px]:max-w-none">
            <span className={cn(skeletonBlockClass, 'h-[2.06rem] w-[2rem]')} />
            <span className={cn(skeletonBlockClass, 'h-[2.06rem] w-full')} />
            <span className={cn(skeletonBlockClass, 'h-[2.06rem] w-[2rem]')} />
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-0">
        {Array.from({ length: 10 }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-app-field-border py-[0.9rem] last:border-b-0"
          >
            <span
              className={cn(
                skeletonBlockClass,
                'h-[1.02rem] w-[72%] rounded-[10px]',
                rowIndex % 3 === 0 && 'w-[58%]',
                rowIndex % 3 === 1 && 'w-[82%]'
              )}
            />
            <span
              className={cn(
                skeletonBlockClass,
                'h-[1rem] w-[4.6rem] justify-self-end rounded-[10px]'
              )}
            />
          </div>
        ))}
      </div>
    </article>
  );
}

function NutritionCardSkeleton({ mobileOnly = false }: { mobileOnly?: boolean }) {
  return (
    <article
      className={cn(contentPanelClass, mobileOnly ? 'min-[900px]:hidden' : 'hidden min-[900px]:block')}
      aria-hidden="true"
    >
      <div className="mb-5">
        <span className={cn(skeletonBlockClass, 'h-[1.7rem] w-[7.1rem] rounded-[12px]')} />
      </div>

      <div className="overflow-hidden rounded-[24px] border border-app-field-border">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 border-b border-app-field-border bg-app-meal-day-chip/70 p-3">
          <span className={cn(skeletonBlockClass, 'h-[0.9rem] w-[4.8rem] rounded-[8px]')} />
          <span
            className={cn(
              skeletonBlockClass,
              'h-[0.9rem] w-[3.2rem] justify-self-end rounded-[8px]'
            )}
          />
          <span
            className={cn(
              skeletonBlockClass,
              'h-[0.9rem] w-[2.2rem] justify-self-end rounded-[8px]'
            )}
          />
        </div>
        <div className="grid gap-0 p-3">
          {Array.from({ length: 8 }, (_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-app-field-border py-2 last:border-b-0"
            >
              <span
                className={cn(
                  skeletonBlockClass,
                  'h-[0.95rem] rounded-[8px]',
                  rowIndex % 2 === 0 ? 'w-[64%]' : 'w-[52%]'
                )}
              />
              <span
                className={cn(
                  skeletonBlockClass,
                  'h-[0.95rem] w-[3.5rem] justify-self-end rounded-[8px]'
                )}
              />
              <span
                className={cn(
                  skeletonBlockClass,
                  'h-[0.95rem] w-[2.3rem] justify-self-end rounded-[8px]'
                )}
              />
            </div>
          ))}
        </div>
        <div className="border-t border-app-field-border p-3">
          <span className={cn(skeletonBlockClass, 'h-[0.85rem] w-[74%] rounded-[8px]')} />
        </div>
      </div>
    </article>
  );
}

function MethodSectionSkeleton({
  titleWidthClass,
  stepCount = 3,
  timerRowIndexes = [],
  showMarkCooked = false
}: {
  titleWidthClass: string;
  stepCount?: number;
  timerRowIndexes?: number[];
  showMarkCooked?: boolean;
}) {
  return (
    <article className={cn(contentPanelClass, 'min-w-0 flex flex-col')} aria-hidden="true">
      <div className="mb-5">
        <span className={cn(skeletonBlockClass, 'h-[1.7rem] rounded-[12px]', titleWidthClass)} />
      </div>

      <div className="grid min-w-0 gap-[0.9rem]">
        {Array.from({ length: stepCount }, (_, rowIndex) => (
          <div key={rowIndex} className="grid min-w-0 gap-[0.55rem]">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-[0.8rem]">
              <span className={cn(skeletonBlockClass, 'mt-[0.15rem] size-[1.2rem] rounded-[5px]')} />
              <div className="grid min-w-0 gap-[0.35rem]">
                <span
                  className={cn(
                    skeletonBlockClass,
                    'h-[1.02rem] rounded-[10px]',
                    rowIndex % 3 === 0 && 'w-[88%]',
                    rowIndex % 3 === 1 && 'w-[74%]',
                    rowIndex % 3 === 2 && 'w-[82%]'
                  )}
                />
                {rowIndex % 2 === 0 ? (
                  <span
                    className={cn(
                      skeletonBlockClass,
                      'h-[1.02rem] w-[62%] rounded-[10px]'
                    )}
                  />
                ) : null}
              </div>
            </div>
            {timerRowIndexes.includes(rowIndex) ? (
              <div className="ml-8 flex min-h-[2.2rem] items-center">
                <span className={cn(skeletonBlockClass, 'h-[2.1rem] w-[5.8rem]')} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {showMarkCooked ? (
        <div className="mt-4">
          <span className={cn(skeletonBlockClass, 'h-[2.2rem] w-[8.8rem]')} />
        </div>
      ) : null}
    </article>
  );
}

function NotesCardSkeleton() {
  return (
    <article className={cn(contentPanelClass, 'bg-app-meal-row')} aria-hidden="true">
      <div className="mb-5">
        <span className={cn(skeletonBlockClass, 'h-[1.7rem] w-[5.1rem] rounded-[12px]')} />
      </div>

      <div className="grid gap-4">
        <span className={cn(skeletonBlockClass, 'h-32 w-full rounded-[22px]')} />
        <div className="flex justify-end">
          <span className={cn(skeletonBlockClass, 'h-[2.2rem] w-[5.2rem]')} />
        </div>
      </div>
    </article>
  );
}

export function RecipePageSkeleton() {
  return (
    <div className={pageShellClass} role="status" aria-label="Loading recipe">
      <main className="grid gap-4 min-[720px]:gap-6">
        <RecipeHeaderSkeleton />

        <section className="grid gap-4 min-[720px]:gap-6 min-[900px]:grid-cols-[minmax(22rem,29rem)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4 min-[720px]:gap-6">
            <IngredientsCardSkeleton />
            <NutritionCardSkeleton />
          </div>

          <div className="flex min-w-0 flex-col gap-4 min-[720px]:gap-6">
            <MethodSectionSkeleton titleWidthClass="w-[4.9rem]" stepCount={2} />
            <MethodSectionSkeleton
              titleWidthClass="w-[4.3rem]"
              stepCount={5}
              timerRowIndexes={[1, 2, 3]}
              showMarkCooked
            />
            <NutritionCardSkeleton mobileOnly />
            <NotesCardSkeleton />
          </div>
        </section>
      </main>
    </div>
  );
}
