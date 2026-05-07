import { describe, expect, it } from 'vitest';
import {
  createIngredientAmountFromText,
  normalizeCustomRecipe
} from './customRecipes';

describe('createIngredientAmountFromText', () => {
  it('parses amounts with compact unit labels as scalable amounts', () => {
    expect(createIngredientAmountFromText('450g')).toEqual({
      quantity: 450,
      type: 'scalable',
      unit: {
        separator: 'none',
        singular: 'g'
      }
    });
  });

  it('parses fractions into scalable quantities', () => {
    expect(createIngredientAmountFromText('1/2 cup')).toEqual({
      quantity: 0.5,
      type: 'scalable',
      unit: {
        plural: 'cups',
        singular: 'cup'
      }
    });
  });

  it('falls back to fixed text when amount text cannot be parsed', () => {
    expect(createIngredientAmountFromText('to taste')).toEqual({
      text: 'to taste',
      type: 'fixed'
    });
  });
});

describe('normalizeCustomRecipe', () => {
  it('converts parseable fixed amount text into scalable amounts for existing recipes', () => {
    const normalizedRecipe = normalizeCustomRecipe({
      defaultServings: 8,
      id: 'test-recipe',
      ingredients: [
        {
          amount: {
            text: '2 tbsp',
            type: 'fixed'
          },
          id: 'olive-oil',
          name: 'Olive oil'
        }
      ],
      isVegan: false,
      isVegetarian: false,
      sections: [
        {
          id: 'prep',
          steps: ['Measure oil.'],
          title: 'Prep'
        },
        {
          id: 'cook',
          steps: ['Use oil.'],
          title: 'Cook'
        }
      ],
      tags: [],
      title: 'Test Recipe',
      totalTime: '45 mins'
    });

    expect(normalizedRecipe?.ingredients[0].amount).toEqual({
      quantity: 2,
      type: 'scalable',
      unit: {
        singular: 'tbsp'
      }
    });
  });

  it('preserves ingredient labels when normalizing recipes for storage', () => {
    const normalizedRecipe = normalizeCustomRecipe({
      defaultServings: 8,
      id: 'test-recipe',
      ingredients: [
        {
          amount: {
            text: '2 tbsp',
            type: 'fixed'
          },
          id: 'cheddar-cheese',
          name: 'Cheddar cheese'
        }
      ],
      isVegan: false,
      isVegetarian: false,
      sections: [
        {
          id: 'prep',
          steps: ['Measure cheese.'],
          title: 'Prep'
        }
      ],
      tags: [],
      title: 'Test Recipe',
      totalTime: '45 mins'
    });

    expect(normalizedRecipe?.ingredients[0].name).toBe('Cheddar cheese');
  });
});
