import { formatRecipeTitle } from '../helpers/recipeMetadata';
import { useMealPlanPickerDialog } from './useMealPlanPickerDialog';

type AddToMealPlanSelection = {
  recipeId: string;
  recipeTitle: string;
};

export function useAddToMealPlanDialog(
  onMealPlanRecipeAdd: (recipeId: string, date: string) => Promise<void>
) {
  const mealPlanPicker = useMealPlanPickerDialog<AddToMealPlanSelection>({
    errorMessage: 'Could not add recipe to the meal plan.',
    formatTitle: (selection) => formatRecipeTitle(selection.recipeTitle),
    onSelectDate: (selection, date) => onMealPlanRecipeAdd(selection.recipeId, date)
  });
  const selectedRecipe = mealPlanPicker.selection;

  function open(selection: AddToMealPlanSelection, date = new Date()) {
    mealPlanPicker.open(selection, date);
  }

  return {
    action: mealPlanPicker.action,
    close: mealPlanPicker.close,
    dialogProps: mealPlanPicker.dialogProps,
    open,
    reset: mealPlanPicker.reset,
    selectedRecipe
  };
}
