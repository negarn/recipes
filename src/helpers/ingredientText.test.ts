import { describe, expect, it } from 'vitest';
import { normalizeIngredientName } from './ingredientText';

describe('normalizeIngredientName', () => {
  it.each([
    ['beef mince', 'Ground beef'],
    ['minced beef', 'Ground beef'],
    ['feta', 'Feta'],
    ['feta cheese', 'Feta'],
    ['cheddar', 'Cheddar'],
    ['cheddar cheese', 'Cheddar']
  ])('normalizes %s as %s', (ingredientName, expectedName) => {
    expect(normalizeIngredientName(ingredientName)).toBe(expectedName);
  });
});
