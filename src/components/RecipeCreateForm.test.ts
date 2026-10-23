import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecipeCreateForm, createRecipeCreateFormInitialValues, parseNutritionDraft } from './RecipeCreateForm';
import { normalizeCustomRecipe } from '../helpers/customRecipes';
import { getRecipeNutritionPerServingValues } from '../helpers/recipeNutrition';
import type { Recipe } from '../types/recipe';

const recipeWithNutrition: Recipe = {
  defaultServings: 2,
  id: 'sample-nutrition-recipe',
  ingredients: [
    {
      amount: {
        text: '1 serving',
        type: 'fixed'
      },
      id: 'sample-serving',
      name: 'sample serving'
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
  title: 'Sample Nutrition Recipe',
  totalTime: '45 mins'
};

describe('createRecipeCreateFormInitialValues', () => {
  it('renders linked recipe steps as readable text in both editor fields', () => {
    const recipe: Recipe = {
      ...recipeWithNutrition,
      ingredients: [{ id: 'green-onions', name: 'Green onion', amount: { type: 'scalable', quantity: 5 } }],
      sections: [
        { id: 'prep', title: 'Prep', steps: ['Finely chop {{ingredient|green-onions|green onion|green onions}}.'] },
        { id: 'cook', title: 'Cook', steps: ['Add {{ingredient|green-onions|green onion|green onions}}.'] }
      ]
    };
    const markup = renderToStaticMarkup(createElement(RecipeCreateForm, {
      initialValues: createRecipeCreateFormInitialValues(recipe), originalRecipe: recipe,
      formId: 'edit-recipe', isSaving: false, savingLabel: 'Saving…', closeLabel: 'Close', submitLabel: 'Save recipe',
      onClose: () => {}, onSubmit: () => {}
    }));
    expect(markup).toContain('Finely chop 5 green onions.');
    expect(markup).toContain('Add 5 green onions.');
    expect(markup).not.toContain('{{ingredient|');
  });

  it('uses the recipe source serving count when editing', () => {
    const initialValues = createRecipeCreateFormInitialValues(recipeWithNutrition, {
      note: 'Scale this on the recipe page.'
    });

    expect(initialValues.servings).toBe('2');
  });

  it('prefills nutrition with per-serving values without rounding away saved precision', () => {
    const initialValues = createRecipeCreateFormInitialValues(recipeWithNutrition);

    expect(initialValues.nutritionDraft).toEqual({
      calories: '572.495',
      carbs: '37.465',
      fat: '36.75',
      fibre: '3.125',
      protein: '26.17',
      salt: '0.625',
      saturates: '17.7',
      sugars: '7.385'
    });
  });
});

describe('optional nutrition fields', () => {
  const emptyDraft = createRecipeCreateFormInitialValues().nutritionDraft;

  it.each(['calories', 'carbs', 'fat', 'saturates', 'sugars', 'fibre', 'protein', 'salt'] as const)(
    'saves and reopens %s without requiring other nutrition fields',
    (key) => {
      const draft = { ...emptyDraft, [key]: '12.5' };
      const parsed = parseNutritionDraft(draft);
      expect(parsed).toEqual({
        error: null,
        nutrition: { sourceServings: 1, values: { [key]: 12.5 } }
      });

      const saved = normalizeCustomRecipe(JSON.parse(JSON.stringify({
        ...recipeWithNutrition, nutrition: parsed.nutrition
      })));
      expect(saved?.nutrition).toEqual(parsed.nutrition);
      expect(getRecipeNutritionPerServingValues(saved?.nutrition)).toEqual({ [key]: 12.5 });
      expect(createRecipeCreateFormInitialValues(saved!).nutritionDraft).toEqual({
        ...emptyDraft,
        [key]: '12.5'
      });
    }
  );

  it.each([0, 520, 1200, 1234.5])('preserves %s calories through opening and saving the editor', (calories) => {
    const nutrition = { sourceServings: 1, values: { calories, protein: 24.25 } };
    const initialValues = createRecipeCreateFormInitialValues({ ...recipeWithNutrition, nutrition });

    expect(initialValues.nutritionDraft.calories).toBe(String(calories));
    expect(parseNutritionDraft(initialValues.nutritionDraft)).toEqual({ error: null, nutrition });
  });

  it('keeps zero values and leaves blank fields absent', () => {
    expect(parseNutritionDraft({ ...emptyDraft, calories: '520', fat: '0', protein: ' ' })).toEqual({
      error: null,
      nutrition: { sourceServings: 1, values: { calories: 520, fat: 0 } }
    });
  });

  it('omits nutrition when all fields are blank', () => {
    expect(parseNutritionDraft(emptyDraft)).toEqual({ error: null, nutrition: undefined });
  });

  it.each(['-1', 'Infinity', 'abc'])('rejects invalid entered values: %s', (value) => {
    expect(parseNutritionDraft({ ...emptyDraft, calories: '520', protein: value })).toEqual({
      error: 'Protein (g) must be a number that is 0 or greater.',
      nutrition: undefined
    });
  });

  it('converts partial recipe totals to per-serving values when reopening', () => {
    const recipe = {
      ...recipeWithNutrition,
      nutrition: { sourceServings: 2, values: { calories: 1040, protein: 48 } }
    };
    expect(getRecipeNutritionPerServingValues(recipe.nutrition)).toEqual({ calories: 520, protein: 24 });
    expect(createRecipeCreateFormInitialValues(recipe).nutritionDraft).toEqual({
      ...emptyDraft, calories: '520', protein: '24'
    });
  });

  it('rejects invalid supplied nutrition while allowing omitted fields', () => {
    const nutrition = { sourceServings: 1, values: { calories: 520, protein: -1 } };
    expect(normalizeCustomRecipe({ ...recipeWithNutrition, nutrition })?.nutrition).toBeUndefined();
    expect(getRecipeNutritionPerServingValues(nutrition)).toBeNull();
  });
});
