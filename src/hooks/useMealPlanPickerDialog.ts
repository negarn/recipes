import { getTodayMealPlanDateString } from '../helpers/mealPlanData';
import { useMealPlanPickerState } from './useMealPlanPickerState';
import type { MealPlanPickerDialogProps } from '../components/MealPlanPickerDialog';

type UseMealPlanPickerDialogOptions<TSelection> = {
  dateActionLabelPrefix?: string;
  errorMessage: string;
  formatTitle: (selection: TSelection) => string;
  headerLabel?: string;
  minDate?: string;
  onSelectDate: (selection: TSelection, date: string) => Promise<void>;
};

export function useMealPlanPickerDialog<TSelection>({
  dateActionLabelPrefix,
  errorMessage,
  formatTitle,
  headerLabel,
  minDate = getTodayMealPlanDateString(),
  onSelectDate
}: UseMealPlanPickerDialogOptions<TSelection>) {
  const mealPlanPicker = useMealPlanPickerState<TSelection | null>(null);
  const selection = mealPlanPicker.selection;

  function open(nextSelection: TSelection, date = new Date()) {
    mealPlanPicker.open(nextSelection, date);
  }

  function close() {
    mealPlanPicker.close(null);
  }

  function reset() {
    mealPlanPicker.reset(null);
  }

  async function submit(date: string) {
    if (!selection || mealPlanPicker.action.isPending) {
      return false;
    }

    return mealPlanPicker.action.run(
      () => onSelectDate(selection, date),
      errorMessage,
      {
        onSuccess: () => {
          mealPlanPicker.setSelection(null);
        }
      }
    );
  }

  const dialogProps: MealPlanPickerDialogProps | null = selection
    ? {
        dateActionLabelPrefix,
        errorMessage: mealPlanPicker.action.error,
        headerLabel,
        isSaving: mealPlanPicker.action.isPending,
        minDate,
        onClose: close,
        onMonthChange: mealPlanPicker.setVisibleMonth,
        onSelectDate: (date) => {
          void submit(date);
        },
        title: formatTitle(selection),
        visibleMonth: mealPlanPicker.visibleMonth
      }
    : null;

  return {
    action: mealPlanPicker.action,
    close,
    dialogProps,
    open,
    reset,
    selection
  };
}
