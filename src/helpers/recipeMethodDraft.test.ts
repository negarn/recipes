import { describe, expect, it } from 'vitest';
import {
  applyRecipeMethodDraftEdit,
  createRecipeMethodDraft,
  getRecipeMethodDraftSelection
} from './recipeMethodDraft';
import { renderMethodStepText } from './recipeDisplay';
import type { Recipe } from '../types/recipe';

const recipe: Recipe = {
  id: 'quick-chicken-biryani', title: 'Quick chicken biryani', defaultServings: 2,
  totalTime: '40 mins', isVegan: false, isVegetarian: false, tags: [], sections: [],
  ingredients: [
    { id: 'green-onions', name: 'Green onion', amount: { type: 'scalable', quantity: 5, unit: { singular: 'x' } } },
    { id: 'rice', name: 'Rice', amount: { type: 'scalable', quantity: 200, unit: { singular: 'g', separator: 'none' } } }
  ]
};
const onionLink = '{{ingredient|green-onions|green onion|green onions}}';
const source = `Finely chop ${onionLink}, then add {{ingredient-portion|rice|1/2}} of rice.\nServe in {{amount|2|bowl|bowls}} with {{fixed|a pinch of salt}}.`;
const visibleText = 'Finely chop 5 green onions, then add 100g of rice.\nServe in 2 bowls with a pinch of salt.';

describe('recipe method drafts', () => {
  it('displays ingredient, portion, amount, and fixed links as readable text', () => {
    const draft = createRecipeMethodDraft(source, recipe);
    expect(draft.text).toBe(visibleText);
    expect(applyRecipeMethodDraftEdit(draft, draft.text)).toBe(source);
  });

  it('preserves links and scaling when editing surrounding text', () => {
    const draft = createRecipeMethodDraft(source, recipe);
    const updated = applyRecipeMethodDraftEdit(draft, draft.text.replace('Finely', 'Roughly'));
    expect(updated).toBe(source.replace('Finely', 'Roughly'));
    expect(renderMethodStepText(updated.split('\n')[0], recipe, 4))
      .toBe('Roughly chop 10 green onions, then add 200g of rice.');
  });

  it('preserves blank lines and links when adding steps before and after', () => {
    const draft = createRecipeMethodDraft(source, recipe);
    const addedAtStart = applyRecipeMethodDraftEdit(draft, `\nWash your hands.\n${draft.text}`);
    const nextDraft = createRecipeMethodDraft(addedAtStart, recipe);
    expect(applyRecipeMethodDraftEdit(nextDraft, `${nextDraft.text}\n`))
      .toBe(`\nWash your hands.\n${source}\n`);
  });

  it('lets an edited linked amount become text without losing other links', () => {
    const draft = createRecipeMethodDraft(source, recipe);
    const updated = applyRecipeMethodDraftEdit(draft, draft.text.replace('5 green onions', '4 green onions'));
    expect(updated).toBe(source.replace(onionLink, '4 green onions'));
    expect(createRecipeMethodDraft(updated, recipe).text).toBe(visibleText.replace('5 green onions', '4 green onions'));
  });

  it('supports deleting a complete link', () => {
    const draft = createRecipeMethodDraft(source, recipe);
    const updated = applyRecipeMethodDraftEdit(draft, draft.text.replace('5 green onions', ''));
    expect(updated).toBe(source.replace(onionLink, ''));
  });

  it.each([
    ['5 green onions', 'fresh 5 green onions'],
    ['5 green onions', '5 green onions and garlic'],
    ['5 green onions', '5 green onionss'],
    ['2 bowls', '12 bowls']
  ])('keeps the displayed edit intact: %s → %s', (before, after) => {
    const draft = createRecipeMethodDraft(source, recipe);
    const nextText = draft.text.replace(before, after);
    const updated = applyRecipeMethodDraftEdit(draft, nextText);
    expect(createRecipeMethodDraft(updated, recipe).text).toBe(nextText);
    expect(updated).toContain('{{ingredient-portion|rice|1/2}}');
    expect(updated).toContain('{{fixed|a pinch of salt}}');
  });

  it('edits digits at the end of an amount without leaving a partially linked number', () => {
    const draft = createRecipeMethodDraft('Make {{amount|2}} portions.', recipe);
    const updated = applyRecipeMethodDraftEdit(draft, 'Make 20 portions.');
    expect(updated).toBe('Make 20 portions.');
  });

  it('maps source selections to visible labels and text after multiple links', () => {
    const draft = createRecipeMethodDraft(source, recipe);
    const linkStart = source.indexOf(onionLink);
    const selection = getRecipeMethodDraftSelection(draft, linkStart, linkStart + onionLink.length);
    expect(draft.text.slice(selection.start, selection.end)).toBe('5 green onions');
    const wordStart = source.indexOf('green onion|');
    expect(getRecipeMethodDraftSelection(draft, wordStart, wordStart + 'green onion'.length))
      .toEqual(selection);
    const literalStart = source.indexOf(' of rice');
    const literal = getRecipeMethodDraftSelection(draft, literalStart, literalStart + ' of rice'.length);
    expect(draft.text.slice(literal.start, literal.end)).toBe(' of rice');
  });

  it('shows updated ingredient amounts at the draft serving size', () => {
    const updatedRecipe: Recipe = {
      ...recipe, defaultServings: 4,
      ingredients: [{ ...recipe.ingredients[0], amount: { type: 'scalable', quantity: 3 } }]
    };
    expect(createRecipeMethodDraft(`Chop ${onionLink}.`, updatedRecipe).text).toBe('Chop 3 green onions.');
  });

  it('handles ordinary text when no recipe is available', () => {
    const draft = createRecipeMethodDraft('Wash the rice.');
    expect(applyRecipeMethodDraftEdit(draft, 'Rinse the rice.')).toBe('Rinse the rice.');
    expect(getRecipeMethodDraftSelection(draft, 5, 8)).toEqual({ start: 5, end: 8 });
  });

  it('round-trips insertions and deletions throughout the readable draft', () => {
    const draft = createRecipeMethodDraft(source, recipe);
    for (let offset = 0; offset <= draft.text.length; offset += 1) {
      for (const insertedText of ['a', '0', ' ', '\n']) {
        const nextText = draft.text.slice(0, offset) + insertedText + draft.text.slice(offset);
        const updated = applyRecipeMethodDraftEdit(draft, nextText);
        expect(createRecipeMethodDraft(updated, recipe).text).toBe(nextText);
      }
      const nextText = draft.text.slice(0, offset) + draft.text.slice(offset + 3);
      const updated = applyRecipeMethodDraftEdit(draft, nextText);
      expect(createRecipeMethodDraft(updated, recipe).text).toBe(nextText);
    }
  });
});
