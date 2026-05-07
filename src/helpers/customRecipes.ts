import { isNonEmptyString, isRecordLike } from './normalization';
import { isValidRecipeRating } from './recipePreferenceData';
import type { Ingredient, IngredientUnit, MethodSection, Recipe, RecipeNutrition } from '../types/recipe';

const RECIPE_NUTRITION_VALUE_KEYS: Array<keyof RecipeNutrition['values']> = [
  'calories',
  'carbs',
  'fat',
  'saturates',
  'sugars',
  'fibre',
  'protein',
  'salt'
];

function normalizeSpacing(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function toIdSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeOptionalId(value: unknown) {
  return isNonEmptyString(value) ? value.trim() : '';
}

function ensureUniqueId(id: string, seenIds: Set<string>) {
  const baseId = toIdSlug(id) || id;

  if (!seenIds.has(baseId)) {
    seenIds.add(baseId);
    return baseId;
  }

  let candidateId = baseId;
  let duplicateCount = 2;

  while (seenIds.has(candidateId)) {
    candidateId = `${baseId}-${duplicateCount}`;
    duplicateCount += 1;
  }

  seenIds.add(candidateId);
  return candidateId;
}

function normalizeIngredientUnit(value: unknown): IngredientUnit | undefined {
  if (!isRecordLike(value) || !isNonEmptyString(value.singular)) {
    return undefined;
  }

  const singular = normalizeSpacing(value.singular);
  const plural = isNonEmptyString(value.plural) ? normalizeSpacing(value.plural) : undefined;
  const separator = value.separator === 'none' || value.separator === 'space'
    ? value.separator
    : undefined;

  return {
    plural,
    separator,
    singular
  };
}

function normalizeStoredIngredientName(value: string) {
  // Keep persisted ingredient labels aligned with what the user entered so
  // local storage and cloud sync snapshots stay identical.
  return normalizeSpacing(value);
}

function parseFraction(label: string) {
  const [numeratorLabel, denominatorLabel] = label.split('/');
  const numerator = Number(numeratorLabel);
  const denominator = Number(denominatorLabel);

  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return null;
  }

  const value = numerator / denominator;
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseAmountQuantity(label: string) {
  const normalizedLabel = normalizeSpacing(label);
  const mixedFractionMatch = normalizedLabel.match(/^(\d+)\s+(\d+)\/(\d+)$/);

  if (mixedFractionMatch) {
    const wholeNumber = Number(mixedFractionMatch[1]);
    const fraction = parseFraction(`${mixedFractionMatch[2]}/${mixedFractionMatch[3]}`);

    if (!Number.isFinite(wholeNumber) || fraction === null) {
      return null;
    }

    return wholeNumber + fraction;
  }

  if (normalizedLabel.includes('/')) {
    return parseFraction(normalizedLabel);
  }

  const quantity = Number(normalizedLabel);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}

function parseIngredientUnitLabel(rawUnitLabel: string | undefined): IngredientUnit | undefined {
  if (!rawUnitLabel) {
    return undefined;
  }

  const normalizedUnitLabel = normalizeSpacing(rawUnitLabel).toLowerCase();

  switch (normalizedUnitLabel) {
    case 'x':
    case 'piece':
    case 'pieces':
    case 'pc':
    case 'pcs':
    case 'cube':
    case 'cubes':
      return { singular: 'x' };
    case 'tbsp':
    case 'tablespoon':
    case 'tablespoons':
      return { singular: 'tbsp' };
    case 'tsp':
    case 'teaspoon':
    case 'teaspoons':
      return { singular: 'tsp' };
    case 'g':
    case 'gram':
    case 'grams':
      return { separator: 'none', singular: 'g' };
    case 'kg':
    case 'kilogram':
    case 'kilograms':
      return { separator: 'none', singular: 'kg' };
    case 'ml':
    case 'milliliter':
    case 'milliliters':
      return { separator: 'none', singular: 'ml' };
    case 'l':
    case 'liter':
    case 'liters':
      return { separator: 'none', singular: 'l' };
    case 'cup':
    case 'cups':
      return { plural: 'cups', singular: 'cup' };
    case 'clove':
    case 'cloves':
      return { plural: 'cloves', singular: 'clove' };
    case 'pinch':
    case 'pinches':
      return { plural: 'pinches', singular: 'pinch' };
    case 'lb':
    case 'lbs':
    case 'pound':
    case 'pounds':
      return { plural: 'lbs', singular: 'lb' };
    case 'oz':
    case 'ounce':
    case 'ounces':
      return { separator: 'none', singular: 'oz' };
    default: {
      const singular = normalizedUnitLabel.endsWith('s')
        ? normalizedUnitLabel.slice(0, -1)
        : normalizedUnitLabel;
      const plural =
        singular !== normalizedUnitLabel ? normalizedUnitLabel : undefined;

      return singular ? { plural, singular } : undefined;
    }
  }
}

function normalizeAmountNote(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalizedNote = normalizeSpacing(value).replace(/^\((.*)\)$/, '$1').trim();
  return normalizedNote || undefined;
}

function parseScalableAmountText(amountText: string) {
  const normalizedAmountText = normalizeSpacing(amountText);
  const parsedAmountMatch = normalizedAmountText.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*([a-zA-Z]+)?(?:\s+(.+))?$/
  );

  if (!parsedAmountMatch) {
    return null;
  }

  const quantity = parseAmountQuantity(parsedAmountMatch[1]);

  if (quantity === null) {
    return null;
  }

  const rawUnitLabel = parsedAmountMatch[2];
  const rawTailLabel = parsedAmountMatch[3];
  const note = normalizeAmountNote(rawTailLabel);
  const parsedUnit = parseIngredientUnitLabel(rawUnitLabel);
  const unit = parsedUnit ?? { singular: 'x' };
  const finalNote = parsedUnit ? note : normalizeAmountNote(
    [rawUnitLabel, rawTailLabel].filter(Boolean).join(' ')
  );

  return {
    note: finalNote,
    quantity,
    type: 'scalable',
    unit
  } satisfies Extract<Ingredient['amount'], { type: 'scalable' }>;
}

