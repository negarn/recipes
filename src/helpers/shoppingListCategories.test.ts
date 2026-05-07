import { describe, expect, it } from 'vitest';
import { getShoppingListCategoryId } from './shoppingListCategories';

describe('getShoppingListCategoryId', () => {
  it('does not match short keywords in the middle of unrelated words', () => {
    expect(getShoppingListCategoryId('champagne vinegar')).toBe('pantry');
  });

  it('matches plural word endings for stem-style keywords', () => {
    expect(getShoppingListCategoryId('anchovies')).toBe('meat-seafood');
  });

  it('matches multi-word ingredients with pluralized endings', () => {
    expect(getShoppingListCategoryId('green beans')).toBe('fruit-veg');
  });

  it('categorizes chilli flakes as herbs and spices', () => {
    expect(getShoppingListCategoryId('chilli flakes')).toBe('herbs-spices');
  });

  it.each([
    ['eggplant', 'fruit-veg'],
    ['cayenne', 'herbs-spices'],
    ['almond flake', 'pantry'],
    ['dried apricot', 'pantry'],
    ['hot sauce', 'pantry'],
    ['red wine', 'pantry'],
    ['walnut', 'pantry'],
    ['white wine', 'pantry'],
    ['worcestershire sauce', 'pantry']
  ])('categorizes %s as %s', (ingredientName, expectedCategoryId) => {
    expect(getShoppingListCategoryId(ingredientName)).toBe(expectedCategoryId);
  });
});
