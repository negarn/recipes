import { cn } from '../helpers/uiClasses';

const skeletonBlockClass =
  'relative overflow-hidden rounded-full bg-app-button-tint/82 animate-pulse';

export function SettingsPageSkeleton() {
  return (
    <section
      className="w-full max-w-[40rem] min-[1100px]:max-w-[96rem]"
      role="status"
      aria-label="Loading settings"
    >
      <div className="grid w-full gap-2.5" aria-hidden="true">
        <span className={cn(skeletonBlockClass, 'h-[2.15rem] w-[14.4rem] rounded-full')} />

        <div className="grid gap-4 rounded-[24px] border border-app-field-border bg-app-meal-row p-4 min-[1100px]:p-5">
          <div className="grid gap-2.5">
          <div className="grid gap-2">
            <span className={cn(skeletonBlockClass, 'h-[1.1rem] w-[90%] rounded-[10px]')} />
            <span className={cn(skeletonBlockClass, 'h-[1.1rem] w-[84%] rounded-[10px]')} />
            <span className={cn(skeletonBlockClass, 'h-[1.1rem] w-[62%] rounded-[10px]')} />
          </div>
          </div>

          <div className="grid min-w-0 w-full gap-2.5 border-t border-app-field-border/85 pt-3 min-[1100px]:grid-cols-[auto_auto] min-[1100px]:items-center min-[1100px]:justify-start min-[1100px]:gap-3 min-[1100px]:pt-3.5">
            <span className={cn(skeletonBlockClass, 'h-[2.78rem] w-full max-w-[18rem] rounded-full min-[1100px]:h-[2.58rem] min-[1100px]:w-[10.6rem]')} />
            <span className={cn(skeletonBlockClass, 'h-[2.78rem] w-full max-w-[18rem] rounded-full min-[1100px]:h-[2.58rem] min-[1100px]:w-[10.6rem]')} />
          </div>
        </div>
      </div>
    </section>
  );
}