export function createIngredientAmountFromText(amountText: string): Ingredient['amount'] {
  const normalizedAmountText = normalizeSpacing(amountText);
  const parsedScalableAmount = parseScalableAmountText(normalizedAmountText);

  if (parsedScalableAmount) {
    return parsedScalableAmount;
  }

  return {
    text: normalizedAmountText,
    type: 'fixed'
  };
}

function normalizeIngredientAmount(value: unknown): Ingredient['amount'] | null {
  if (!isRecordLike(value) || value.type !== 'fixed' && value.type !== 'scalable') {
    return null;
  }

  if (value.type === 'fixed') {
    if (!isNonEmptyString(value.text)) {
      return null;
    }

    return createIngredientAmountFromText(value.text);
  }

  if (typeof value.quantity !== 'number' || !Number.isFinite(value.quantity) || value.quantity <= 0) {
    return null;
  }

  const note = isNonEmptyString(value.note) ? normalizeSpacing(value.note) : undefined;

  return {
    note,
    quantity: value.quantity,
    type: 'scalable',
    unit: normalizeIngredientUnit(value.unit)
  };
}

function normalizeIngredients(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Ingredient[];
  }

  const seenIngredientIds = new Set<string>();

  return value.flatMap((entry, ingredientIndex) => {
    if (!isRecordLike(entry) || !isNonEmptyString(entry.name)) {
      return [];
    }

    const normalizedAmount = normalizeIngredientAmount(entry.amount);

    if (!normalizedAmount) {
      return [];
    }

    const fallbackId = `ingredient-${ingredientIndex + 1}`;
    const normalizedId = ensureUniqueId(
      normalizeOptionalId(entry.id) || fallbackId,
      seenIngredientIds
    );

    return [
      {
        amount: normalizedAmount,
        id: normalizedId,
        name: normalizeStoredIngredientName(entry.name)
      } satisfies Ingredient
    ];
  });
}

function normalizeMethodSectionSteps(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.flatMap((step) => {
    if (!isNonEmptyString(step)) {
      return [];
    }

    return [step.trim()];
  });
}

function normalizeMethodSections(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as MethodSection[];
  }

  const seenSectionIds = new Set<string>();

  return value.flatMap((entry, sectionIndex) => {
    if (!isRecordLike(entry)) {
      return [];
    }

    const normalizedTitle = isNonEmptyString(entry.title)
      ? normalizeSpacing(entry.title)
      : '';
    const normalizedSteps = normalizeMethodSectionSteps(entry.steps);

    if (!normalizedTitle || !normalizedSteps.length) {
      return [];
    }

    const fallbackId = `section-${sectionIndex + 1}`;
    const normalizedId = ensureUniqueId(
      normalizeOptionalId(entry.id) || fallbackId,
      seenSectionIds
    );

    return [
      {
        id: normalizedId,
        steps: normalizedSteps,
        title: normalizedTitle
      } satisfies MethodSection
    ];
  });
}

