import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RecipeMethodSectionCard } from './RecipeMethodSectionCard';
import { getRecipeMethodSectionSteps } from '../helpers/recipeMethodSteps';
import { storybookRecipes } from '../stories/fakeRecipes';
import type { MethodSection } from '../types/recipe';

const noop = () => {};

function renderSection(section: MethodSection, completed = false, active = false): string {
  const [step] = getRecipeMethodSectionSteps(section);
  return renderToStaticMarkup(createElement(RecipeMethodSectionCard, {
    recipe: storybookRecipes[0], section, servingCount: 2, defaultServingCount: 2,
    completedMethodSteps: new Set(completed ? [step.id] : []),
    activeStepTimers: active ? { [step.id]: 120000 } : {}, timerNow: 0,
    onMarkAsCooked: noop, onMethodStepToggle: noop, onStepTimerStart: noop, onStepTimerClear: noop
  }));
}

describe('recipe step timers', () => {
  it('offers timers for mixing, resting, kneading and rising in Prep', () => {
    const markup = renderSection({
      id: 'prep', title: 'Prep', steps: [
        'Mix on speed 1 for approximately two minutes.',
        'Let the dough rest for 20 minutes.',
        'Knead on speed 2 for 7–9 minutes.',
        'Cover and let it rise for 60–90 minutes.',
        'Cover and let it rise for approximately 40–60 minutes.',
        'Chop walnuts.',
        'Beat egg.'
      ]
    });

    expect(markup.match(/Set timer/g)).toHaveLength(5);
    expect(markup).not.toContain('Mark as cooked');
  });

  it.each(['prep', 'cook'])('keeps completion and active timer controls working in %s', (id) => {
    const section = { id, title: id, steps: ['Rest for two minutes.'] };
    expect(renderSection(section)).toContain('Set timer');
    expect(renderSection(section, true)).not.toContain('Set timer');
    const activeMarkup = renderSection(section, true, true);
    expect(activeMarkup).toContain('02:00');
    expect(activeMarkup).toContain('Clear');
    expect(activeMarkup).not.toContain('Set timer');
  });

  it('still offers Mark as cooked in Cook', () => {
    expect(renderSection({ id: 'cook', title: 'Cook', steps: ['Bake for 30 minutes.'] }))
      .toContain('Mark as cooked');
  });
});
