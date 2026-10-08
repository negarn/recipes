import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { RecipeCreateForm, createRecipeCreateFormInitialValues } from '../components/RecipeCreateForm';
import type { Recipe } from '../types/recipe';

const fixture: Recipe = {
  id: 'quick-chicken-biryani', title: 'Quick chicken biryani', defaultServings: 2,
  totalTime: '40 mins', isVegan: false, isVegetarian: false, tags: [],
  ingredients: [
    { id: 'green-onions', name: 'Green onion', amount: { type: 'scalable', quantity: 5, unit: { singular: 'x' } } },
    { id: 'rice', name: 'Rice', amount: { type: 'scalable', quantity: 200, unit: { singular: 'g', separator: 'none' } } }
  ],
  sections: [
    { id: 'prep', title: 'Prep', steps: ['Finely chop {{ingredient|green-onions|green onion|green onions}}.'] },
    { id: 'cook', title: 'Cook', steps: ['Cook {{ingredient|rice}} of rice for 20 minutes.'] }
  ]
};

const meta = {
  title: 'Recipes/Method editor',
  component: RecipeCreateForm,
  args: {
    initialValues: createRecipeCreateFormInitialValues(fixture), originalRecipe: fixture,
    formId: 'method-editor-form', isSaving: false, savingLabel: 'Saving…', closeLabel: 'Close editor', submitLabel: 'Save recipe',
    onSubmit: fn(), onClose: fn()
  },
  decorators: [(Story) => <div className="mx-auto max-w-[1200px] p-4"><Story /></div>]
} satisfies Meta<typeof RecipeCreateForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadableStepsPreserveLinks: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const prep = canvas.getByRole('textbox', { name: 'Prep steps (optional)' }) as HTMLTextAreaElement;
    const cook = canvas.getByRole('textbox', { name: 'Cook steps' });
    await expect(prep).toHaveValue('Finely chop 5 green onions.');
    await expect(cook).toHaveValue('Cook 200g of rice for 20 minutes.');
    prep.focus();
    prep.setSelectionRange(0, 'Finely'.length);
    await userEvent.keyboard('Roughly');
    await expect(prep).toHaveValue('Roughly chop 5 green onions.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save recipe' }));
    const saveAnyway = canvas.queryByRole('button', { name: 'Save anyway' });
    if (saveAnyway) {
      await userEvent.click(saveAnyway);
    }
    await expect(args.onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      prepSteps: ['Roughly chop {{ingredient|green-onions|green onion|green onions}}.'],
      cookSteps: fixture.sections[1].steps
    }));
  }
};
