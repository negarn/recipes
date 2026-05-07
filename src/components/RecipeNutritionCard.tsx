import { ContentPanelSection } from './ContentPanelSection';
import { cn } from '../helpers/uiClasses';
import {
  formatRecipeNutritionAmount,
  getRecipeNutritionPerServingValues
} from '../helpers/recipeNutrition';
import type { CSSProperties } from 'react';
import type { RecipeNutrition } from '../types/recipe';

const CALORIE_REFERENCE = 2000;
const PROTEIN_DAILY_VALUE = 50;
const FAT_DAILY_VALUE = 78;
const SATURATED_FAT_DAILY_VALUE = 20;
const CARBOHYDRATE_DAILY_VALUE = 275;
const FIBRE_DAILY_VALUE = 28;
const SODIUM_DAILY_VALUE_MG = 2300;
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
    | { type: 'calories'; value: number }
    | { type: 'grams'; value: number }
    | { type: 'salt' }
    | { type: 'none' };
  depth?: number;
  unit: 'g' | 'kcal';
}> = [
  {
    key: 'calories',
    label: 'Calories',
    dailyValue: { type: 'calories', value: CALORIE_REFERENCE },
    unit: 'kcal'
  },
  {
    key: 'fat',
    label: 'Fat',
    dailyValue: { type: 'grams', value: FAT_DAILY_VALUE },
    unit: 'g'
  },
  {
    key: 'saturates',
    label: 'Saturated fat',
    dailyValue: { type: 'grams', value: SATURATED_FAT_DAILY_VALUE },
    depth: 1,
    unit: 'g'
  },
  {
    key: 'carbs',
    label: 'Carbohydrate',
    dailyValue: { type: 'grams', value: CARBOHYDRATE_DAILY_VALUE },
    unit: 'g'
  },
  {
    key: 'fibre',
    label: 'Fibre',
    dailyValue: { type: 'grams', value: FIBRE_DAILY_VALUE },
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
    dailyValue: { type: 'grams', value: PROTEIN_DAILY_VALUE },
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
  dailyValue: (typeof nutritionMetricDefinitions)[number]['dailyValue']
) {
  if (!Number.isFinite(value) || value < 0) {
    return '—';
  }

  if (dailyValue.type === 'none') {
    return '—';
  }

  const percent =
    dailyValue.type === 'salt'
      ? (((value / SALT_TO_SODIUM_FACTOR) * 1000) / SODIUM_DAILY_VALUE_MG) * 100
      : (value / dailyValue.value) * 100;

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
  nutrition
}: {
  nutrition?: RecipeNutrition;
}) {
  const nutritionRows = getNutritionRows(nutrition);

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
                      {getNutritionDailyValueLabel(item.scaledValue, item.dailyValue)}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="m-0 border-t border-app-field-border px-4 py-3 text-[0.78rem] text-app-muted-soft">
              Values shown for 1 serving. % DV uses FDA adult Daily Values.
              Calories are shown against a 2,000-calorie diet, sugars have
              no established FDA %DV, and salt is converted to a sodium
              equivalent for comparison.
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
