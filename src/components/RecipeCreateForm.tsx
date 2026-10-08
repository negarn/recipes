import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { CloseIcon } from './CloseIcon';
import { IconActionButton } from './IconActionButton';
import { InlineMessage } from './InlineMessage';
import { RecipeRatingSelector } from './RecipeRatingSelector';
import { RecipeConsistencyFeedback } from './RecipeConsistencyFeedback';
import { RecipeScalingFeedback } from './RecipeScalingFeedback';
import { createRecipeFromPayload } from '../helpers/recipeCreation';
import {
  applyRecipeMethodDraftEdit,
  createRecipeMethodDraft,
  getRecipeMethodDraftSelection
} from '../helpers/recipeMethodDraft';
import {
  checkRecipeConsistency,
  replaceConsistencyIssueText,
  type RecipeConsistencyIssue
} from '../helpers/recipeConsistencyValidation';
import {
  checkRecipeScaling,
  getMethodStepDraftRange,
  replaceScalingIssueText,
  type RecipeScalingIssue
} from '../helpers/recipeScalingValidation';
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

const EMPTY_RECIPE_CATALOG: Recipe[] = [];

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
    nutritionFieldDefinitions.map(({ key, unit }) => {
      const value = perServingValues[key];
      return [key, value === undefined ? '' : formatRecipeNutritionValue(value, unit)];
    })
  ) as RecipeFormNutritionDraft;
}

