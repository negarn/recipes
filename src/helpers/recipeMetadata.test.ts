import { describe, expect, it } from 'vitest';
import {
  applyRecipeRating,
  formatRecipeTitle,
  getRecipeServingDetails,
  getRecipeTags,
  recipeMatchesSearch
} from './recipeMetadata';
import type { Recipe } from '../types/recipe';

const recipe: Recipe = {
  defaultServings: 8,
  id: 'test-recipe',
  ingredients: [
    {
      amount: {
        quantity: 1,
        type: 'scalable',
        unit: { singular: 'x' }
      },
      id: 'ingredient-1',
      name: 'Ingredient'
    }
  ],
  isVegan: false,
  isVegetarian: true,
  sections: [
    {
      id: 'prep',
      steps: ['Prep'],
      title: 'Prep'
    }
  ],
  tags: [],
  title: 'Test Recipe',
  totalTime: '30 mins'
};

const featuredRecipe: Recipe = {
  defaultServings: 4,
  id: 'sample-featured-recipe',
  ingredients: [
    {
      amount: {
        quantity: 2,
        type: 'scalable',
        unit: { plural: 'cups', singular: 'cup' }
      },
      id: 'primary-ingredient',
      name: 'Primary ingredient'
    },
    {
      amount: {
        quantity: 1,
        type: 'scalable',
        unit: { singular: 'clove' }
      },
      id: 'secondary-ingredient',
      name: 'Secondary ingredient'
    }
  ],
  isVegan: true,
  isVegetarian: true,
  sections: [
    {
      id: 'cook',
      steps: ['Simmer gently.'],
      title: 'Cook'
    }
  ],
  tags: ['quick', 'vegan', 'quick'],
  title: 'Sample Featured Recipe',
  totalTime: '25 mins',
  rating: 3.5
};

describe('formatRecipeTitle', () => {
  it('keeps minor words lower case in the middle of the title', () => {
    expect(formatRecipeTitle('  the lord of the rings  ')).toBe(
      'The Lord of the Rings'
    );
  });
});

describe('getRecipeTags', () => {
  it('prefers the vegan label and deduplicates tags', () => {
    expect(getRecipeTags(featuredRecipe)).toEqual(['vegan', 'quick']);
  });

  it('omits the children audience tag from display tags', () => {
    expect(
      getRecipeTags({
        ...featuredRecipe,
        tags: ['children', 'weeknight', 'CHILDREN']
      })
    ).toEqual(['vegan', 'weeknight']);
  });
});

describe('applyRecipeRating', () => {
  it('returns the original recipe when the rating does not change', () => {
    expect(applyRecipeRating(recipe, {})).toBe(recipe);
  });

  it('applies a stored rating override when one exists', () => {
    expect(applyRecipeRating(recipe, { 'test-recipe': 4 })).toEqual({
      ...recipe,
      rating: 4
    });
  });
});

describe('recipeMatchesSearch', () => {
  it('matches search terms across the title and ingredient names', () => {
    expect(recipeMatchesSearch(featuredRecipe, 'featured secondary')).toBe(true);
    expect(recipeMatchesSearch(featuredRecipe, 'featured missing')).toBe(false);
  });
});

describe('getRecipeServingDetails', () => {
  it('keeps recipe default servings as the scaling baseline', () => {
    expect(
      getRecipeServingDetails(recipe, {}, { defaultServingSize: 2 })
    ).toEqual({
      defaultServingCount: 8,
      servingCount: 2
    });
  });

  it('prefers recipe-specific serving values when available', () => {
    expect(
      getRecipeServingDetails(recipe, { 'test-recipe': 6 }, { defaultServingSize: 2 })
    ).toEqual({
      defaultServingCount: 8,
      servingCount: 6
    });
  });
});
