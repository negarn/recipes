import { describe, expect, it } from 'vitest';
import { createRecipeCreateFormInitialValues } from './RecipeCreateForm';
import type { Recipe } from '../types/recipe';

const recipeWithNutrition: Recipe = {
  defaultServings: 2,
  id: 'chicken-feta-saag-pie',
  ingredients: [
    {
      amount: {
        text: '1 pie',
        type: 'fixed'
      },
      id: 'pie',
      name: 'pie'
    }
  ],
  isVegan: false,
  isVegetarian: false,
  nutrition: {
    sourceServings: 2,
    values: {
      calories: 1144.99,
      carbs: 74.93,
      fat: 73.5,
      fibre: 6.25,
      protein: 52.34,
      salt: 1.25,
      saturates: 35.4,
      sugars: 14.77
    }
  },
  rating: 4.5,
  sections: [
    {
      id: 'prep',
      steps: ['Prep it.'],
      title: 'Prep'
    },
    {
      id: 'cook',
      steps: ['Cook it.'],
      title: 'Cook'
    }
  ],
  tags: ['vegetarian'],
  title: 'Chicken Feta Saag Pie',
  totalTime: '45 mins'
};

describe('createRecipeCreateFormInitialValues', () => {
  it('prefills nutrition using the per-serving values shown on the recipe page', () => {
    const initialValues = createRecipeCreateFormInitialValues(recipeWithNutrition);

    expect(initialValues.nutritionDraft).toEqual({
      calories: '572',
      carbs: '37.5',
      fat: '36.8',
      fibre: '3.1',
      protein: '26.2',
      salt: '0.6',
      saturates: '17.7',
      sugars: '7.4'
    });
  });
});