export function createRecipeCreateFormInitialValues(
  recipe?: Recipe,
  {
    note = ''
  }: {
    note?: string;
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
    servings: `${recipe.defaultServings}`,
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

export function parseNutritionDraft(nutritionDraft: RecipeFormNutritionDraft): {
  error: string | null;
  nutrition: RecipeNutrition | undefined;
} {
  const values: RecipeNutrition['values'] = {};

  for (const { key, label } of nutritionFieldDefinitions) {
    const rawValue = nutritionDraft[key].trim();

    if (!rawValue) {
      continue;
    }

    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return {
        error: `${label} must be a number that is 0 or greater.`,
        nutrition: undefined
      } as const;
    }

    values[key] = numericValue;
  }

  return {
    error: null,
    nutrition: Object.keys(values).length ? { sourceServings: 1, values } : undefined
  } as const;
}

export function RecipeCreateForm({
  errorMessage,
  initialValues,
  originalRecipe,
  recipes = EMPTY_RECIPE_CATALOG,
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
  originalRecipe?: Recipe;
  recipes?: Recipe[];
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
  const [hasCheckedScaling, setHasCheckedScaling] = useState(false);
  const [hasCheckedConsistency, setHasCheckedConsistency] = useState(false);
  const [reviewedScalingDraft, setReviewedScalingDraft] = useState<string | null>(null);
  const [reviewedConsistencyDraft, setReviewedConsistencyDraft] = useState<string | null>(null);
  const ingredientsRef = useRef<HTMLTextAreaElement>(null);
  const prepStepsRef = useRef<HTMLTextAreaElement>(null);
  const cookStepsRef = useRef<HTMLTextAreaElement>(null);
  const scalingPanelRef = useRef<HTMLElement>(null);
  const scalingHeadingId = useId();
  const consistencyPanelRef = useRef<HTMLElement>(null);
  const consistencyHeadingId = useId();
  const reviewDraftKey = JSON.stringify([ingredients, prepSteps, cookSteps, servings]);
  const draftReview = useMemo(() => {
    const parsedIngredients = parseIngredientLines(ingredients);
    const servingCount = Number(servings);
    if (parsedIngredients.error) {
      return { error: parsedIngredients.error, recipe: null };
    }
    if (!parsedIngredients.ingredients.length) {
      return { error: 'Add ingredients before checking the recipe.', recipe: null };
    }
    if (!Number.isSafeInteger(servingCount) || servingCount <= 0) {
      return { error: 'Enter a serving size greater than 0 before checking the recipe.', recipe: null };
    }
    const recipe = createRecipeFromPayload(
      {
        ingredients: parsedIngredients.ingredients,
        prepSteps: parseTextLines(prepSteps),
        cookSteps: parseTextLines(cookSteps),
        servings: servingCount,
        title: '',
        totalTime: '',
        note: '',
        tags: [],
        isVegan: false,
        isVegetarian: false
      },
      originalRecipe?.id ?? 'draft',
      originalRecipe
    );
    return { error: null, recipe };
  }, [ingredients, prepSteps, cookSteps, servings, originalRecipe]);
  const methodRecipe = draftReview.recipe ?? originalRecipe;
  const prepMethodDraft = useMemo(() => createRecipeMethodDraft(prepSteps, methodRecipe), [prepSteps, methodRecipe]);
  const cookMethodDraft = useMemo(() => createRecipeMethodDraft(cookSteps, methodRecipe), [cookSteps, methodRecipe]);
  const scalingCheck = useMemo(() => hasCheckedScaling && draftReview.recipe
    ? checkRecipeScaling(draftReview.recipe) : null, [hasCheckedScaling, draftReview]);
  const consistencyCheck = useMemo(() => hasCheckedConsistency && draftReview.recipe
    ? checkRecipeConsistency(draftReview.recipe, recipes) : null, [hasCheckedConsistency, draftReview, recipes]);
  const hasScalingWarnings = Boolean(scalingCheck?.issues.length);
  const hasConsistencyWarnings = Boolean(consistencyCheck?.issues.length);
  const canSaveWithWarnings =
    (hasScalingWarnings || hasConsistencyWarnings) &&
    (!hasScalingWarnings || reviewedScalingDraft === reviewDraftKey) &&
    (!hasConsistencyWarnings || reviewedConsistencyDraft === reviewDraftKey);
  let saveButtonLabel = submitLabel;
  if (isSaving) {
    saveButtonLabel = savingLabel;
  } else if (canSaveWithWarnings) {
    saveButtonLabel = 'Save anyway';
  }

  function focusScalingPanel() {
    requestAnimationFrame(() => scalingPanelRef.current?.focus());
  }

  function handleScalingCheck() {
    setHasCheckedScaling(true);
    setReviewedScalingDraft(reviewDraftKey);
  }

  function handleConsistencyCheck() {
    setHasCheckedConsistency(true);
    setReviewedConsistencyDraft(reviewDraftKey);
  }

  function getConsistencyIssueRange(issue: RecipeConsistencyIssue) {
    const drafts = { ingredients, prep: prepSteps, cook: cookSteps };
    const draft = drafts[issue.field];
    const range = getMethodStepDraftRange(draft, issue.lineIndex);
    if (!range) {
      return null;
    }
    let nameOffset = 0;
    if (issue.field === 'ingredients') {
      const line = draft.slice(range.start, range.end);
      const delimiterIndex = line.indexOf('|');
      nameOffset = delimiterIndex + 1 + line.slice(delimiterIndex + 1).search(/\S/);
    }
    return { draft, start: range.start + nameOffset + issue.start, end: range.start + nameOffset + issue.end };
  }

  function editConsistencyIssue(issue: RecipeConsistencyIssue) {
    const fields = { ingredients: ingredientsRef, prep: prepStepsRef, cook: cookStepsRef };
    const field = fields[issue.field].current;
    const range = getConsistencyIssueRange(issue);
    if (field && range) {
      const selection = issue.field === 'ingredients' ? range : getRecipeMethodDraftSelection(
        issue.field === 'prep' ? prepMethodDraft : cookMethodDraft, range.start, range.end
      );
      field.focus();
      field.setSelectionRange(selection.start, selection.end);
    }
  }

  function replaceConsistencyIssue(issue: RecipeConsistencyIssue) {
    const range = getConsistencyIssueRange(issue);
    if (!range) {
      return;
    }
    const replacement = replaceConsistencyIssueText(range.draft, {
      ...issue, start: range.start, end: range.end
    });
    const setters = { ingredients: setIngredients, prep: setPrepSteps, cook: setCookSteps };
    setters[issue.field](replacement);
  }

  function editScalingIssue(issue: RecipeScalingIssue) {
    const draft = issue.sectionId === 'prep' ? prepSteps : cookSteps;
    const field = issue.sectionId === 'prep' ? prepStepsRef.current : cookStepsRef.current;
    const range = getMethodStepDraftRange(draft, issue.stepIndex);
    if (field && range) {
      const selection = getRecipeMethodDraftSelection(
        issue.sectionId === 'prep' ? prepMethodDraft : cookMethodDraft,
        range.start + issue.start, range.start + issue.end
      );
      field.focus();
      field.setSelectionRange(selection.start, selection.end);
    }
  }

  function replaceScalingIssue(issue: RecipeScalingIssue, replacement: string) {
    const draft = issue.sectionId === 'prep' ? prepSteps : cookSteps;
    const range = getMethodStepDraftRange(draft, issue.stepIndex);
    if (!range) {
      return;
    }
    const step = draft.slice(range.start, range.end);
    const updatedStep = replaceScalingIssueText(step, issue, replacement);
    const updatedDraft = draft.slice(0, range.start) + updatedStep + draft.slice(range.end);
    if (issue.sectionId === 'prep') {
      setPrepSteps(updatedDraft);
    } else {
      setCookSteps(updatedDraft);
    }
  }

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

    const payload: RecipeCreatePayload = {
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
    };
    const recipe = createRecipeFromPayload(payload, originalRecipe?.id ?? 'draft', originalRecipe);
    const check = checkRecipeScaling(recipe);
    const consistency = checkRecipeConsistency(recipe, recipes);
    setHasCheckedScaling(true);
    setHasCheckedConsistency(true);
    const needsScalingReview = check.issues.length > 0 && reviewedScalingDraft !== reviewDraftKey;
    const needsConsistencyReview = consistency.issues.length > 0 && reviewedConsistencyDraft !== reviewDraftKey;
    if (needsScalingReview || needsConsistencyReview) {
      setReviewedScalingDraft(reviewDraftKey);
      setReviewedConsistencyDraft(reviewDraftKey);
      if (needsScalingReview) {
        focusScalingPanel();
      } else {
        requestAnimationFrame(() => consistencyPanelRef.current?.focus());
      }
      return;
    }
    onSubmit(payload);
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
            ref={ingredientsRef}
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
              Prep steps (optional)
            </span>
            <textarea
              id={prepStepsFieldId}
              ref={prepStepsRef}
              value={prepMethodDraft.text}
              onChange={(event) => setPrepSteps(applyRecipeMethodDraftEdit(prepMethodDraft, event.target.value))}
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
              ref={cookStepsRef}
              value={cookMethodDraft.text}
              onChange={(event) => setCookSteps(applyRecipeMethodDraftEdit(cookMethodDraft, event.target.value))}
              placeholder={'Heat oil and saute onion for 4 minutes.\nSimmer for 20 minutes.'}
              className={cn(textareaClass, 'min-h-[8.5rem] rounded-[18px] text-[0.96rem]')}
            />
          </label>
        </div>

        <section
          ref={scalingPanelRef}
          tabIndex={-1}
          aria-labelledby={scalingHeadingId}
          className="grid gap-3 rounded-[20px] border border-app-line-strong bg-app-surface-strong p-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-app-brand"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id={scalingHeadingId} className="m-0 text-[0.85rem] font-semibold uppercase tracking-[0.12em] text-app-muted-soft">
              Serving size check
            </h3>
            <button
              type="button"
              className={cn(pillButtonClass, 'px-4 py-2 text-[0.84rem]')}
              disabled={isSaving}
              onClick={handleScalingCheck}
            >
              Check scaling
            </button>
          </div>
          {hasCheckedScaling && draftReview.error ? <InlineMessage>{draftReview.error}</InlineMessage> : null}
          {scalingCheck && draftReview.recipe ? (
            <RecipeScalingFeedback
              check={scalingCheck}
              recipe={draftReview.recipe}
              isDisabled={isSaving}
              onEdit={editScalingIssue}
              onReplace={replaceScalingIssue}
            />
          ) : (
            <p className="m-0 text-[0.84rem] text-app-muted">Check ingredient amounts and portion counts in your prep and cook steps when servings change.</p>
          )}
        </section>

        <section
          ref={consistencyPanelRef}
          tabIndex={-1}
          aria-labelledby={consistencyHeadingId}
          className="grid gap-3 rounded-[20px] border border-app-line-strong bg-app-surface-strong p-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-app-brand"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id={consistencyHeadingId} className="m-0 text-[0.85rem] font-semibold uppercase tracking-[0.12em] text-app-muted-soft">
              Consistency check
            </h3>
            <button type="button" className={cn(pillButtonClass, 'px-4 py-2 text-[0.84rem]')} disabled={isSaving} onClick={handleConsistencyCheck}>
              Check consistency
            </button>
          </div>
          {hasCheckedConsistency && draftReview.error ? <InlineMessage>{draftReview.error}</InlineMessage> : null}
          {consistencyCheck ? (
            <RecipeConsistencyFeedback check={consistencyCheck} isDisabled={isSaving} onEdit={editConsistencyIssue} onReplace={replaceConsistencyIssue} />
          ) : (
            <p className="m-0 text-[0.84rem] text-app-muted">Check ingredient names, duplicate ingredients, and likely typos in the ingredient list. Compare ingredient spelling in prep and cook steps with your other recipes.</p>
          )}
        </section>

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
            {saveButtonLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
