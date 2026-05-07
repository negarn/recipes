import { useId, useState, type FormEvent } from 'react';
import { CloseIcon } from './CloseIcon';
import { IconActionButton } from './IconActionButton';
import { InlineMessage } from './InlineMessage';
import { RecipeRatingSelector } from './RecipeRatingSelector';
import { formatQuantityWithUnit } from '../helpers/quantityFormatting';
import {
  formatRecipeNutritionValue,
  getRecipeNutritionPerServingValues
} from '../helpers/recipeNutrition';
import { cn, fieldClass, pillButtonClass, textareaClass } from '../helpers/uiClasses';
import { isValidRecipeRating } from '../helpers/recipePreferenceData';
import type { Ingredient, Recipe, RecipeNutrition } from '../types/recipe';

const nutritionFieldDefinitions: Array<{
  key: keyof RecipeNutrition['values'];
  label: string;
  placeholder: string;
  unit: 'g' | 'kcal';
}> = [
  { key: 'calories', label: 'Calories', placeholder: '520', unit: 'kcal' },
  { key: 'carbs', label: 'Carbs (g)', placeholder: '42', unit: 'g' },
  { key: 'fat', label: 'Fat (g)', placeholder: '18', unit: 'g' },
  { key: 'saturates', label: 'Saturated fat (g)', placeholder: '6', unit: 'g' },
  { key: 'sugars', label: 'Sugars (g)', placeholder: '8', unit: 'g' },
  { key: 'fibre', label: 'Fibre (g)', placeholder: '5', unit: 'g' },
  { key: 'protein', label: 'Protein (g)', placeholder: '24', unit: 'g' },
  { key: 'salt', label: 'Salt (g)', placeholder: '1.1', unit: 'g' }
];

type RecipeFormNutritionDraft = Record<keyof RecipeNutrition['values'], string>;

export type RecipeCreateFormInitialValues = {
  cookSteps: string;
  ingredients: string;
  isChildrenTagEnabled: boolean;
  isVeganTagEnabled: boolean;
  isVegetarianTagEnabled: boolean;
  notes: string;
  nutritionDraft: RecipeFormNutritionDraft;
  prepSteps: string;
  rating: number | undefined;
  servings: string;
  title: string;
  totalTime: string;
};

const EMPTY_NUTRITION_DRAFT: RecipeFormNutritionDraft = {
  calories: '',
  carbs: '',
  fat: '',
  fibre: '',
  protein: '',
  salt: '',
  saturates: '',
  sugars: ''
};

function formatRecipeAmountForDraft(amount: Ingredient['amount']) {
  if (amount.type === 'fixed') {
    return amount.text;
  }

  const amountLabel = formatQuantityWithUnit(amount.quantity, amount.unit);

  return amount.note ? `${amountLabel} (${amount.note})` : amountLabel;
}

function getRecipeSectionSteps(recipe: Recipe, sectionName: 'prep' | 'cook') {
  const normalizedSectionName = sectionName.toLowerCase();
  const recipeSection = recipe.sections.find((section) => {
    const normalizedSectionId = section.id.trim().toLowerCase();
    const normalizedSectionTitle = section.title.trim().toLowerCase();

    return (
      normalizedSectionId === normalizedSectionName ||
      normalizedSectionTitle === normalizedSectionName
    );
  });

  return recipeSection?.steps ?? [];
}

function createEmptyRecipeCreateFormInitialValues(): RecipeCreateFormInitialValues {
  return {
    cookSteps: '',
    ingredients: '',
    isChildrenTagEnabled: false,
    isVeganTagEnabled: false,
    isVegetarianTagEnabled: false,
    notes: '',
    nutritionDraft: { ...EMPTY_NUTRITION_DRAFT },
    prepSteps: '',
    rating: undefined,
    servings: '2',
    title: '',
    totalTime: ''
  };
}

function createRecipeNutritionDraft(recipeNutrition?: RecipeNutrition) {
  const perServingValues = getRecipeNutritionPerServingValues(recipeNutrition);

  if (!perServingValues) {
    return { ...EMPTY_NUTRITION_DRAFT };
  }

  return Object.fromEntries(
    nutritionFieldDefinitions.map(({ key, unit }) => [
      key,
      formatRecipeNutritionValue(perServingValues[key], unit)
    ])
  ) as RecipeFormNutritionDraft;
}

