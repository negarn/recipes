import { describe, expect, it } from 'vitest';
import {
  expandIngredientAliasCandidates,
  normalizeIngredientName
} from './ingredientText';

describe('normalizeIngredientName', () => {
  it.each([
    ['beef mince', 'Ground beef'],
    ['minced beef', 'Ground beef'],
    ['feta', 'Feta'],
    ['feta cheese', 'Feta'],
    ['cheddar', 'Cheddar'],
    ['cheddar cheese', 'Cheddar'],
    ['green chilli', 'Green chili'],
    ['green chillies', 'Green chili'],
    ['green chilies', 'Green chili'],
    ['mild chilli flakes', 'Mild chili flake'],
    ['greek yoghurt', 'Greek yogurt']
  ])('normalizes %s as %s', (ingredientName, expectedName) => {
    expect(normalizeIngredientName(ingredientName)).toBe(expectedName);
  });
});

describe('expandIngredientAliasCandidates', () => {
  it('matches the Canadian plural of chili so counted chilies scale', () => {
    expect(expandIngredientAliasCandidates(['green chili']))
      .toContain('green chilies');
  });
});
