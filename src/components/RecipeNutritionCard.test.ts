import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RecipeNutritionCard } from './RecipeNutritionCard';

describe('RecipeNutritionCard', () => {
  it('displays entered nutrition and omits unknown nutrients', () => {
    const markup = renderToStaticMarkup(createElement(RecipeNutritionCard, {
      nutrition: { sourceServings: 2, values: { calories: 1040 } }
    }));

    expect(markup).toContain('Calories</p>');
    expect(markup).toContain('520 kcal');
    expect(markup).not.toContain('Fat</p>');
    expect(markup).not.toContain('Protein</p>');
    expect(markup).not.toContain('NaN');
    expect(markup).not.toContain('Nutrition data is not available');
  });

  it('displays an entered zero as a known value', () => {
    const markup = renderToStaticMarkup(createElement(RecipeNutritionCard, {
      nutrition: { sourceServings: 1, values: { fat: 0 } }
    }));

    expect(markup).toContain('Fat</p>');
    expect(markup).toContain('0 g');
    expect(markup).not.toContain('Calories</p>');
  });
});
