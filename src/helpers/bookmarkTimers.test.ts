import { describe, expect, it } from 'vitest';
import { getRecipeMethodSectionSteps } from './recipeMethodSteps';
import { deriveBookmarkLineTimersFromSelection } from './bookmarkTimers';
import type { Recipe } from '../types/recipe';

describe('deriveBookmarkLineTimersFromSelection', () => {
  it('carries active recipe timers over to matching bookmarked lines', () => {
    const recipe = {
      defaultServings: 2,
      ingredients: [],
      sections: [
        {
          id: 'cook',
          steps: ['Simmer for 10 minutes', 'Stir well'],
          title: 'Cook'
        }
      ]
    } as unknown as Recipe;
    const [{ id: simmerStepId }] = getRecipeMethodSectionSteps(recipe.sections[0]);
    const carryOverTimers = deriveBookmarkLineTimersFromSelection({
      activeStepTimers: {
        [simmerStepId]: 123456
      },
      defaultServingCount: 2,
      recipe,
      selectionText: '- [ ] Simmer for 10 minutes\n\nStir well',
      servingCount: 2
    });

    expect(carryOverTimers).toEqual({
      0: 123456
    });
  });
});