export function createRecipeCreateFormInitialValues(
  recipe?: Recipe,
  {
    note = '',
    servings
  }: {
    note?: string;
    servings?: number;
  } = {}
): RecipeCreateFormInitialValues {
  if (!recipe) {
    return createEmptyRecipeCreateFormInitialValues();
  }

  return {
    cookSteps: getRecipeSectionSteps(recipe, 'cook').join('\n'),
    ingredients: recipe.ingredients
      .map(
        (ingredient) =>
          `${formatRecipeAmountForDraft(ingredient.amount)} | ${ingredient.name}`
      )
      .join('\n'),
    isChildrenTagEnabled: recipe.tags.includes('children'),
    isVeganTagEnabled: recipe.isVegan,
    isVegetarianTagEnabled: recipe.isVegetarian || recipe.isVegan,
    notes: note,
    nutritionDraft: createRecipeNutritionDraft(recipe.nutrition),
    prepSteps: getRecipeSectionSteps(recipe, 'prep').join('\n'),
    rating: recipe.rating,
    servings: `${servings ?? recipe.defaultServings}`,
    title: recipe.title,
    totalTime: recipe.totalTime
  };
}

export type RecipeCreatePayload = {
  cookSteps: string[];
  ingredients: Array<{
    amountText: string;
    name: string;
  }>;
  isVegan: boolean;
  isVegetarian: boolean;
  note: string;
  nutrition?: RecipeNutrition;
  prepSteps: string[];
  rating?: number;
  servings: number;
  tags: string[];
  title: string;
  totalTime: string;
};

function parseTextLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseIngredientLines(value: string) {
  const lines = parseTextLines(value);
  const ingredients: Array<{
    amountText: string;
    name: string;
  }> = [];

  for (const [lineIndex, line] of lines.entries()) {
    const delimiterIndex = line.indexOf('|');

    if (delimiterIndex <= 0 || delimiterIndex >= line.length - 1) {
      return {
        error: `Ingredient line ${lineIndex + 1} must use "amount | ingredient".`,
        ingredients: null
      } as const;
    }

    const amountText = line.slice(0, delimiterIndex).trim();
    const name = line.slice(delimiterIndex + 1).trim();

    if (!amountText || !name) {
      return {
        error: `Ingredient line ${lineIndex + 1} must include both amount and ingredient.`,
        ingredients: null
      } as const;
    }

    ingredients.push({
      amountText,
      name
    });
  }

  return {
    error: null,
    ingredients
  } as const;
}

function parseNutritionDraft(nutritionDraft: RecipeFormNutritionDraft) {
  const hasAnyNutritionField = nutritionFieldDefinitions.some(
    ({ key }) => nutritionDraft[key].trim().length > 0
  );

  if (!hasAnyNutritionField) {
    return {
      error: null,
      nutrition: undefined
    } as const;
  }

  const parsedEntries = nutritionFieldDefinitions.map(({ key, label }) => {
    const rawValue = nutritionDraft[key].trim();

    if (!rawValue) {
      return {
        error: `Nutrition is missing ${label}.`
      } as const;
    }

    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return {
        error: `${label} must be a number that is 0 or greater.`
      } as const;
    }

    return {
      entry: [key, numericValue] as const
    } as const;
  });

  const invalidEntry = parsedEntries.find((entry) => 'error' in entry);

  if (invalidEntry && 'error' in invalidEntry) {
    return {
      error: invalidEntry.error,
      nutrition: undefined
    } as const;
  }

  return {
    error: null,
    nutrition: {
      sourceServings: 1,
      values: Object.fromEntries(
        parsedEntries.map((entry) => ('entry' in entry ? entry.entry : null)).filter(
          (
            entry
          ): entry is [keyof RecipeNutrition['values'], number] => entry !== null
        )
      ) as RecipeNutrition['values']
    } satisfies RecipeNutrition
  } as const;
}

