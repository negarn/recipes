import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { RecipeCreateForm, createRecipeCreateFormInitialValues } from '../components/RecipeCreateForm';
import type { Recipe } from '../types/recipe';

const fixture: Recipe = {
  id: 'scaling-check-demo', title: 'Broccoli burgers', defaultServings: 2, totalTime: '25 mins',
  isVegan: false, isVegetarian: false, tags: [],
  ingredients: [
    { id: 'broccoli', name: 'Broccoli', amount: { type: 'scalable', quantity: 250, unit: { singular: 'g' } } },
    { id: 'beef', name: 'Ground beef', amount: { type: 'scalable', quantity: 400, unit: { singular: 'g' } } }
  ],
  sections: [
    { id: 'prep', title: 'Prep', steps: ['Chop 250 of broccoli.'] },
    { id: 'cook', title: 'Cook', steps: ['Shape the beef into 4 burgers and fry for 10 minutes.'] }
  ]
};

const meta = {
  title: 'Recipes/Serving size check',
  component: RecipeCreateForm,
  args: {
    initialValues: createRecipeCreateFormInitialValues(fixture), originalRecipe: fixture,
    formId: 'scaling-form', isSaving: false, savingLabel: 'Saving…', closeLabel: 'Close editor', submitLabel: 'Save recipe',
    onSubmit: fn(), onClose: fn()
  },
  decorators: [(Story) => <div className="mx-auto max-w-[1200px] p-4"><Story /></div>]
} satisfies Meta<typeof RecipeCreateForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReviewIssues: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Check scaling' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Found 2 items to review.');
    await expect(canvas.queryAllByRole('term')).toHaveLength(0);
  }
};

export const FixAndSave: Story = {
  args: { onSubmit: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Check scaling' }));
    await userEvent.click(canvas.getAllByRole('button', { name: 'Edit step' })[0]);
    const prep = canvas.getByRole('textbox', { name: 'Prep steps (optional)' }) as HTMLTextAreaElement;
    await expect(prep).toHaveFocus();
    await expect(prep.value.slice(prep.selectionStart, prep.selectionEnd)).toBe('250 of broccoli');
    await userEvent.clear(prep);
    await userEvent.type(prep, 'Chop 250g of broccoli.');
    await userEvent.click(canvas.getByRole('button', { name: 'Scale count' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('No likely scaling issues found.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save recipe' }));
    await expect(args.onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      prepSteps: ['Chop 250g of broccoli.'],
      cookSteps: ['Shape the beef into {{amount|4|burger|burgers}} and fry for 10 minutes.']
    }));
  }
};

export const KeepFixed: Story = {
  args: { onSubmit: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Check scaling' }));
    await userEvent.click(canvas.getAllByRole('button', { name: 'Keep fixed' })[0]);
    await userEvent.click(canvas.getByRole('button', { name: 'Keep fixed' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('No likely scaling issues found.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save recipe' }));
    await expect(args.onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      prepSteps: ['Chop {{fixed|250 of broccoli}}.'],
      cookSteps: ['Shape the beef into {{fixed|4 burgers}} and fry for 10 minutes.']
    }));
  }
};

export const SaveAnyway: Story = {
  args: { onSubmit: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Save recipe' }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await expect(canvas.getByRole('status')).toHaveTextContent('Found 2 items to review.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save anyway' }));
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await userEvent.type(canvas.getByRole('textbox', { name: 'Cook steps' }), ' Serve in 2 bowls.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save recipe' }));
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await expect(canvas.getByRole('button', { name: 'Save anyway' })).toBeEnabled();
  }
};

export const InvalidDraft: Story = {
  args: { initialValues: { ...createRecipeCreateFormInitialValues(fixture), ingredients: '250g broccoli' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Check scaling' }));
    await expect(canvas.getByRole('alert')).toHaveTextContent('Ingredient line 1 must use "amount | ingredient".');
  }
};

export const OptionalPrepSteps: Story = {
  args: {
    initialValues: {
      ...createRecipeCreateFormInitialValues(fixture),
      prepSteps: 'Wash the broccoli.',
      cookSteps: 'Cook 250g of broccoli with 400g of beef until tender.'
    },
    onSubmit: fn()
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const prep = canvas.getByRole('textbox', { name: 'Prep steps (optional)' });
    await userEvent.clear(prep);
    await userEvent.click(canvas.getByRole('button', { name: 'Save recipe' }));
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    await expect(args.onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      prepSteps: [],
      cookSteps: ['Cook 250g of broccoli with 400g of beef until tender.']
    }));
  }
};

