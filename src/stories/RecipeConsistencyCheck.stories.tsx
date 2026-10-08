import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { RecipeCreateForm, createRecipeCreateFormInitialValues } from '../components/RecipeCreateForm';
import type { Recipe } from '../types/recipe';

const fixture: Recipe = {
  id: 'consistency-demo', title: 'Broccoli with feta', defaultServings: 2, totalTime: '10 mins',
  isVegan: false, isVegetarian: true, tags: [],
  ingredients: [
    { id: 'broccoli', name: 'Brocoli', amount: { type: 'fixed', text: 'As needed' } },
    { id: 'feta', name: 'Feta cheese', amount: { type: 'fixed', text: 'As needed' } }
  ],
  sections: [
    { id: 'prep', title: 'Prep', steps: ['Chop the broccoli.'] },
    { id: 'cook', title: 'Cook', steps: ['Mix the broccoli with the feta.'] }
  ]
};

const meta = {
  title: 'Recipes/Consistency check',
  component: RecipeCreateForm,
  args: {
    initialValues: createRecipeCreateFormInitialValues(fixture), originalRecipe: fixture,
    formId: 'consistency-form', isSaving: false, savingLabel: 'Saving…', closeLabel: 'Close editor', submitLabel: 'Save recipe',
    onSubmit: fn(), onClose: fn()
  },
  decorators: [(Story) => <div className="mx-auto max-w-[1200px] p-4"><Story /></div>]
} satisfies Meta<typeof RecipeCreateForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReviewAndCorrect: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const panel = within(canvas.getByRole('region', { name: 'Consistency check' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Check consistency' }));
    await expect(panel.getByRole('status')).toHaveTextContent('Found 2 consistency items to review.');
    await userEvent.click(panel.getAllByRole('button', { name: 'Edit ingredient' })[0]);
    const ingredients = canvas.getByRole('textbox', { name: /Ingredients and amounts/ }) as HTMLTextAreaElement;
    await expect(ingredients).toHaveFocus();
    await expect(ingredients.value.slice(ingredients.selectionStart, ingredients.selectionEnd)).toBe('Brocoli');
    await userEvent.click(panel.getByRole('button', { name: 'Use “Broccoli”' }));
    await userEvent.click(panel.getByRole('button', { name: 'Use “Feta”' }));
    await expect(panel.getByRole('status')).toHaveTextContent('No likely consistency issues found.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save recipe' }));
    await expect(args.onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      ingredients: [{ amountText: 'As needed', name: 'Broccoli' }, { amountText: 'As needed', name: 'Feta' }],
      prepSteps: ['Chop the broccoli.']
    }));
  }
};

export const SaveAnywayAndRecheck: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const panel = within(canvas.getByRole('region', { name: 'Consistency check' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Check scaling' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Save recipe' }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await expect(panel.getByRole('status')).toHaveTextContent('Found 2 consistency items to review.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save anyway' }));
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await userEvent.type(canvas.getByRole('textbox', { name: /Ingredients and amounts/ }), '\nAs needed | Tumeric');
    await userEvent.click(canvas.getByRole('button', { name: 'Save recipe' }));
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await expect(panel.getByRole('status')).toHaveTextContent('Found 3 consistency items to review.');
    await expect(canvas.getByRole('button', { name: 'Save anyway' })).toBeEnabled();
  }
};

const catalogFixture: Recipe = {
  ...fixture, id: 'catalog-demo', title: 'Galangal soup',
  ingredients: [{ id: 'root', name: 'Galangl', amount: { type: 'fixed', text: 'As needed' } }],
  sections: [{ id: 'cook', title: 'Cook', steps: ['Slice the galangal.'] }]
};

export const CompareOtherRecipes: Story = {
  args: {
    initialValues: createRecipeCreateFormInitialValues(catalogFixture), originalRecipe: catalogFixture,
    recipes: [{ ...catalogFixture, id: 'reference', ingredients: [{ ...catalogFixture.ingredients[0], name: 'Galangal' }] }]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = within(canvas.getByRole('region', { name: 'Consistency check' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Check consistency' }));
    await expect(panel.getByRole('status')).toHaveTextContent('Found 1 consistency item to review.');
    await userEvent.click(panel.getByRole('button', { name: 'Use “Galangal”' }));
    await expect(panel.getByRole('status')).toHaveTextContent('No likely consistency issues found.');
  }
};

export const InvalidDraft: Story = {
  args: { initialValues: { ...createRecipeCreateFormInitialValues(fixture), ingredients: 'Broccoli' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Check consistency' }));
    await expect(canvas.getByRole('alert')).toHaveTextContent('Ingredient line 1 must use "amount | ingredient".');
  }
};

export const PreserveBlankLinesAndAmounts: Story = {
  args: {
    initialValues: {
      ...createRecipeCreateFormInitialValues(fixture),
      ingredients: '\n  As needed |  Brocoli  \n\n  As needed | Feta\n',
      prepSteps: '\n  Chop the broccoli.  \n'
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = within(canvas.getByRole('region', { name: 'Consistency check' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Check consistency' }));
    await userEvent.click(panel.getByRole('button', { name: 'Use “Broccoli”' }));
    await expect(canvas.getByRole('textbox', { name: /Ingredients and amounts/ }))
      .toHaveValue('\n  As needed |  Broccoli  \n\n  As needed | Feta\n');
    await expect(canvas.getByRole('textbox', { name: 'Prep steps (optional)' }))
      .toHaveValue('\n  Chop the broccoli.  \n');
  }
};
