import { describe, expect, it } from 'vitest';
import { renderMethodStepText } from './recipeDisplay';
import type { Recipe } from '../types/recipe';

const baseRecipe: Recipe = {
  defaultServings: 2,
  id: 'test-recipe',
  ingredients: [
    {
      amount: {
        quantity: 1,
        type: 'scalable',
        unit: { singular: 'tsp' }
      },
      id: 'salt',
      name: 'salt'
    }
  ],
  isVegan: false,
  isVegetarian: true,
  sections: [
    {
      id: 'cook',
      steps: [],
      title: 'Cook'
    }
  ],
  tags: [],
  title: 'Test Recipe',
  totalTime: '10 min'
};

const redPepperRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 1,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'red-bell-pepper',
      name: 'Red bell pepper'
    }
  ]
};

const cucumberRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 0.5,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'cucumber',
      name: 'Cucumber'
    }
  ]
};

const stockCubeRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 0.5,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'stock-cube',
      name: 'Stock cube'
    }
  ]
};

const gingerRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 30,
        type: 'scalable',
        unit: { singular: 'g', separator: 'none' }
      },
      id: 'fresh-ginger',
      name: 'Fresh ginger'
    }
  ]
};

const chickenThighRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 4,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'chicken-thighs-boneless-skinless',
      name: 'Chicken thigh, boneless, skinless'
    }
  ]
};

const cannedOlivesRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 1,
        type: 'scalable',
        unit: { singular: 'can', plural: 'cans' }
      },
      id: 'sliced-black-olives',
      name: 'Sliced black olive'
    }
  ]
};

const naanRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 2,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'plain-naan-sangak',
      name: 'Plain naan / sangak'
    }
  ]
};

describe('renderMethodStepText', () => {
  it('scales valid literal fractions when servings change', () => {
    const step = 'Stir in 1/2 tsp salt.';

    const rendered = renderMethodStepText(step, baseRecipe, 4);

    expect(rendered).toBe('Stir in 1 tsp salt.');
  });

  it('leaves invalid literal fractions unchanged', () => {
    const step = 'Stir in 1/0 tsp salt.';

    const rendered = renderMethodStepText(step, baseRecipe, 4);

    expect(rendered).toBe(step);
  });

  it('scales literal count amounts when ingredient descriptors are included', () => {
    const step = 'De-seed 1 red pepper, then dice.';

    const rendered = renderMethodStepText(step, redPepperRecipe, 4);

    expect(rendered).toBe('De-seed 2 red peppers, then dice.');
  });

  it('scales fractional article amounts without leaving "of a" phrasing', () => {
    const step = 'Coarsely grate 1/2 of a cucumber';

    const rendered = renderMethodStepText(step, cucumberRecipe, 4);

    expect(rendered).toBe('Coarsely grate 1 cucumber');
  });

  it('scales fractional article amounts without leaving repeated article wording', () => {
    const step =
      'Add 1/2 a stock cube and 200g of orzo to the pan and stir to coat the orzo in the mix.';

    const rendered = renderMethodStepText(step, stockCubeRecipe, 4);

    expect(rendered).toBe(
      'Add 1 stock cube and 400g of orzo to the pan and stir to coat the orzo in the mix.'
    );
  });

  it('scales ingredient portions when servings change', () => {
    const step = 'Add {{ingredient-portion|fresh-ginger|1/4}} of the reserved ginger.';

    const rendered = renderMethodStepText(step, gingerRecipe, 4);

    expect(rendered).toBe('Add 15g of the reserved ginger.');
  });

  it('scales literal clove amounts when servings change', () => {
    const step = 'Slice 2 cloves of garlic.';

    const rendered = renderMethodStepText(step, baseRecipe, 4);

    expect(rendered).toBe('Slice 4 cloves of garlic.');
  });

  it('keeps duration ranges unchanged when servings change', () => {
    const step =
      'Stir and cook for 3-4 minutes until the onions are translucent and the peppers are getting soft.';

    const rendered = renderMethodStepText(step, redPepperRecipe, 4);

    expect(rendered).toBe(step);
  });

  it('keeps single literal durations unchanged when servings change', () => {
    const step = 'Simmer for 5 minutes, then rest.';

    const rendered = renderMethodStepText(step, baseRecipe, 4);

    expect(rendered).toBe('Simmer for 5 minutes, then rest.');
  });

  it('scales count amounts for comma-qualified ingredient names', () => {
    const step = 'Dice 4 chicken thighs.';

    const rendered = renderMethodStepText(step, chickenThighRecipe, 4);

    expect(rendered).toBe('Dice 8 chicken thighs.');
  });

  it('scales literal can amounts when servings change', () => {
    const step = 'Drain 1 can of sliced black olives.';

    const rendered = renderMethodStepText(step, cannedOlivesRecipe, 4);

    expect(rendered).toBe('Drain 2 cans of sliced black olives.');
  });

  it('scales count amounts for slash-separated ingredient aliases', () => {
    const step = 'Dice 2 naans into medium pieces.';

    const rendered = renderMethodStepText(step, naanRecipe, 4);

    expect(rendered).toBe('Dice 4 naans into medium pieces.');
  });
});
