import { ContentPanelSection } from './ContentPanelSection';
import { InlineMessage } from './InlineMessage';
import { ServingSizeControl } from './ServingSizeControl';
import { formatIngredientAmount } from '../helpers/recipeDisplay';
import type { Recipe } from '../types/recipe';

export function RecipeIngredientsCard({
  defaultServingCount,
  errorMessage,
  isSaving,
  onServingCountChange,
  recipe,
  servingCount
}: {
  defaultServingCount: number;
  errorMessage?: string | null;
  isSaving?: boolean;
  onServingCountChange: (nextServingCount: number) => void;
  recipe: Recipe;
  servingCount: number;
}) {
  const servingSizeControl = (
    <ServingSizeControl
      value={servingCount}
      ariaLabel="Adjust serving size"
      decreaseLabel="Decrease servings"
      increaseLabel="Increase servings"
      onChange={onServingCountChange}
      min={1}
      isDisabled={isSaving}
      controlClassName="min-h-[2.3rem] w-full max-w-[22rem] justify-between p-[0.1rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_8px_18px_rgba(31,64,54,0.05)] min-[720px]:w-auto min-[720px]:max-w-none"
      buttonClassName="h-[1.84rem] w-[1.82rem] enabled:cursor-pointer"
      valueClassName="h-[1.84rem] min-w-0 flex-1 justify-center gap-[0.2rem] px-[0.5rem] min-[720px]:min-w-[5.9rem]"
      valueNumberClassName="text-[0.98rem]"
      valueLabelClassName="text-[0.54rem] tracking-[0.1em]"
    />
  );

  return (
    <ContentPanelSection
      title="Ingredients"
      headerSpacingClassName="mb-3 min-[720px]:mb-5"
      headerClassName="grid gap-3 min-[720px]:flex min-[720px]:items-center min-[720px]:justify-between"
      titleWrapClassName="min-w-0"
      actions={
        <div className="order-first flex w-full items-center justify-center whitespace-nowrap min-[720px]:order-none min-[720px]:ml-auto min-[720px]:w-auto min-[720px]:flex-none min-[720px]:justify-end">
          {servingSizeControl}
        </div>
      }
    >
      {errorMessage ? (
        <InlineMessage className="-mt-2 mb-4">
          {errorMessage}
        </InlineMessage>
      ) : null}

      <ul className="m-0 list-none p-0">
        {recipe.ingredients.map((ingredient) => (
          <li
            key={ingredient.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-app-field-border py-[0.9rem] first:pt-1 last:border-b-0"
          >
            <span>{ingredient.name}</span>
            <strong className="text-app-brand-strong">
              {formatIngredientAmount(ingredient, servingCount, defaultServingCount)}
            </strong>
          </li>
        ))}
      </ul>
    </ContentPanelSection>
  );
}
