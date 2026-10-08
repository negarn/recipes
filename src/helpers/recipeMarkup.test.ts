import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RecipeCreateForm, createRecipeCreateFormInitialValues } from '../components/RecipeCreateForm';
import { RecipeMethodSectionCard } from '../components/RecipeMethodSectionCard';
import { RecipeScalingFeedback } from '../components/RecipeScalingFeedback';
import { RecipeConsistencyFeedback } from '../components/RecipeConsistencyFeedback';
import { storybookRecipes } from '../stories/fakeRecipes';
import { createRecipeMethodDraft, applyRecipeMethodDraftEdit } from './recipeMethodDraft';
import { checkRecipeScaling } from './recipeScalingValidation';
import { checkRecipeConsistency } from './recipeConsistencyValidation';
import { parseBookmarkBodyLines } from './bookmarkText';
import { getRecipeBookmarkDisplay } from './recipeBookmarkDisplay';
import type { Recipe } from '../types/recipe';

const noop = () => {};
const markupPattern = /\{\{|\}\}|\bingredient(?:-portion)?\s*\|/;
const linkedRecipe: Recipe = {
  ...storybookRecipes[0], id: 'linked-method-regression', title: 'Linked method regression',
  ingredients: [
    { id: 'green-onions', name: 'Green onion', amount: { type: 'scalable', quantity: 5 } },
    { id: 'rice', name: 'Rice', amount: { type: 'scalable', quantity: 200, unit: { singular: 'g', separator: 'none' } } }
  ],
  sections: [
    { id: 'prep', title: 'Prep', steps: ['Finely chop {{ingredient|green-onions|green onion|green onions}}.'] },
    { id: 'cook', title: 'Cook', steps: [
      'Add {{ingredient-portion|rice|1/2}} of rice. Serve in {{amount|2|bowl|bowls}}.',
      'Add {{amount|3|g}} of rice and {{fixed|a pinch of salt}}.'
    ] }
  ]
};
const malformedRecipe: Recipe = {
  ...linkedRecipe, id: 'broken-method-regression', title: 'Broken method regression',
  sections: [{ id: 'cook', title: 'Cook', steps: [
    'Add {{ingredient|missing|pepper|peppers}}.',
    'Add {{ingredient|}}.',
    'Add {{ingredient-portion|rice|oops}} of rice.',
    'Add {{amount||g}}.',
    'Add {{unknown|2}}.',
    'Add {{fixed|}}.',
    'Add {{{ingredient|green-onions|green onion|green onions}}}.',
    'Add {{ingredient|green-onions',
    'Add ingredient|green-onions|green onion|green onions}}.',
    'Serve in {{amount|2 bowls with {{ingredient|green-onions|green onion|green onions}}.',
    'Add garlic}}.'
  ] }]
};

// A supplied catalog is audited without storing personal recipe data in the repository.
const catalogPath = process.env.RECIPE_MARKUP_CATALOG;
const catalog: Recipe[] = catalogPath ? JSON.parse(readFileSync(catalogPath, 'utf8')) : [];
const recipes = [...storybookRecipes, linkedRecipe, malformedRecipe, ...catalog];

describe('recipe UI never displays stored method markup', () => {
  it.each(recipes.map((recipe) => [recipe.title, recipe] as const))('%s', (_title, recipe) => {
    for (const originalRecipe of [recipe, undefined]) {
      const editor = renderToStaticMarkup(createElement(RecipeCreateForm, {
        initialValues: createRecipeCreateFormInitialValues(recipe), originalRecipe,
        formId: 'markup-regression', isSaving: false, savingLabel: 'Saving…', closeLabel: 'Close', submitLabel: 'Save',
        onClose: noop, onSubmit: noop
      }));
      expect(editor.match(markupPattern), `recipe editor ${originalRecipe ? 'with' : 'without'} the original recipe`).toBeNull();
    }

    for (const section of recipe.sections) {
      for (const servingCount of new Set([1, recipe.defaultServings, recipe.defaultServings * 2])) {
        const details = renderToStaticMarkup(createElement(RecipeMethodSectionCard, {
          recipe, section, servingCount, defaultServingCount: recipe.defaultServings,
          completedMethodSteps: new Set<string>(), activeStepTimers: {}, timerNow: 0,
          onMarkAsCooked: noop, onMethodStepToggle: noop, onStepTimerStart: noop, onStepTimerClear: noop
        }));
        expect(details.match(markupPattern), `${section.title}, ${servingCount} servings`).toBeNull();
      }
      const source = section.steps.join('\n');
      const draft = createRecipeMethodDraft(source, recipe);
      expect(draft.text.match(markupPattern), 'readable step draft').toBeNull();
      expect(applyRecipeMethodDraftEdit(draft, draft.text), 'opening and saving preserves links').toBe(source);
      for (const bookmarkRecipe of [recipe, undefined]) {
        const bookmark = { id: 'linked-bookmark', label: section.steps[0] ?? section.title, text: source };
        const display = getRecipeBookmarkDisplay(bookmark, bookmarkRecipe);
        expect(display.label.match(markupPattern), 'saved bookmark label').toBeNull();
        expect(bookmark.text, 'displaying a bookmark preserves its stored text').toBe(source);
        for (const line of parseBookmarkBodyLines(display.text)) {
          if (line.kind !== 'blank') {
            expect(line.text.match(markupPattern), 'saved recipe bookmark').toBeNull();
          }
        }
      }
    }

    const scaling = renderToStaticMarkup(createElement(RecipeScalingFeedback, {
      check: checkRecipeScaling(recipe), recipe, isDisabled: false, onEdit: noop, onReplace: noop
    }));
    expect(scaling.match(markupPattern), 'serving size feedback').toBeNull();
    const consistency = renderToStaticMarkup(createElement(RecipeConsistencyFeedback, {
      check: checkRecipeConsistency(recipe, recipes), isDisabled: false, onEdit: noop, onReplace: noop
    }));
    expect(consistency.match(markupPattern), 'consistency feedback').toBeNull();
  });
});
