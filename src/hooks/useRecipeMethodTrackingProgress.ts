import { useEffect, useState } from 'react';
import {
  clearRecipeMethodTracking,
  readRecipeMethodProgress,
  readRecipeStepTimers,
  writeRecipeMethodProgress,
  writeRecipeStepTimers
} from '../helpers/browserStorage';
import type { StepTimerMap } from '../types/app';
import type { Recipe } from '../types/recipe';

export function useRecipeMethodTrackingProgress(recipe: Pick<Recipe, 'id'> | null) {
  const recipeId = recipe?.id ?? null;
  const [completedMethodSteps, setCompletedMethodSteps] = useState(
    () => new Set<string>()
  );
  const [activeStepTimers, setActiveStepTimers] = useState<StepTimerMap>({});

  useEffect(() => {
    const nextCompletedMethodSteps = recipeId
      ? readRecipeMethodProgress(recipeId)
      : new Set<string>();
    const nextActiveStepTimers = recipeId ? readRecipeStepTimers(recipeId) : {};

    setCompletedMethodSteps(nextCompletedMethodSteps);
    setActiveStepTimers(nextActiveStepTimers);
  }, [recipeId]);

  function updateCompletedSteps(
    nextCompletedSteps:
      | Set<string>
      | ((currentCompletedSteps: Set<string>) => Set<string>)
  ) {
    setCompletedMethodSteps((currentCompletedSteps) => {
      const resolvedCompletedSteps =
        typeof nextCompletedSteps === 'function'
          ? nextCompletedSteps(currentCompletedSteps)
          : nextCompletedSteps;

      if (recipeId) {
        writeRecipeMethodProgress(recipeId, resolvedCompletedSteps);
      }

      return resolvedCompletedSteps;
    });
  }

  function updateStepTimers(
    updater: (currentStepTimers: StepTimerMap) => StepTimerMap
  ) {
    setActiveStepTimers((currentStepTimers) => {
      const nextStepTimers = updater(currentStepTimers);

      if (recipeId) {
        writeRecipeStepTimers(recipeId, nextStepTimers);
      }

      return nextStepTimers;
    });
  }

  function resetStoredMethodTracking() {
    setCompletedMethodSteps(new Set<string>());
    setActiveStepTimers({});

    if (recipeId) {
      clearRecipeMethodTracking(recipeId);
    }
  }

  return {
    activeStepTimers,
    completedMethodSteps,
    resetStoredMethodTracking,
    updateCompletedSteps,
    updateStepTimers
  };
}
