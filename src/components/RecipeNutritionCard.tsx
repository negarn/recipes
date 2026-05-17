import { ContentPanelSection } from './ContentPanelSection';
import { cn } from '../helpers/uiClasses';
import {
  formatRecipeNutritionAmount,
  getRecipeNutritionPerServingValues
} from '../helpers/recipeNutrition';
import type { CSSProperties } from 'react';
import type { RecipeNutrition } from '../types/recipe';

type NutritionDailyValueProfile = {
  calorieReference: number;
  carbohydrateDailyValue: number;
  fatDailyValue: number;
  fibreDailyValue: number;
  label: string;
  proteinDailyValue: number;
  saturatedFatDailyValue: number;
  sodiumDailyValueMg: number;
};

const ADULT_DAILY_VALUE_PROFILE: NutritionDailyValueProfile = {
  calorieReference: 2000,
  carbohydrateDailyValue: 275,
  fatDailyValue: 78,
  fibreDailyValue: 28,
  label: 'FDA adult Daily Values',
  proteinDailyValue: 50,
  saturatedFatDailyValue: 20,
  sodiumDailyValueMg: 2300
};
const CHILD_DAILY_VALUE_PROFILE: NutritionDailyValueProfile = {
  calorieReference: 1000,
  carbohydrateDailyValue: 150,
  fatDailyValue: 39,
  fibreDailyValue: 14,
  label: 'FDA Daily Values for children ages 1-3',
  proteinDailyValue: 13,
  saturatedFatDailyValue: 10,
  sodiumDailyValueMg: 1500
};
const SALT_TO_SODIUM_FACTOR = 2.5;
const NUTRITION_TABLE_RADIUS_PX = 24;

const nutritionTableShellStyle: CSSProperties = {
  clipPath: `inset(0 round ${NUTRITION_TABLE_RADIUS_PX}px)`
};

const nutritionRowGridStyle: CSSProperties = {
  gridTemplateColumns: 'minmax(0,1fr) 7rem 5rem'
};

const nutritionMetricDefinitions: Array<{
  key: keyof RecipeNutrition['values'];
  label: string;
  dailyValue:
    | {
        profileKey:
          | 'calorieReference'
          | 'carbohydrateDailyValue'
          | 'fatDailyValue'
          | 'fibreDailyValue'
          | 'proteinDailyValue'
          | 'saturatedFatDailyValue';
        type: 'calories' | 'grams';
      }
    | { type: 'salt' }
    | { type: 'none' };
  depth?: number;
  unit: 'g' | 'kcal';
}> = [
  {
    key: 'calories',
    label: 'Calories',
    dailyValue: { profileKey: 'calorieReference', type: 'calories' },
    unit: 'kcal'
  },
  {
    key: 'fat',
    label: 'Fat',
    dailyValue: { profileKey: 'fatDailyValue', type: 'grams' },
    unit: 'g'
  },
  {
    key: 'saturates',
    label: 'Saturated fat',
    dailyValue: { profileKey: 'saturatedFatDailyValue', type: 'grams' },
    depth: 1,
    unit: 'g'
  },
  {
    key: 'carbs',
    label: 'Carbohydrate',
    dailyValue: { profileKey: 'carbohydrateDailyValue', type: 'grams' },
    unit: 'g'
  },
  {
    key: 'fibre',
    label: 'Fibre',
    dailyValue: { profileKey: 'fibreDailyValue', type: 'grams' },
    depth: 1,
    unit: 'g'
  },
  {
    key: 'sugars',
    label: 'Sugars',
    dailyValue: { type: 'none' },
    depth: 1,
    unit: 'g'
  },
  {
    key: 'protein',
    label: 'Protein',
    dailyValue: { profileKey: 'proteinDailyValue', type: 'grams' },
    unit: 'g'
  },
  {
    key: 'salt',
    label: 'Salt',
    dailyValue: { type: 'salt' },
    unit: 'g'
  }
];

function getNutritionDailyValueLabel(
  value: number,
  dailyValue: (typeof nutritionMetricDefinitions)[number]['dailyValue'],
  dailyValueProfile: NutritionDailyValueProfile
) {
  if (!Number.isFinite(value) || value < 0) {
    return '—';
  }

  if (dailyValue.type === 'none') {
    return '—';
  }

  const percent =
    dailyValue.type === 'salt'
      ? (((value / SALT_TO_SODIUM_FACTOR) * 1000) / dailyValueProfile.sodiumDailyValueMg) *
        100
      : (value / dailyValueProfile[dailyValue.profileKey]) * 100;

  if (percent > 0 && percent < 1) {
    return '<1%';
  }

  return `${Math.round(percent)}%`;
}