const turmericFixture: Recipe = {
  ...fixture,
  id: 'turmeric-marinade', title: 'Turmeric marinade and rice',
  ingredients: [{ id: 'ground-turmeric', name: 'Ground turmeric', amount: { type: 'scalable', quantity: 1.5, unit: { singular: 'tsp' } } }],
  sections: [
    { id: 'prep', title: 'Prep', steps: ['Add 2 tsp of turmeric to the marinade and blend until smooth.'] },
    { id: 'cook', title: 'Cook', steps: ['Add 1/2 tsp of turmeric to the rice.'] }
  ]
};

export const AmountMismatch: Story = {
  args: {
    initialValues: createRecipeCreateFormInitialValues(turmericFixture),
    originalRecipe: turmericFixture,
    onSubmit: fn()
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Save recipe' }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await expect(canvas.getByRole('status')).toHaveTextContent('Found 1 item to review.');
    await expect(canvas.getByText('Amount mismatch', { exact: true })).toBeVisible();
    await expect(canvas.getByText(/The prep and cook amounts total 2.5 tsp of Ground turmeric, but the ingredient list has 1.5 tsp/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Edit step' }));
    const prep = canvas.getByRole('textbox', { name: 'Prep steps (optional)' }) as HTMLTextAreaElement;
    await expect(prep.value.slice(prep.selectionStart, prep.selectionEnd)).toBe('2 tsp of turmeric');
    await userEvent.click(canvas.getByRole('button', { name: 'Save anyway' }));
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
  }
};

export const MismatchUpdates: Story = {
  args: {
    initialValues: {
      ...createRecipeCreateFormInitialValues(turmericFixture),
      prepSteps: 'Add 1 tsp of turmeric to the marinade.'
    },
    originalRecipe: turmericFixture
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Check scaling' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('No likely scaling issues found.');
    const prep = canvas.getByRole('textbox', { name: 'Prep steps (optional)' });
    await userEvent.clear(prep);
    await userEvent.type(prep, 'Add 2 tsp of turmeric to the marinade.');
    await expect(canvas.getByRole('status')).toHaveTextContent('Found 1 item to review.');
    const ingredients = canvas.getByRole('textbox', { name: /Ingredients and amounts/ });
    await userEvent.clear(ingredients);
    await userEvent.type(ingredients, '2.5 tsp | Ground turmeric');
    await expect(canvas.getByRole('status')).toHaveTextContent('No likely scaling issues found.');
    await userEvent.clear(ingredients);
    await userEvent.type(ingredients, '1.5 tsp | Ground turmeric');
    await expect(canvas.getByRole('status')).toHaveTextContent('Found 1 item to review.');
    await userEvent.clear(prep);
    await userEvent.type(prep, 'Add 1 tsp of turmeric to the marinade.');
    await expect(canvas.getByRole('status')).toHaveTextContent('No likely scaling issues found.');
  }
};

const parsleyFixture: Recipe = {
  ...fixture,
  id: 'parsley-chowder',
  title: 'Prawn and chorizo chowder',
  defaultServings: 4,
  ingredients: [{
    id: 'fresh-parsley', name: 'Fresh parsley',
    amount: { type: 'scalable', quantity: 30, unit: { singular: 'g', separator: 'none' } }
  }],
  sections: [
    { id: 'prep', title: 'Prep', steps: ['Chop 3g of parsley.'] },
    { id: 'cook', title: 'Cook', steps: [
      'Stir 3/4 of the parsley through the chowder, saving the remainder for garnish.',
      'Ladle the chowder into bowls and sprinkle over the remaining parsley.'
    ] }
  ]
};

export const PrepAmountMismatch: Story = {
  args: {
    initialValues: createRecipeCreateFormInitialValues(parsleyFixture),
    originalRecipe: parsleyFixture,
    onSubmit: fn()
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Check scaling' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Found 1 item to review.');
    await expect(canvas.getByText(/This step specifies 3g of Fresh parsley, but the ingredient list has 30g/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Edit step' }));
    const prep = canvas.getByRole('textbox', { name: 'Prep steps (optional)' }) as HTMLTextAreaElement;
    await expect(prep).toHaveFocus();
    await expect(prep.value.slice(prep.selectionStart, prep.selectionEnd)).toBe('3g of parsley');
    await userEvent.clear(prep);
    await userEvent.type(prep, 'Chop 30g of parsley.');
    await expect(canvas.getByRole('status')).toHaveTextContent('No likely scaling issues found.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save recipe' }));
    await expect(args.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ prepSteps: ['Chop 30g of parsley.'] }));
  }
};
