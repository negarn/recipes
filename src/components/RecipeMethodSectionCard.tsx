import { ContentPanelSection } from './ContentPanelSection';
import { InlineMessage } from './InlineMessage';
import { TimerControls } from './TimerControls';
import { renderMethodStepText } from '../helpers/recipeDisplay';
import { getRecipeMethodSectionSteps } from '../helpers/recipeMethodSteps';
import { getMethodStepTimerDurationMs } from '../helpers/recipeTiming';
import {
  cn,
  pillButtonClass
} from '../helpers/uiClasses';
import type { StepTimerMap } from '../types/app';
import type { MethodSection, Recipe } from '../types/recipe';

export function RecipeMethodSectionCard({
  activeStepTimers,
  isMarkAsCookedDisabled,
  markAsCookedError,
  markAsCookedLabel,
  completedMethodSteps,
  defaultServingCount,
  onMarkAsCooked,
  onMethodStepToggle,
  onStepTimerClear,
  onStepTimerStart,
  recipe,
  section,
  servingCount,
  timerNow
}: {
  activeStepTimers: StepTimerMap;
  isMarkAsCookedDisabled?: boolean;
  markAsCookedError?: string | null;
  markAsCookedLabel?: string;
  completedMethodSteps: Set<string>;
  defaultServingCount: number;
  onMarkAsCooked: () => void;
  onMethodStepToggle: (stepId: string, isChecked: boolean) => void;
  onStepTimerClear: (stepId: string) => void;
  onStepTimerStart: (stepId: string, durationMs: number) => void;
  recipe: Recipe;
  section: MethodSection;
  servingCount: number;
  timerNow: number;
}) {
  const isCookSection = section.id === 'cook';
  const steps = getRecipeMethodSectionSteps(section);

  return (
    <ContentPanelSection title={section.title} className="min-w-0 flex flex-col">
      <section className="flex min-h-0 flex-1 flex-col">
        <ul className="m-0 grid list-none gap-[0.9rem] p-0">
          {steps.map(({ id: stepId, text: step }) => {
            const isCompleted = completedMethodSteps.has(stepId);
            const renderedStep = renderMethodStepText(
              step,
              recipe,
              servingCount,
              defaultServingCount
            );
            const timerDurationMs = isCookSection
              ? getMethodStepTimerDurationMs(renderedStep)
              : null;
            const activeTimerEndAt = activeStepTimers[stepId];
            const isTimerActive = typeof activeTimerEndAt === 'number';

            return (
              <li key={stepId} className="grid min-w-0 gap-[0.6rem]">
                <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-[0.8rem]">
                  <input
                    type="checkbox"
                    className="mt-[0.15rem] size-[1.2rem] cursor-pointer accent-app-brand"
                    checked={isCompleted}
                    onChange={(event) =>
                      onMethodStepToggle(stepId, event.target.checked)
                    }
                  />
                  <span
                    className={cn(
                      'text-app-ink-soft transition',
                      isCompleted &&
                        'text-app-muted line-through decoration-app-muted-soft'
                    )}
                  >
                    {renderedStep}
                  </span>
                </label>

                {timerDurationMs !== null && (isTimerActive || !isCompleted) ? (
                  <TimerControls
                    activeTimerEndAt={activeTimerEndAt}
                    className="ml-8"
                    durationMs={timerDurationMs}
                    onClear={() => onStepTimerClear(stepId)}
                    onStart={(durationMs) => onStepTimerStart(stepId, durationMs)}
                    timerNow={timerNow}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>

        {isCookSection ? (
          <div className="mt-4 flex justify-start">
            <div className="grid gap-2">
              <button
                type="button"
                className={pillButtonClass}
                onClick={onMarkAsCooked}
                disabled={isMarkAsCookedDisabled}
              >
                {markAsCookedLabel ?? 'Mark as cooked'}
              </button>
              {markAsCookedError ? (
                <InlineMessage>
                  {markAsCookedError}
                </InlineMessage>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </ContentPanelSection>
  );
}
