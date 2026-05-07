import { useState } from 'react';
import { getMonthStart } from '../helpers/mealPlan';
import { useAsyncAction } from './useAsyncAction';

export function useMealPlanPickerState<TSelection>(initialSelection: TSelection) {
  const [selection, setSelection] = useState(initialSelection);
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(new Date()));
  const action = useAsyncAction();

  function open(nextSelection: TSelection, date = new Date()) {
    action.clearError();
    setVisibleMonth(getMonthStart(date));
    setSelection(nextSelection);
  }

  function close(nextSelection: TSelection) {
    if (action.isPending) {
      return;
    }

    action.clearError();
    setSelection(nextSelection);
  }

  function reset(nextSelection: TSelection) {
    action.reset();
    setVisibleMonth(getMonthStart(new Date()));
    setSelection(nextSelection);
  }

  return {
    action,
    close,
    open,
    reset,
    selection,
    setSelection,
    setVisibleMonth,
    visibleMonth
  };
}
