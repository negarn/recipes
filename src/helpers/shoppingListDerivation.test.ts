import { describe, expect, it } from 'vitest';
import {
  deriveShoppingList,
  reconcileShoppingListChecks,
  type ShoppingListItem
} from './shoppingList';
import type { IngredientUnit } from '../types/recipe';
import type { Recipe } from '../types/recipe';

const recipe: Recipe = {
  defaultServings: 2,
  id: 'recipe-1',
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
  isVegan: true,
  isVegetarian: true,
  sections: [{ id: 'cook', steps: [], title: 'Cook' }],
  tags: [],
  title: 'Sample Dish',
  totalTime: '10 min'
};

function createGetRecipeById(recipes: Recipe[]) {
  const recipesById = new Map(recipes.map((entry) => [entry.id, entry]));
  return (recipeId: string) => recipesById.get(recipeId);
}

function createRecipeWithSingleScalableIngredient({
  id,
  ingredientId,
  ingredientName,
  quantity,
  unit
}: {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: IngredientUnit;
}): Recipe {
  return {
    defaultServings: 2,
    id,
    ingredients: [
      {
        amount: {
          quantity,
          type: 'scalable',
          unit
        },
        id: ingredientId,
        name: ingredientName
      }
    ],
    isVegan: true,
    isVegetarian: true,
    sections: [{ id: 'cook', steps: [], title: 'Cook' }],
    tags: [],
    title: 'Single Ingredient Dish',
    totalTime: '10 min'
  };
}

function getOnlyShoppingListItem(items: ShoppingListItem[]) {
  const [item] = items;

  if (!item || items.length !== 1) {
    throw new Error('Expected exactly one shopping list item.');
  }

  return item;
}

describe('shopping list derivation', () => {
  it('derives unchecked items from meal-plan recipes', () => {
    const sections = deriveShoppingList({
      getRecipeById: createGetRecipeById([recipe]),
      mealPlan: { '2026-04-11': ['recipe-1'] },
      recipeServings: {},
      recipeSettings: {},
      shoppingListChecks: {},
      shoppingListCustomItems: []
    });

    expect(sections).toHaveLength(1);
    const item = getOnlyShoppingListItem(sections[0].items);

    expect(item.ingredientName).toBe('sample powder');
    expect(item.isChecked).toBe(false);
    expect(item.checkSourceKeys).toHaveLength(1);
  });

  it('marks derived items as checked when source keys are persisted', () => {
    const getRecipeById = createGetRecipeById([recipe]);
    const initialSections = deriveShoppingList({
      getRecipeById,
      mealPlan: { '2026-04-11': ['recipe-1'] },
      recipeServings: {},
      recipeSettings: {},
      shoppingListChecks: {},
      shoppingListCustomItems: []
    });
    const initialItem = getOnlyShoppingListItem(initialSections[0].items);

    const sections = deriveShoppingList({
      getRecipeById,
      mealPlan: { '2026-04-11': ['recipe-1'] },
      recipeServings: {},
      recipeSettings: {},
      shoppingListChecks: {
        [initialItem.itemKey]: [initialItem.checkSourceKeys[0]]
      },
      shoppingListCustomItems: []
    });

    const checkedItem = getOnlyShoppingListItem(sections[0].items);
    expect(checkedItem.isChecked).toBe(true);
  });

  it('drops stale checks when recipes are no longer resolvable', () => {
    const nextChecks = reconcileShoppingListChecks({
      getRecipeById: createGetRecipeById([]),
      mealPlan: { '2026-04-11': ['missing-recipe'] },
      recipeServings: {},
      recipeSettings: {},
      shoppingListChecks: {
        'stale:item': ['stale:source']
      },
      shoppingListCustomItems: []
    });

    expect(nextChecks).toEqual({});
  });

  it('converts large gram amounts to kilograms', () => {
    const gramRecipe = createRecipeWithSingleScalableIngredient({
      id: 'recipe-grams-to-kilograms',
      ingredientId: 'sample-grams',
      ingredientName: 'sample grams',
      quantity: 2200,
      unit: { separator: 'none', singular: 'g' }
    });

    const sections = deriveShoppingList({
      getRecipeById: createGetRecipeById([gramRecipe]),
      mealPlan: { '2026-04-11': [gramRecipe.id] },
      recipeServings: {},
      recipeSettings: {},
      shoppingListChecks: {},
      shoppingListCustomItems: []
    });

    expect(getOnlyShoppingListItem(sections[0].items).amountLabel).toBe('2.2kg');
  });

  it('keeps gram amounts under one kilogram in grams', () => {
    const gramRecipe = createRecipeWithSingleScalableIngredient({
      id: 'recipe-grams-under-kilogram',
      ingredientId: 'sample-grams',
      ingredientName: 'sample grams',
      quantity: 220,
      unit: { separator: 'none', singular: 'g' }
    });

    const sections = deriveShoppingList({
      getRecipeById: createGetRecipeById([gramRecipe]),
      mealPlan: { '2026-04-11': [gramRecipe.id] },
      recipeServings: {},
      recipeSettings: {},
      shoppingListChecks: {},
      shoppingListCustomItems: []
    });

    expect(getOnlyShoppingListItem(sections[0].items).amountLabel).toBe('220g');
  });

  it.each([
    ['feta', 'Feta', 'feta-cheese', 'Feta cheese'],
    ['cheddar', 'Cheddar', 'cheddar-cheese', 'Cheddar cheese']
  ])(
    'merges %s and %s into one shopping list item',
    (baseIngredientId, baseIngredientName, variantIngredientId, variantIngredientName) => {
      const baseRecipe = createRecipeWithSingleScalableIngredient({
        id: `recipe-${baseIngredientId}`,
        ingredientId: baseIngredientId,
        ingredientName: baseIngredientName,
        quantity: 50,
        unit: { separator: 'none', singular: 'g' }
      });
      const variantRecipe = createRecipeWithSingleScalableIngredient({
        id: `recipe-${variantIngredientId}`,
        ingredientId: variantIngredientId,
        ingredientName: variantIngredientName,
        quantity: 50,
        unit: { separator: 'none', singular: 'g' }
      });

      const sections = deriveShoppingList({
        getRecipeById: createGetRecipeById([baseRecipe, variantRecipe]),
        mealPlan: {
          '2026-04-11': [baseRecipe.id, variantRecipe.id]
        },
        recipeServings: {},
        recipeSettings: {},
        shoppingListChecks: {},
        shoppingListCustomItems: []
      });

      expect(sections).toHaveLength(1);
      const item = getOnlyShoppingListItem(sections[0].items);

      expect(item.amountLabel).toBe('100g');
      expect(item.sources).toHaveLength(2);
      expect(item.checkSourceKeys).toHaveLength(2);
    }
  );
});