function normalizeNutrition(value: unknown) {
  if (!isRecordLike(value) || !isRecordLike(value.values)) {
    return undefined;
  }
  const nutritionValues = value.values;

  if (
    typeof value.sourceServings !== 'number' ||
    !Number.isFinite(value.sourceServings) ||
    value.sourceServings <= 0
  ) {
    return undefined;
  }

  const normalizedValues = Object.fromEntries(
    RECIPE_NUTRITION_VALUE_KEYS.map((key) => {
      const nutritionValue = nutritionValues[key];
      const normalizedValue =
        typeof nutritionValue === 'number' && Number.isFinite(nutritionValue) && nutritionValue >= 0
          ? nutritionValue
          : null;
      return [key, normalizedValue];
    })
  ) as Record<keyof RecipeNutrition['values'], number | null>;
  const hasAllNutritionValues = RECIPE_NUTRITION_VALUE_KEYS.every(
    (key) => normalizedValues[key] !== null
  );

  if (!hasAllNutritionValues) {
    return undefined;
  }

  return {
    sourceServings: value.sourceServings,
    values: normalizedValues as RecipeNutrition['values']
  } satisfies RecipeNutrition;
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  const seenTags = new Set<string>();

  return value.flatMap((tag) => {
    if (!isNonEmptyString(tag)) {
      return [];
    }

    const normalizedTag = normalizeSpacing(tag).toLowerCase();

    if (!normalizedTag || seenTags.has(normalizedTag)) {
      return [];
    }

    seenTags.add(normalizedTag);
    return [normalizedTag];
  });
}

function normalizeRecipeRating(value: unknown) {
  return isValidRecipeRating(value) ? value : undefined;
}

export function normalizeCustomRecipe(value: unknown): Recipe | null {
  if (!isRecordLike(value)) {
    return null;
  }

  const normalizedId = normalizeOptionalId(value.id);
  const normalizedTitle = isNonEmptyString(value.title) ? normalizeSpacing(value.title) : '';
  const normalizedTotalTime = isNonEmptyString(value.totalTime)
    ? normalizeSpacing(value.totalTime)
    : '';
  const normalizedDefaultServings =
    typeof value.defaultServings === 'number' &&
    Number.isSafeInteger(value.defaultServings) &&
    value.defaultServings > 0
      ? value.defaultServings
      : null;
  const normalizedIngredients = normalizeIngredients(value.ingredients);
  const normalizedSections = normalizeMethodSections(value.sections);
  const normalizedTags = normalizeTags(value.tags);

  if (
    !normalizedId ||
    !normalizedTitle ||
    !normalizedTotalTime ||
    !normalizedDefaultServings ||
    !normalizedIngredients.length ||
    !normalizedSections.length
  ) {
    return null;
  }

  const isVegan = Boolean(value.isVegan) || normalizedTags.includes('vegan');
  const isVegetarian =
    isVegan || Boolean(value.isVegetarian) || normalizedTags.includes('vegetarian');

  return {
    defaultServings: normalizedDefaultServings,
    id: normalizedId,
    ingredients: normalizedIngredients,
    isVegan,
    isVegetarian,
    nutrition: normalizeNutrition(value.nutrition),
    rating: normalizeRecipeRating(value.rating),
    sections: normalizedSections,
    tags: normalizedTags,
    title: normalizedTitle,
    totalTime: normalizedTotalTime
  };
}

export function normalizeCustomRecipes(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Recipe[];
  }

  const seenRecipeIds = new Set<string>();

  return value.flatMap((recipe) => {
    const normalizedRecipe = normalizeCustomRecipe(recipe);

    if (!normalizedRecipe || seenRecipeIds.has(normalizedRecipe.id)) {
      return [];
    }

    seenRecipeIds.add(normalizedRecipe.id);
    return [normalizedRecipe];
  });
}

export const normalizeRecipe = normalizeCustomRecipe;
export const normalizeRecipes = normalizeCustomRecipes;

export function createRecipeIdFromTitle(title: string) {
  const normalizedSlug = toIdSlug(title);
  return normalizedSlug || 'custom-recipe';
}

export function createUniqueRecipeId(title: string, recipeIds: Iterable<string>) {
  const existingRecipeIds = new Set(recipeIds);
  const baseRecipeId = createRecipeIdFromTitle(title);

  if (!existingRecipeIds.has(baseRecipeId)) {
    return baseRecipeId;
  }

  let candidateRecipeId = baseRecipeId;
  let duplicateCount = 2;

  while (existingRecipeIds.has(candidateRecipeId)) {
    candidateRecipeId = `${baseRecipeId}-${duplicateCount}`;
    duplicateCount += 1;
  }

  return candidateRecipeId;
}
