import { EmptyStateMessage } from '../components/PageStatusMessage';
import { CloudSyncSection } from '../components/CloudSyncSection';
import { SettingsPageSkeleton } from '../components/SettingsPageSkeleton';
import { ServingSizeControl } from '../components/ServingSizeControl';
import { TabbedPageHeader } from '../components/TabbedPageHeader';
import { TabbedPanelLayout } from '../components/TabbedPanelLayout';
import {
  useRecipePreferencesContext,
  useRecipeRatingsContext
} from '../contexts/RecipeAppDataContext';
import { DEFAULT_RECIPE_SERVING_SIZE } from '../helpers/recipePreferenceData';
import {
  cn,
  subheadingChipClass,
  subheadingLabelClass,
  pillButtonClass
} from '../helpers/uiClasses';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useSyncedDraftState } from '../hooks/useSyncedDraftState';

export function SettingsPage() {
  const { hasResolvedRecipeRatings } = useRecipeRatingsContext();
  const {
    handleDefaultServingSizeChange: onDefaultServingSizeChange,
    recipeSettings
  } = useRecipePreferencesContext();
  const persistedDefaultServingSize = recipeSettings.defaultServingSize;
  const hasCustomDefaultServingSize = persistedDefaultServingSize !== undefined;
  const servingSizeControlValue =
    persistedDefaultServingSize ?? DEFAULT_RECIPE_SERVING_SIZE;
  const [defaultServingSizeDraft, setDefaultServingSizeDraft] = useSyncedDraftState(
    servingSizeControlValue
  );
  const saveAction = useAsyncAction();

  function runDefaultServingSizeSave({
    nextDefaultServingSize,
    nextDraftValue
  }: {
    nextDefaultServingSize: number | null;
    nextDraftValue: number;
  }) {
    const previousServingSize = servingSizeControlValue;

    setDefaultServingSizeDraft(nextDraftValue);

    void saveAction.run(
      () => onDefaultServingSizeChange(nextDefaultServingSize),
      'Could not save recipe settings.',
      {
        onError: () => {
          setDefaultServingSizeDraft(previousServingSize);
        }
      }
    );
  }

  function updateDefaultServingSize(nextDefaultServingSize: number) {
    if (saveAction.isPending || nextDefaultServingSize === defaultServingSizeDraft) {
      return;
    }

    runDefaultServingSizeSave({
      nextDefaultServingSize,
      nextDraftValue: nextDefaultServingSize
    });
  }

  function resetDefaultServingSize() {
    if (!hasCustomDefaultServingSize || saveAction.isPending) {
      return;
    }

    runDefaultServingSizeSave({
      nextDefaultServingSize: null,
      nextDraftValue: DEFAULT_RECIPE_SERVING_SIZE
    });
  }

  return (
    <TabbedPanelLayout>
      <TabbedPageHeader title="Settings" />

      {!hasResolvedRecipeRatings ? (
        <SettingsPageSkeleton />
      ) : (
        <section className="w-full max-w-[40rem] min-[1100px]:max-w-[96rem]">
          <div className="grid w-full gap-8">
            <div className="grid gap-2.5">
              <h2
                className={cn(
                  subheadingLabelClass,
                  subheadingChipClass
                )}
              >
                Default serving size
              </h2>

              <div className="grid gap-4 rounded-[24px] border border-app-field-border bg-app-meal-row p-4 min-[1100px]:p-5">
                <EmptyStateMessage className="max-w-none text-[0.96rem] leading-[1.56]">
                  {hasCustomDefaultServingSize
                    ? 'This global override replaces each recipe’s default serving count. Your recipe-specific servings stay the same.'
                    : 'Recipes are currently using their own default servings. Pick a number here to set a shared starting point, or leave this unset to keep each recipe default.'}
                </EmptyStateMessage>

                <div className="grid w-full gap-2.5 border-t border-app-field-border/85 pt-3 min-[1100px]:grid-cols-[auto_auto] min-[1100px]:grid-rows-[2.58rem] min-[1100px]:items-stretch min-[1100px]:justify-start min-[1100px]:gap-3 min-[1100px]:pt-3.5">
                  <ServingSizeControl
                    value={defaultServingSizeDraft}
                    ariaLabel="Adjust default serving size"
                    decreaseLabel="Decrease default serving size"
                    increaseLabel="Increase default serving size"
                    onChange={updateDefaultServingSize}
                    min={1}
                    isDisabled={saveAction.isPending}
                    controlClassName="h-[2.78rem] w-full justify-between p-[0.16rem] !bg-app-field shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_8px_18px_rgba(31,64,54,0.05)] min-[1100px]:h-full min-[1100px]:w-fit"
                    buttonClassName="h-[2.2rem] w-[2.08rem] text-[0.94rem] enabled:cursor-pointer min-[1100px]:h-[2rem] min-[1100px]:w-[1.9rem]"
                    valueClassName="h-[2.2rem] min-w-0 flex-1 gap-[0.24rem] px-[0.62rem] text-[0.84rem] min-[720px]:min-w-[6.8rem] min-[1100px]:h-[2rem] min-[1100px]:min-w-0 min-[1100px]:flex-none"
                    valueNumberClassName="text-[1rem]"
                    valueLabelClassName="text-[0.54rem]"
                  />
                  {hasCustomDefaultServingSize ? (
                    <button
                      type="button"
                      className={cn(
                        pillButtonClass,
                        'h-[2.78rem] w-full justify-center text-[0.84rem] min-[1100px]:h-full min-[1100px]:w-fit min-[1100px]:px-[1.02rem] min-[1100px]:text-[0.8rem]'
                      )}
                      onClick={resetDefaultServingSize}
                      disabled={saveAction.isPending}
                    >
                      Use Recipe Defaults
                    </button>
                  ) : (
                    <p className="m-0 text-[0.8rem] font-semibold text-app-brand-strong">
                      Using each recipe&apos;s default servings.
                    </p>
                  )}
                  {saveAction.error ? (
                    <p
                      className={cn(
                        'm-0 text-[0.82rem] text-app-danger min-[1100px]:col-span-2'
                      )}
                      role="alert"
                    >
                      {saveAction.error}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <CloudSyncSection />
          </div>
        </section>
      )}
    </TabbedPanelLayout>
  );
}
