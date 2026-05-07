import { formatActiveTimerCountdown } from '../helpers/recipeTiming';
import { cn } from '../helpers/uiClasses';

const timerButtonClass =
  'inline-flex min-h-[2.1rem] items-center justify-center rounded-full px-[0.8rem] py-[0.44rem] text-[0.86rem] font-bold leading-none whitespace-nowrap transition enabled:cursor-pointer enabled:hover:-translate-y-px enabled:hover:shadow-[0_10px_22px_rgba(31,64,54,0.08)] enabled:focus-visible:-translate-y-px enabled:focus-visible:shadow-[0_10px_22px_rgba(31,64,54,0.08)] focus-visible:outline-none';

const timerStrongButtonClass =
  'inline-flex min-h-[2.1rem] items-center justify-center rounded-full px-[0.85rem] py-[0.45rem] text-[0.86rem] font-bold leading-none whitespace-nowrap transition enabled:cursor-pointer enabled:hover:-translate-y-px enabled:focus-visible:-translate-y-px focus-visible:outline-none';

const timerStrongSetButtonClass =
  'border border-app-brand-strong bg-app-brand-strong text-app-on-accent shadow-[0_12px_24px_rgba(31,64,54,0.18)] enabled:hover:bg-app-brand-strong enabled:hover:brightness-[1.06] enabled:hover:shadow-[0_16px_28px_rgba(31,64,54,0.24)] enabled:focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_16px_28px_rgba(31,64,54,0.24)]';

const timerStrongActiveClass =
  'border border-app-brand-strong bg-app-brand-strong text-app-on-accent shadow-[0_12px_24px_rgba(31,64,54,0.2)]';

const timerStrongClearButtonClass =
  'border border-app-brand-strong bg-app-surface-strong text-app-brand-strong shadow-[0_10px_20px_rgba(31,64,54,0.1)] enabled:hover:bg-app-button-tint enabled:hover:shadow-[0_14px_24px_rgba(31,64,54,0.14)] enabled:focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_14px_24px_rgba(31,64,54,0.14)]';

export function TimerControls({
  activeTimerEndAt,
  className,
  clearLabel = 'Clear',
  doneLabel = 'Done',
  durationMs,
  onClear,
  onStart,
  setLabel = 'Set timer',
  tone = 'subtle',
  timerNow
}: {
  activeTimerEndAt?: number | null;
  className?: string;
  clearLabel?: string;
  doneLabel?: string;
  durationMs: number | null;
  onClear: () => void;
  onStart: (durationMs: number) => void;
  setLabel?: string;
  tone?: 'subtle' | 'strong';
  timerNow: number;
}) {
  const isTimerActive = typeof activeTimerEndAt === 'number';
  const remainingTimerMs = isTimerActive
    ? Math.max(0, activeTimerEndAt - timerNow)
    : 0;

  if (!isTimerActive && durationMs === null) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex min-h-[2.2rem] min-w-0 flex-wrap items-center gap-[0.55rem]',
        className
      )}
    >
      {isTimerActive ? (
        <>
          <span
            className={cn(
              'inline-flex min-h-[2.1rem] items-center justify-center rounded-full px-[0.8rem] py-[0.44rem] text-[0.86rem] font-bold leading-none whitespace-nowrap tracking-[0.04em] tabular-nums',
              remainingTimerMs === 0
                ? 'border border-app-danger bg-app-danger text-app-on-accent'
                : tone === 'strong'
                  ? timerStrongActiveClass
                  : 'bg-app-surface-tint text-app-brand-strong'
            )}
          >
            {remainingTimerMs === 0
              ? `${doneLabel} • ${formatActiveTimerCountdown(remainingTimerMs)}`
              : formatActiveTimerCountdown(remainingTimerMs)}
          </span>
          <button
            type="button"
            className={cn(
              tone === 'strong' ? timerStrongButtonClass : timerButtonClass,
              tone === 'strong'
                ? timerStrongClearButtonClass
                : 'border border-app-line-strong bg-app-button-surface text-app-brand-strong'
            )}
            onClick={onClear}
          >
            {clearLabel}
          </button>
        </>
      ) : (
        <button
          type="button"
          className={cn(
            tone === 'strong' ? timerStrongButtonClass : timerButtonClass,
            tone === 'strong'
              ? timerStrongSetButtonClass
              : 'bg-app-brand-soft text-app-brand-strong'
          )}
          onClick={() => onStart(durationMs ?? 0)}
        >
          {setLabel}
        </button>
      )}
    </div>
  );
}
