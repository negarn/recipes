import { describe, expect, it } from 'vitest';
import {
  expandIngredientAliasCandidates,
  getIngredientAliasCandidates,
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

describe('getIngredientAliasCandidates', () => {
  it.each(['ground', 'fresh', 'smoked', 'fresh ground'])('does not treat preparation words alone as an ingredient: %s', (name) => {
    expect(getIngredientAliasCandidates(name)).toEqual([]);
  });

  it('preserves ingredient names with preparation words', () => {
    expect(getIngredientAliasCandidates('Ground cloves')).toEqual(['ground cloves', 'cloves']);
    expect(getIngredientAliasCandidates('Fresh ground cumin')).toEqual(['fresh ground cumin', 'ground cumin', 'cumin']);
  });
});

describe('expandIngredientAliasCandidates', () => {
  it('matches the Canadian plural of chili so counted chilies scale', () => {
    expect(expandIngredientAliasCandidates(['green chili']))
      .toContain('green chilies');
  });
});