export function RecipeCreateForm({
  errorMessage,
  initialValues,
  formId,
  isSaving,
  savingLabel,
  closeLabel,
  submitLabel,
  onClose,
  onSubmit
}: {
  errorMessage?: string | null;
  initialValues: RecipeCreateFormInitialValues;
  formId: string;
  isSaving: boolean;
  savingLabel: string;
  closeLabel: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (payload: RecipeCreatePayload) => void;
}) {
  const titleFieldId = useId();
  const servingsFieldId = useId();
  const cookingTimeFieldId = useId();
  const ingredientsFieldId = useId();
  const prepStepsFieldId = useId();
  const cookStepsFieldId = useId();
  const notesFieldId = useId();
  const [title, setTitle] = useState(initialValues.title);
  const [servings, setServings] = useState(initialValues.servings);
  const [totalTime, setTotalTime] = useState(initialValues.totalTime);
  const [rating, setRating] = useState<number | undefined>(initialValues.rating);
  const [ingredients, setIngredients] = useState(initialValues.ingredients);
  const [prepSteps, setPrepSteps] = useState(initialValues.prepSteps);
  const [cookSteps, setCookSteps] = useState(initialValues.cookSteps);
  const [notes, setNotes] = useState(initialValues.notes);
  const [isVegetarianTagEnabled, setIsVegetarianTagEnabled] = useState(
    initialValues.isVegetarianTagEnabled
  );
  const [isVeganTagEnabled, setIsVeganTagEnabled] = useState(
    initialValues.isVeganTagEnabled
  );
  const [isChildrenTagEnabled, setIsChildrenTagEnabled] = useState(
    initialValues.isChildrenTagEnabled
  );
  const [nutritionDraft, setNutritionDraft] = useState<RecipeFormNutritionDraft>({
    ...initialValues.nutritionDraft
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  function updateNutritionDraft(key: keyof RecipeNutrition['values'], value: string) {
    setNutritionDraft((currentDraft) =>
      currentDraft[key] === value
        ? currentDraft
        : {
            ...currentDraft,
            [key]: value
          }
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    const normalizedTitle = title.trim();
    const normalizedTotalTime = totalTime.trim();
    const servingsValue = Number(servings);
    const ratingValue = rating;
    const parsedIngredients = parseIngredientLines(ingredients);
    const prepStepLines = parseTextLines(prepSteps);
    const cookStepLines = parseTextLines(cookSteps);

    if (!normalizedTitle) {
      setValidationError('Recipe title is required.');
      return;
    }

    if (!Number.isSafeInteger(servingsValue) || servingsValue <= 0) {
      setValidationError('Serving size must be a whole number greater than 0.');
      return;
    }

    if (!normalizedTotalTime) {
      setValidationError('Cook time is required.');
      return;
    }

    if (ratingValue !== undefined && !isValidRecipeRating(ratingValue)) {
      setValidationError('Rating must be between 0.5 and 5 in 0.5 steps.');
      return;
    }

    if (parsedIngredients.error) {
      setValidationError(parsedIngredients.error);
      return;
    }

    if (!parsedIngredients.ingredients.length) {
      setValidationError('At least one ingredient is required.');
      return;
    }

    if (!prepStepLines.length) {
      setValidationError('Add at least one prep step.');
      return;
    }

    if (!cookStepLines.length) {
      setValidationError('Add at least one cook step.');
      return;
    }

    const parsedNutrition = parseNutritionDraft(nutritionDraft);

    if (parsedNutrition.error) {
      setValidationError(parsedNutrition.error);
      return;
    }

    const tags = [
      ...(isVegetarianTagEnabled ? ['vegetarian'] : []),
      ...(isVeganTagEnabled ? ['vegan'] : []),
      ...(isChildrenTagEnabled ? ['children'] : [])
    ];
    const deduplicatedTags = [...new Set(tags)];
    const isVegan = isVeganTagEnabled || deduplicatedTags.includes('vegan');
    const isVegetarian =
      isVegan ||
      isVegetarianTagEnabled ||
      deduplicatedTags.includes('vegetarian');

    onSubmit({
      cookSteps: cookStepLines,
      ingredients: parsedIngredients.ingredients,
      isVegan,
      isVegetarian,
      note: notes.trim(),
      nutrition: parsedNutrition.nutrition,
      prepSteps: prepStepLines,
      rating: ratingValue,
      servings: servingsValue,
      tags: deduplicatedTags,
      title: normalizedTitle,
      totalTime: normalizedTotalTime
    });
  }

  return (
    <form
      id={formId}
      className="relative mb-5 rounded-[24px] border border-app-field-border bg-app-meal-row p-4 shadow-[0_14px_30px_rgba(31,64,54,0.08)] min-[900px]:p-5"
      onSubmit={handleSubmit}
    >
      <IconActionButton
        className="absolute right-[0.92rem] top-[0.74rem] inline-flex size-[1.58rem] shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-transparent text-app-muted-soft transition hover:text-app-danger focus-visible:text-app-danger focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)] focus-visible:outline-none"
        onClick={onClose}
        disabled={isSaving}
        label={closeLabel}
        useBaseStyles={false}
      >
        <CloseIcon className="size-[1.22rem]" strokeWidth={2.2} />
      </IconActionButton>

      <div className="grid gap-4">
        <div className="grid gap-3 min-[1024px]:grid-cols-[minmax(0,1.7fr)_minmax(0,9.5rem)_minmax(0,11rem)_auto] min-[1024px]:items-end">
          <label className="grid gap-1.5 min-[1024px]:min-w-0" htmlFor={titleFieldId}>
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-app-muted-soft">
              Recipe title
            </span>
            <input
              id={titleFieldId}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Creamy tomato pasta"
              className={cn(fieldClass, 'h-[3rem] rounded-[16px] px-4 py-0 text-[0.98rem]')}
            />
          </label>

          <label
            className="grid gap-1.5 min-[1024px]:grid-rows-[auto_3rem]"
            htmlFor={servingsFieldId}
          >
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-app-muted-soft">
              Serving size
            </span>
            <input
              id={servingsFieldId}
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={servings}
              onChange={(event) => setServings(event.target.value)}
              className={cn(fieldClass, 'h-[3rem] rounded-[16px] px-4 py-0 text-[0.98rem]')}
            />
          </label>

          <label
            className="grid gap-1.5 min-[1024px]:grid-rows-[auto_3rem]"
            htmlFor={cookingTimeFieldId}
          >
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-app-muted-soft">
              Cook time
            </span>
            <input
              id={cookingTimeFieldId}
              type="text"
              value={totalTime}
              onChange={(event) => setTotalTime(event.target.value)}
              placeholder="35 mins"
              className={cn(fieldClass, 'h-[3rem] rounded-[16px] px-4 py-0 text-[0.98rem]')}
            />
          </label>

          <div className="grid gap-1.5 min-[1024px]:min-w-[13.8rem] min-[1024px]:grid-rows-[auto_3rem]">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-app-muted-soft">
              Rating (optional)
            </span>
            <fieldset
              disabled={isSaving}
              className="m-0 border-0 p-0"
            >
              <legend className="sr-only">Set recipe rating</legend>
              <div
                className="flex h-[3rem] w-full items-center rounded-[16px] border border-app-field-border bg-app-field px-4 shadow-[0_10px_24px_rgba(31,64,54,0.05)] transition focus-within:border-app-field-border-strong focus-within:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_14px_28px_rgba(31,64,54,0.08)]"
              >
                <RecipeRatingSelector
                  rating={rating}
                  isDisabled={isSaving}
                  onChange={(nextRating) => {
                    setRating(nextRating);
                  }}
                  onClear={() => {
                    setRating(undefined);
                  }}
                  starsClassName="text-[1.9rem]"
                />
              </div>
            </fieldset>
          </div>
        </div>

        <label className="grid gap-1.5" htmlFor={ingredientsFieldId}>
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-app-muted-soft">
            Ingredients and amounts
          </span>
          <textarea
            id={ingredientsFieldId}
            value={ingredients}
            onChange={(event) => setIngredients(event.target.value)}
            placeholder={'2 tbsp | olive oil\n400 g | canned tomatoes'}
            className={cn(textareaClass, 'min-h-[8.3rem] rounded-[18px] text-[0.96rem]')}
          />
          <span className="text-[0.78rem] text-app-muted-soft">
            Use one line per ingredient in the format: amount | ingredient.
          </span>
        </label>

        <div className="grid gap-4 min-[900px]:grid-cols-2">
          <label className="grid gap-1.5" htmlFor={prepStepsFieldId}>
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-app-muted-soft">
              Prep steps
            </span>
            <textarea
              id={prepStepsFieldId}
              value={prepSteps}
              onChange={(event) => setPrepSteps(event.target.value)}
              placeholder={'Chop onion.\nMeasure spices.'}
              className={cn(textareaClass, 'min-h-[8.5rem] rounded-[18px] text-[0.96rem]')}
            />
          </label>

          <label className="grid gap-1.5" htmlFor={cookStepsFieldId}>
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-app-muted-soft">
              Cook steps
            </span>
            <textarea
              id={cookStepsFieldId}
              value={cookSteps}
              onChange={(event) => setCookSteps(event.target.value)}
              placeholder={'Heat oil and saute onion for 4 minutes.\nSimmer for 20 minutes.'}
              className={cn(textareaClass, 'min-h-[8.5rem] rounded-[18px] text-[0.96rem]')}
            />
          </label>
        </div>

        <label className="grid gap-1.5" htmlFor={notesFieldId}>
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-app-muted-soft">
            Notes (optional)
          </span>
          <textarea
            id={notesFieldId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Swap basil for parsley if needed."
            className={cn(textareaClass, 'min-h-[6.6rem] rounded-[18px] text-[0.96rem]')}
          />
        </label>

        <section className="grid gap-3 rounded-[20px] border border-app-line-strong bg-app-surface-strong p-3.5 shadow-[0_10px_24px_rgba(31,64,54,0.05)]">
          <h3 className="m-0 text-[0.85rem] font-semibold uppercase tracking-[0.12em] text-app-muted-soft">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2.5">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[0.94rem] text-app-ink">
              <input
                type="checkbox"
                className="size-[1rem] cursor-pointer accent-app-brand"
                checked={isVegetarianTagEnabled}
                onChange={(event) => setIsVegetarianTagEnabled(event.target.checked)}
              />
              Vegetarian
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-[0.94rem] text-app-ink">
              <input
                type="checkbox"
                className="size-[1rem] cursor-pointer accent-app-brand"
                checked={isVeganTagEnabled}
                onChange={(event) => setIsVeganTagEnabled(event.target.checked)}
              />
              Vegan
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-[0.94rem] text-app-ink">
              <input
                type="checkbox"
                className="size-[1rem] cursor-pointer accent-app-brand"
                checked={isChildrenTagEnabled}
                onChange={(event) => setIsChildrenTagEnabled(event.target.checked)}
              />
              Children
            </label>
          </div>
        </section>

        <section className="grid gap-3 rounded-[20px] border border-app-line-strong bg-app-surface-strong p-3.5 shadow-[0_10px_24px_rgba(31,64,54,0.05)]">
          <h3 className="m-0 text-[0.85rem] font-semibold uppercase tracking-[0.12em] text-app-muted-soft">
            Nutrition per serving (optional)
          </h3>
          <div className="grid gap-3 min-[780px]:grid-cols-2 min-[1080px]:grid-cols-4">
            {nutritionFieldDefinitions.map(({ key, label, placeholder }) => (
              <label key={key} className="grid gap-1.5">
                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-app-muted-soft">
                  {label}
                </span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={nutritionDraft[key]}
                  onChange={(event) => updateNutritionDraft(key, event.target.value)}
                  placeholder={placeholder}
                  className={cn(fieldClass, 'h-[3rem] rounded-[16px] px-4 py-0 text-[0.96rem]')}
                />
              </label>
            ))}
          </div>
        </section>

        {validationError ? <InlineMessage>{validationError}</InlineMessage> : null}
        {errorMessage ? <InlineMessage>{errorMessage}</InlineMessage> : null}

        <div className="flex justify-start">
          <button
            type="submit"
            className={cn(
              pillButtonClass,
              'h-[3rem] min-w-[9.4rem] rounded-[16px] px-5 text-[0.9rem] shadow-[0_12px_22px_rgba(31,64,54,0.1)]'
            )}
            disabled={isSaving}
          >
            {isSaving ? savingLabel : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
