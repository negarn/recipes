import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { RecipeCreateForm, createRecipeCreateFormInitialValues } from '../components/RecipeCreateForm';
import type { Recipe } from '../types/recipe';

const fixture: Recipe = {
  id: 'optional-nutrition-demo',
  title: 'Roasted carrots',
  defaultServings: 2,
  totalTime: '25 mins',
  isVegan: true,
  isVegetarian: true,
  tags: ['vegan'],
  ingredients: [{ id: 'carrots', name: 'Carrots', amount: { type: 'scalable', quantity: 500, unit: { singular: 'g' } } }],
  sections: [
    { id: 'prep', title: 'Prep', steps: ['Chop 500g of carrots.'] },
    { id: 'cook', title: 'Cook', steps: ['Roast until tender.'] }
  ]
};

const meta = {
  title: 'Recipes/Optional nutrition',
  component: RecipeCreateForm,
  args: {
    initialValues: createRecipeCreateFormInitialValues(fixture),
    originalRecipe: fixture,
    formId: 'nutrition-form',
    isSaving: false,
    savingLabel: 'Saving…',
    closeLabel: 'Close editor',
    submitLabel: 'Save recipe',
    onSubmit: fn(),
    onClose: fn()
  },
  decorators: [(Story) => <div className="mx-auto max-w-[1200px] p-4"><Story /></div>]
} satisfies Meta<typeof RecipeCreateForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CaloriesOnly: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('spinbutton', { name: 'Calories' }), '520');
    await userEvent.click(canvas.getByRole('button', { name: 'Save recipe' }));
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    await expect(args.onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      nutrition: { sourceServings: 1, values: { calories: 520 } }
    }));
  }
};

export const ClearCaloriesKeepProtein: Story = {
  args: {
    initialValues: createRecipeCreateFormInitialValues({
      ...fixture, nutrition: { sourceServings: 1, values: { calories: 520, protein: 24 } }
    }),
    onSubmit: fn()
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('spinbutton', { name: 'Carbs (g)' })).toHaveValue(null);
    await userEvent.clear(canvas.getByRole('spinbutton', { name: 'Calories' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Save recipe' }));
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    await expect(args.onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      nutrition: { sourceServings: 1, values: { protein: 24 } }
    }));
  }
};
