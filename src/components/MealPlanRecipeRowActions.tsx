import { CalendarIcon } from './CalendarIcon';
import { CheckIcon } from './CheckIcon';
import { CloseIcon } from './CloseIcon';
import { IconActionButton } from './IconActionButton';

const mealPlanActionButtonBaseClass =
  'inline-flex shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-none enabled:cursor-pointer enabled:hover:-translate-y-px enabled:focus-visible:-translate-y-px disabled:cursor-default disabled:opacity-45 disabled:shadow-none';

export function MealPlanRecipeRowActions({
  changeDateLabel,
  formattedRecipeTitle,
  isPending,
  onChangeDate,
  onMarkAsCooked,
  onRemove,
  removeLabel
}: {
  changeDateLabel?: string;
  formattedRecipeTitle: string;
  isPending: boolean;
  onChangeDate: () => void;
  onMarkAsCooked?: () => void;
  onRemove: () => void;
  removeLabel?: string;
}) {
  return (
    <>
      {onMarkAsCooked ? (
        <IconActionButton
          className={`${mealPlanActionButtonBaseClass} size-[2.2rem] border-app-success-line bg-app-success-soft text-app-success shadow-[0_8px_16px_rgba(33,88,59,0.12)] enabled:hover:bg-app-button-tint enabled:hover:shadow-[0_12px_22px_rgba(33,88,59,0.18)] enabled:focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_12px_22px_rgba(33,88,59,0.18)] min-[720px]:size-[2.5rem]`}
          onClick={onMarkAsCooked}
          disabled={isPending}
          label={`Mark ${formattedRecipeTitle} as cooked`}
          useBaseStyles={false}
        >
          <CheckIcon className="size-[1.24rem] min-[720px]:size-[1.42rem]" />
        </IconActionButton>
      ) : null}
      <IconActionButton
        className={`${mealPlanActionButtonBaseClass} size-[2.2rem] border-app-field-border bg-app-surface-tint text-app-brand-strong shadow-[0_8px_16px_rgba(31,64,54,0.09)] enabled:hover:bg-app-button-tint enabled:hover:shadow-[0_12px_20px_rgba(31,64,54,0.14)] enabled:focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_12px_20px_rgba(31,64,54,0.14)] min-[720px]:size-[2.5rem]`}
        onClick={onChangeDate}
        disabled={isPending}
        label={changeDateLabel ?? `Change date for ${formattedRecipeTitle}`}
        useBaseStyles={false}
      >
        <CalendarIcon className="size-[1.26rem] min-[720px]:size-[1.44rem]" />
      </IconActionButton>
      <IconActionButton
        className={`${mealPlanActionButtonBaseClass} size-[2.2rem] border-app-danger-line bg-app-danger-action-soft text-app-danger shadow-[0_8px_16px_rgba(102,47,34,0.1)] enabled:hover:bg-app-danger-action-soft-hover enabled:hover:shadow-[0_12px_20px_rgba(102,47,34,0.16)] enabled:focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_12px_20px_rgba(102,47,34,0.16)] min-[720px]:size-[2.5rem]`}
        onClick={onRemove}
        disabled={isPending}
        label={removeLabel ?? `Remove ${formattedRecipeTitle} from meal plan`}
        useBaseStyles={false}
      >
        <CloseIcon className="size-[1.3rem] min-[720px]:size-[1.49rem]" />
      </IconActionButton>
    </>
  );
}
