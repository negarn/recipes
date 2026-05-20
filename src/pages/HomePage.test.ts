import { describe, expect, it } from 'vitest';
import { createRecipeFromPayload } from './HomePage';
import type { RecipeCreatePayload } from '../components/RecipeCreateForm';
import type { Recipe } from '../types/recipe';

const baseRecipePayload: RecipeCreatePayload = {
  cookSteps: [
    'Add {{ingredient|green-onions|green onion|green onions}} and {{ingredient|chicken-drumsticks|chicken drumstick|chicken drumsticks}}.'
  ],
  ingredients: [
    { amountText: '5 x', name: 'Green onion' },
    { amountText: '4 x', name: 'Chicken drumstick' }
  ],
  isVegan: false,
  isVegetarian: false,
  note: '',
  prepSteps: ['Prep {{ingredient|green-onions|green onion|green onions}}.'],
  servings: 2,
  tags: [],
  title: 'Quick chicken biryani',
  totalTime: '40 mins'
};

const previousRecipe: Recipe = {
  defaultServings: 2,
  id: 'quick-chicken-biryani',
  ingredients: [
    {
      amount: {
        quantity: 5,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'green-onions',
      name: 'Green onion'
    },
    {
      amount: {
        quantity: 4,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'chicken-drumsticks',
      name: 'Chicken drumstick'
    }
  ],
  isVegan: false,
  isVegetarian: false,
  sections: [
    {
      id: 'prep',
      steps: ['Prep {{ingredient|green-onions|green onion|green onions}}.'],
      title: 'Prep'
    },
    {
      id: 'cook',
      steps: [
        'Add {{ingredient|green-onions|green onion|green onions}} and {{ingredient|chicken-drumsticks|chicken drumstick|chicken drumsticks}}.'
      ],
      title: 'Cook'
    }
  ],
  tags: [],
  title: 'Quick chicken biryani',
  totalTime: '40 mins'
};

describe('createRecipeFromPayload', () => {
  it('preserves existing ingredient ids when editing a recipe', () => {
    const recipe = createRecipeFromPayload(
      baseRecipePayload,
      previousRecipe.id,
      previousRecipe
    );

    expect(recipe.ingredients.map((ingredient) => ingredient.id)).toEqual([
      'green-onions',
      'chicken-drumsticks'
    ]);
  });
});
