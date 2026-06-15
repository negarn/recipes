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
      id: 'sample-powder',
      name: 'sample powder'
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

const countIngredientRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 1,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'sample-item',
      name: 'Sample item'
    }
  ]
};

const fractionalItemRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 0.5,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'fractional-item',
      name: 'Fractional item'
    }
  ]
};

const fractionalArticleRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 0.5,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'sample-cube',
      name: 'Sample cube'
    }
  ]
};

const portionIngredientRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 30,
        type: 'scalable',
        unit: { singular: 'g', separator: 'none' }
      },
      id: 'sample-root',
      name: 'Sample root'
    }
  ]
};

const commaQualifiedRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 4,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'sample-pieces-trimmed-prepared',
      name: 'Sample piece, trimmed, prepared'
    }
  ]
};

const cannedIngredientRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 1,
        type: 'scalable',
        unit: { singular: 'can', plural: 'cans' }
      },
      id: 'sample-slices',
      name: 'Sample slice'
    }
  ]
};

const slashAliasRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 2,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'sample-flatbread-crispbread',
      name: 'Sample flatbread / crispbread'
    }
  ]
};

const staleIngredientIdRecipe: Recipe = {
  ...baseRecipe,
  ingredients: [
    {
      amount: {
        quantity: 5,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'green-onion',
      name: 'Green onion'
    },
    {
      amount: {
        quantity: 2,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'green-chilli',
      name: 'Green chilli'
    }
  ]
};

describe('renderMethodStepText', () => {
  it('resolves stale ingredient ids through their human-readable labels', () => {
    const step =
      'Finely chop {{ingredient|green-onions|green onion|green onions}}, saving 1/4 for garnish, and {{ingredient|green-chillies|green chilli|green chillies}}.';

    const rendered = renderMethodStepText(step, staleIngredientIdRecipe, 2);

    expect(rendered).toBe(
      'Finely chop 5 green onions, saving 1/4 for garnish, and 2 green chillies.'
    );
  });

  it('renders a human-readable label when an ingredient cannot be resolved', () => {
    const step = 'Add {{ingredient|missing-peppers|pepper|peppers}}.';

    const rendered = renderMethodStepText(step, baseRecipe, 2);

    expect(rendered).toBe('Add peppers.');
  });

  it('scales valid literal fractions when servings change', () => {
    const step = 'Stir in 1/2 tsp sample powder.';

    const rendered = renderMethodStepText(step, baseRecipe, 4);

    expect(rendered).toBe('Stir in 1 tsp sample powder.');
  });

  it('leaves invalid literal fractions unchanged', () => {
    const step = 'Stir in 1/0 tsp sample powder.';

    const rendered = renderMethodStepText(step, baseRecipe, 4);

    expect(rendered).toBe(step);
  });

  it('scales literal count amounts when ingredient descriptors are included', () => {
    const step = 'Prepare 1 sample item, then dice.';

    const rendered = renderMethodStepText(step, countIngredientRecipe, 4);

    expect(rendered).toBe('Prepare 2 sample items, then dice.');
  });

  it('scales fractional article amounts without leaving "of a" phrasing', () => {
    const step = 'Prepare 1/2 of a fractional item';

    const rendered = renderMethodStepText(step, fractionalItemRecipe, 4);

    expect(rendered).toBe('Prepare 1 fractional item');
  });

  it('scales fractional article amounts without leaving repeated article wording', () => {
    const step =
      'Add 1/2 a sample cube and 200g of sample grains to the pan and stir to coat the sample grains in the mix.';

    const rendered = renderMethodStepText(step, fractionalArticleRecipe, 4);

    expect(rendered).toBe(
      'Add 1 sample cube and 400g of sample grains to the pan and stir to coat the sample grains in the mix.'
    );
  });

  it('scales ingredient portions when servings change', () => {
    const step = 'Add {{ingredient-portion|sample-root|1/4}} of the reserved sample root.';

    const rendered = renderMethodStepText(step, portionIngredientRecipe, 4);

    expect(rendered).toBe('Add 15g of the reserved sample root.');
  });

  it('scales literal clove amounts when servings change', () => {
    const step = 'Slice 2 cloves of sample ingredient.';

    const rendered = renderMethodStepText(step, baseRecipe, 4);

    expect(rendered).toBe('Slice 4 cloves of sample ingredient.');
  });

  it('keeps duration ranges unchanged when servings change', () => {
    const step =
      'Stir and cook for 3-4 minutes until the sample mixture is ready.';

    const rendered = renderMethodStepText(step, countIngredientRecipe, 4);

    expect(rendered).toBe(step);
  });

  it('keeps single literal durations unchanged when servings change', () => {
    const step = 'Simmer for 5 minutes, then rest.';

    const rendered = renderMethodStepText(step, baseRecipe, 4);

    expect(rendered).toBe('Simmer for 5 minutes, then rest.');
  });

  it('scales count amounts for comma-qualified ingredient names', () => {
    const step = 'Dice 4 sample pieces.';

    const rendered = renderMethodStepText(step, commaQualifiedRecipe, 4);

    expect(rendered).toBe('Dice 8 sample pieces.');
  });

  it('scales literal can amounts when servings change', () => {
    const step = 'Drain 1 can of sample slices.';

    const rendered = renderMethodStepText(step, cannedIngredientRecipe, 4);

    expect(rendered).toBe('Drain 2 cans of sample slices.');
  });

  it('scales count amounts for slash-separated ingredient aliases', () => {
    const step = 'Dice 2 sample flatbreads into medium pieces.';

    const rendered = renderMethodStepText(step, slashAliasRecipe, 4);

    expect(rendered).toBe('Dice 4 sample flatbreads into medium pieces.');
  });
});
