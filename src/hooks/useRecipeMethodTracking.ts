import type { Recipe } from '../types/recipe';
import { useRecipeMethodTrackingAudio } from './useRecipeMethodTrackingAudio';
import { useRecipeMethodTrackingNotifications } from './useRecipeMethodTrackingNotifications';
import { useRecipeMethodTrackingProgress } from './useRecipeMethodTrackingProgress';

export function useRecipeMethodTracking(recipe: Pick<Recipe, 'id' | 'sections'> | null) {
  const recipeId = recipe?.id ?? null;
  const {
    activeStepTimers,
    completedMethodSteps,
    resetStoredMethodTracking,
    updateCompletedSteps,
    updateStepTimers
  } = useRecipeMethodTrackingProgress(recipe);
  const { playTimerCompletionSound, primeTimerAudio } =
    useRecipeMethodTrackingAudio();
  const {
    clearTimerAlert,
    refreshTimerNow,
    resetTimerNotifications,
    timerNow
  } = useRecipeMethodTrackingNotifications(
    activeStepTimers,
    recipeId,
    playTimerCompletionSound
  );

  function removeStepTimer(stepId: string) {
    updateStepTimers((currentStepTimers) => {
      if (!(stepId in currentStepTimers)) {
        return currentStepTimers;
      }

      const nextStepTimers = { ...currentStepTimers };
      delete nextStepTimers[stepId];
      return nextStepTimers;
    });

    clearTimerAlert(stepId);
  }

  function toggleMethodStep(stepId: string, isChecked: boolean) {
    updateCompletedSteps((currentCompletedSteps) => {
      const nextCompletedSteps = new Set(currentCompletedSteps);

      if (isChecked) {
        nextCompletedSteps.add(stepId);
      } else {
        nextCompletedSteps.delete(stepId);
      }

      return nextCompletedSteps;
    });

    if (!isChecked) {
      return;
    }

    removeStepTimer(stepId);
  }

  function startStepTimer(stepId: string, durationMs: number) {
    const nextTimerEndAt = Date.now() + durationMs;

    clearTimerAlert(stepId);
    refreshTimerNow();
    updateStepTimers((currentStepTimers) => ({
      ...currentStepTimers,
      [stepId]: nextTimerEndAt
    }));

    void primeTimerAudio();
  }

  function clearStepTimer(stepId: string) {
    removeStepTimer(stepId);
  }

  function resetMethodTracking() {
    resetStoredMethodTracking();
    resetTimerNotifications();
  }

  return {
    activeStepTimers,
    clearStepTimer,
    completedMethodSteps,
    resetMethodTracking,
    startStepTimer,
    timerNow,
    toggleMethodStep
  };
}
