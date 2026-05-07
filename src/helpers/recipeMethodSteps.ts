import type { MethodSection } from '../types/recipe';

type RecipeMethodStepEntry = {
  id: string;
  text: string;
};

function normalizeMethodStepText(step: string) {
  return step.trim().replace(/\s+/g, ' ').toLowerCase();
}

function hashMethodStepText(step: string) {
  let hash = 2166136261;

  for (const character of step) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function getRecipeMethodSectionSteps(section: MethodSection): RecipeMethodStepEntry[] {
  return section.steps.map((step) => {
    const normalizedStep = normalizeMethodStepText(step);

    return {
      id: `${section.id}:${hashMethodStepText(normalizedStep)}`,
      text: step
    };
  });
}
