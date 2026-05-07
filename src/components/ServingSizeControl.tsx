import { ChevronIcon } from './ChevronIcon';
import { cn } from '../helpers/uiClasses';

type ServingSizeControlProps = {
  value: number;
  ariaLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
  onChange: (nextValue: number) => void;
  min?: number;
  max?: number;
  isDisabled?: boolean;
  isDecreaseDisabled?: boolean;
  isIncreaseDisabled?: boolean;
  controlClassName?: string;
  buttonClassName?: string;
  valueClassName?: string;
  valueNumberClassName?: string;
  valueLabelClassName?: string;
};

export function ServingSizeControl({
  value,
  ariaLabel,
  decreaseLabel,
  increaseLabel,
  onChange,
  min = 1,
  max,
  isDisabled,
  isDecreaseDisabled,
  isIncreaseDisabled,
  controlClassName,
  buttonClassName,
  valueClassName,
  valueNumberClassName,
  valueLabelClassName
}: ServingSizeControlProps) {
  const isAtMinimum = value <= min;
  const isAtMaximum = max !== undefined && value >= max;
  const shouldDisableDecrease = Boolean(isDisabled || isDecreaseDisabled || isAtMinimum);
  const shouldDisableIncrease = Boolean(isDisabled || isIncreaseDisabled || isAtMaximum);
  const combinedControlClassName = cn(
    'inline-flex items-center gap-0 rounded-full border border-app-line-strong bg-app-surface-tint p-1 shadow-[0_8px_22px_rgba(31,64,54,0.06)]',
    controlClassName
  );
  const combinedButtonClassName = cn(
    'inline-flex size-[1.95rem] items-center justify-center rounded-full bg-transparent text-app-brand-strong transition enabled:hover:bg-app-button-tint enabled:focus-visible:bg-app-button-tint focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45',
    buttonClassName
  );
  const combinedValueClassName = cn(
    'mx-0.5 inline-flex h-[1.95rem] min-w-[6.2rem] items-center justify-center gap-[0.28rem] border-x border-app-line-strong px-[0.7rem] text-center text-[0.94rem] font-semibold leading-none text-app-brand-strong',
    valueClassName
  );
  const combinedValueLabelClassName = cn(
    'text-[0.68rem] uppercase tracking-[0.12em] text-app-muted-soft',
    valueLabelClassName
  );
  const combinedValueNumberClassName = cn(
    'text-[1.15rem] font-bold text-app-ink',
    valueNumberClassName
  );

  return (
    <div
      className={combinedControlClassName}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className={combinedButtonClassName}
        onClick={() => {
          if (shouldDisableDecrease) {
            return;
          }

          onChange(Math.max(min, value - 1));
        }}
        aria-label={decreaseLabel}
        disabled={shouldDisableDecrease}
      >
        <ChevronIcon className="size-[1.35rem]" strokeWidth={2.35} />
      </button>
      <strong className={combinedValueClassName}>
        <span className={combinedValueNumberClassName}>{value}</span>
        <span className={combinedValueLabelClassName}>
          {value === 1 ? 'serving' : 'servings'}
        </span>
      </strong>
      <button
        type="button"
        className={combinedButtonClassName}
        onClick={() => {
          if (shouldDisableIncrease) {
            return;
          }

          onChange(max === undefined ? value + 1 : Math.min(max, value + 1));
        }}
        aria-label={increaseLabel}
        disabled={shouldDisableIncrease}
      >
        <ChevronIcon direction="right" className="size-[1.35rem]" strokeWidth={2.35} />
      </button>
    </div>
  );
}