function getNutritionRows(nutrition?: RecipeNutrition) {
  const perServingValues = getRecipeNutritionPerServingValues(nutrition);

  if (!perServingValues) {
    return null;
  }

  const rows = nutritionMetricDefinitions.map(({ key, label, unit, depth = 0, dailyValue }) => ({
    key,
    label,
    depth,
    dailyValue,
    scaledValue: perServingValues[key],
    unit
  }));

  return rows.every((row) => Number.isFinite(row.scaledValue) && row.scaledValue >= 0)
    ? rows
    : null;
}

export function RecipeNutritionCard({
  isChildrenRecipe = false,
  nutrition
}: {
  isChildrenRecipe?: boolean;
  nutrition?: RecipeNutrition;
}) {
  const nutritionRows = getNutritionRows(nutrition);
  const dailyValueProfile = isChildrenRecipe
    ? CHILD_DAILY_VALUE_PROFILE
    : ADULT_DAILY_VALUE_PROFILE;

  return (
    <div data-bookmark-selection-exclude="true">
      <ContentPanelSection title="Nutrition" className="min-w-0" titleWrapClassName="grid gap-1">
        {nutritionRows ? (
          <div
            className="relative isolate max-w-full overflow-hidden rounded-[24px] border border-app-field-border bg-app-surface-tint shadow-[0_10px_24px_rgba(31,64,54,0.04)]"
            style={nutritionTableShellStyle}
          >
            <div
              className="grid border-b border-app-field-border bg-app-meal-day-chip/70"
              style={nutritionRowGridStyle}
            >
              <p className="m-0 px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-[0.16em] text-app-muted">
                Nutrient
              </p>
              <p className="m-0 px-4 py-3 text-right text-[0.72rem] font-bold uppercase tracking-[0.16em] text-app-muted">
                Amount
              </p>
              <p className="m-0 px-4 py-3 text-right text-[0.72rem] font-bold uppercase tracking-[0.16em] text-app-muted">
                % DV
              </p>
            </div>
            <div>
              {nutritionRows.map((item, itemIndex) => {
                const isLastRow = itemIndex === nutritionRows.length - 1;
                const isNoDailyValue = item.dailyValue.type === 'none';

                return (
                  <div
                    key={item.key}
                    className={cn(
                      'grid items-center border-b border-app-field-border',
                      isLastRow && 'border-b-0'
                    )}
                    style={nutritionRowGridStyle}
                  >
                    <p
                      className={cn(
                        'm-0 px-4 py-3 text-left font-semibold leading-none text-app-ink',
                        item.depth
                          ? 'pl-8 text-[0.95rem] font-medium text-app-muted'
                          : 'text-[1rem]'
                      )}
                    >
                      {item.label}
                    </p>
                    <p className="m-0 px-4 py-3 text-right text-[1rem] font-semibold leading-none whitespace-nowrap tabular-nums text-app-ink">
                      {formatRecipeNutritionAmount(item.scaledValue, item.unit)}
                    </p>
                    <p
                      className={cn(
                        'm-0 px-4 py-3 text-[1rem] font-semibold leading-none whitespace-nowrap tabular-nums',
                        isNoDailyValue
                          ? 'text-center text-app-muted'
                          : 'text-right text-app-brand-strong'
                      )}
                    >
                      {getNutritionDailyValueLabel(
                        item.scaledValue,
                        item.dailyValue,
                        dailyValueProfile
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="m-0 border-t border-app-field-border px-4 py-3 text-[0.78rem] text-app-muted-soft">
              Values shown for 1 serving. % DV uses {dailyValueProfile.label}.
              Calories are shown against a{' '}
              {dailyValueProfile.calorieReference.toLocaleString('en-CA')}-calorie
              diet, sugars have no established FDA %DV, and salt is converted
              to a sodium equivalent for comparison.
            </p>
          </div>
        ) : (
          <p className="m-0 text-[0.95rem] text-app-muted">
            Nutrition data is not available for this recipe yet.
          </p>
        )}
      </ContentPanelSection>
    </div>
  );
}
