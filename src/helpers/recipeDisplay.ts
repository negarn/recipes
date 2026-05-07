import type { Ingredient, IngredientUnit, Recipe } from '../types/recipe';
import {
  expandIngredientAliasCandidates,
  getIngredientAliasCandidates,
  pluralizeIngredientPhrase,
  singularizeIngredientPhrase
} from './ingredientText';
import {
  formatQuantity,
  getUnitLabel,
  formatQuantityWithUnit,
  scaleQuantity
} from './quantityFormatting';

const RECIPE_METHOD_TOKEN_PATTERN = /{{(.*?)}}/g;
const LITERAL_CONTAINER_PATTERN = '(?:tin|tins|pouch|pouches|packet|packets|can|cans|jar|jars)';
const LITERAL_QUANTITY_PATTERN =
  '(?:\\d+\\s*(?:&|and)\\s*\\d+\\/\\d+|\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?)';
const LITERAL_COUNT_DESCRIPTOR_WORD_PATTERN = '(?!(?:a|an|of)\\b)[a-z-]+';
const MAX_LITERAL_COUNT_DESCRIPTOR_WORDS = 5;
const LITERAL_COUNT_DESCRIPTOR_SEQUENCE_PATTERN =
  `(?:${LITERAL_COUNT_DESCRIPTOR_WORD_PATTERN}\\s+){0,${MAX_LITERAL_COUNT_DESCRIPTOR_WORDS}}`;
const LITERAL_CONTAINER_UNIT_PATTERN =
  '(?:can(?:s)?|tin(?:s)?|pouch(?:es)?|packet(?:s)?|jar(?:s)?)';
const LITERAL_MEASUREMENT_PATTERN = new RegExp(
  `\\b(${LITERAL_QUANTITY_PATTERN})\\s*(kg|kilograms?|g|grams?|ml|l|tbsp|tablespoons?|tsp|teaspoons?|cups?|cloves?|${LITERAL_CONTAINER_UNIT_PATTERN})\\b(?!\\s*${LITERAL_CONTAINER_PATTERN}\\b)`,
  'gi'
);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseQuantityLabel(quantityLabel: string) {
  function parseFraction(numeratorLabel: string, denominatorLabel: string) {
    const numerator = Number(numeratorLabel);
    const denominator = Number(denominatorLabel);

    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      denominator <= 0
    ) {
      return null;
    }

    const fraction = numerator / denominator;
    return Number.isFinite(fraction) ? fraction : null;
  }

  function parseMixedFractionQuantity(
    wholeNumberLabel: string,
    numeratorLabel: string,
    denominatorLabel: string
  ) {
    const fraction = parseFraction(numeratorLabel, denominatorLabel);
    const wholeNumber = Number(wholeNumberLabel);

    return fraction === null || !Number.isFinite(wholeNumber)
      ? null
      : wholeNumber + fraction;
  }

  const normalizedQuantityLabel = quantityLabel.trim();
  const ampersandMixedFractionMatch = normalizedQuantityLabel.match(
    /^(\d+)\s*(?:&|and)\s*(\d+)\/(\d+)$/
  );

  if (ampersandMixedFractionMatch) {
    const [, wholeNumberLabel, numeratorLabel, denominatorLabel] = ampersandMixedFractionMatch;

    return parseMixedFractionQuantity(wholeNumberLabel, numeratorLabel, denominatorLabel);
  }

  const mixedFractionMatch = normalizedQuantityLabel.match(/^(\d+)\s+(\d+)\/(\d+)$/);

  if (mixedFractionMatch) {
    const [, wholeNumberLabel, numeratorLabel, denominatorLabel] = mixedFractionMatch;

    return parseMixedFractionQuantity(wholeNumberLabel, numeratorLabel, denominatorLabel);
  }

  const fractionMatch = normalizedQuantityLabel.match(/^(\d+)\/(\d+)$/);

  if (fractionMatch) {
    const [, numeratorLabel, denominatorLabel] = fractionMatch;
    return parseFraction(numeratorLabel, denominatorLabel);
  }

  const parsedQuantity = Number(normalizedQuantityLabel);

  return Number.isFinite(parsedQuantity) ? parsedQuantity : null;
}

function formatScaledAmount(
  quantity: number,
  unit: IngredientUnit | undefined,
  servingCount: number,
  defaultServings: number,
  {
    hideCountUnit = false
  }: {
    hideCountUnit?: boolean;
  } = {}
) {
  const scaledQuantity = scaleQuantity(quantity, servingCount, defaultServings);

  return formatQuantityWithUnit(scaledQuantity, unit, { hideCountUnit });
}

export function formatIngredientAmount(
  ingredient: Ingredient,
  servingCount: number,
  defaultServings: number
) {
  if (ingredient.amount.type === 'fixed') {
    return ingredient.amount.text;
  }

  const amountLabel = formatScaledAmount(
    ingredient.amount.quantity,
    ingredient.amount.unit,
    servingCount,
    defaultServings
  );

  return ingredient.amount.note
    ? `${amountLabel} (${ingredient.amount.note})`
    : amountLabel;
}

function formatInlineIngredientAmount(
  ingredient: Ingredient,
  servingCount: number,
  defaultServings: number,
  nounSingular?: string,
  nounPlural?: string
) {
  if (ingredient.amount.type === 'fixed') {
    return ingredient.amount.text;
  }

  const scaledQuantity = scaleQuantity(
    ingredient.amount.quantity,
    servingCount,
    defaultServings
  );

  if (nounSingular) {
    const quantityLabel = formatQuantity(scaledQuantity);
    const nounLabel =
      scaledQuantity === 1 ? nounSingular : nounPlural ?? nounSingular;
    return `${quantityLabel} ${nounLabel}`;
  }

  return formatScaledAmount(
    ingredient.amount.quantity,
    ingredient.amount.unit,
    servingCount,
    defaultServings,
    { hideCountUnit: true }
  );
}

function formatIngredientPortionAmount(
  ingredient: Ingredient,
  portionLabel: string,
  servingCount: number,
  defaultServings: number
) {
  if (ingredient.amount.type === 'fixed') {
    return ingredient.amount.text;
  }

  const portionQuantity = parseQuantityLabel(portionLabel);

  if (portionQuantity === null) {
    return null;
  }

  return formatScaledAmount(
    ingredient.amount.quantity * portionQuantity,
    ingredient.amount.unit,
    servingCount,
    defaultServings,
    { hideCountUnit: true }
  );
}

function getRecipeIngredientAliases(recipe: Recipe) {
  const ingredientAliasCandidatesById = new Map<string, string[]>();
  const ingredientAliasUsageCounts = new Map<string, number>();

  recipe.ingredients.forEach((ingredient) => {
    const ingredientAliasCandidates = getIngredientAliasCandidates(ingredient.name);
    ingredientAliasCandidatesById.set(ingredient.id, ingredientAliasCandidates);

    ingredientAliasCandidates.slice(1).forEach((ingredientAliasCandidate) => {
      ingredientAliasUsageCounts.set(
        ingredientAliasCandidate,
        (ingredientAliasUsageCounts.get(ingredientAliasCandidate) ?? 0) + 1
      );
    });
  });

  const ingredientAliasesById = new Map<string, string[]>();

  recipe.ingredients.forEach((ingredient) => {
    const ingredientAliasCandidates =
      ingredientAliasCandidatesById.get(ingredient.id) ?? [];

    ingredientAliasesById.set(
      ingredient.id,
      ingredientAliasCandidates.filter(
        (ingredientAliasCandidate, ingredientAliasIndex) =>
          ingredientAliasIndex === 0 ||
          (ingredientAliasUsageCounts.get(ingredientAliasCandidate) ?? 0) === 1
      )
    );
  });

  return ingredientAliasesById;
}

function forEachExpandedIngredientAlias(
  ingredientAliasesById: Map<string, string[]>,
  ingredientId: string,
  callback: (ingredientAlias: string) => void
) {
  const ingredientAliases = ingredientAliasesById.get(ingredientId) ?? [];
  expandIngredientAliasCandidates(ingredientAliases).forEach(callback);
}

function replaceStepIngredientAliases({
  ingredientAliasesById,
  recipe,
  replaceAlias,
  shouldIncludeIngredient,
  step
}: {
  ingredientAliasesById: Map<string, string[]>;
  recipe: Recipe;
  replaceAlias: (args: {
    ingredient: Ingredient;
    ingredientAlias: string;
    step: string;
  }) => string;
  shouldIncludeIngredient: (ingredient: Ingredient) => boolean;
  step: string;
}) {
  let nextStep = step;

  recipe.ingredients.forEach((ingredient) => {
    if (!shouldIncludeIngredient(ingredient)) {
      return;
    }

    forEachExpandedIngredientAlias(
      ingredientAliasesById,
      ingredient.id,
      (ingredientAlias) => {
        nextStep = replaceAlias({
          ingredient,
          ingredientAlias,
          step: nextStep
        });
      }
    );
  });

  return nextStep;
}

function isWeightOrVolumeUnit(unit: IngredientUnit | undefined) {
  return (
    unit?.singular === 'g' ||
    unit?.singular === 'kg' ||
    unit?.singular === 'ml' ||
    unit?.singular === 'l'
  );
}

function normalizeWeightOrVolumeQuantity(quantity: number, unitLabel: string) {
  const normalizedUnitLabel = unitLabel.toLowerCase();

  if (normalizedUnitLabel === 'kg' || normalizedUnitLabel === 'l') {
    return quantity * 1000;
  }

  return quantity;
}

function getLiteralMeasurementUnitDefinition(unitLabel: string): IngredientUnit | undefined {
  switch (unitLabel.toLowerCase()) {
    case 'kg':
    case 'kilogram':
    case 'kilograms':
      return { singular: 'kg', separator: 'none' };
    case 'g':
    case 'gram':
    case 'grams':
      return { singular: 'g', separator: 'none' };
    case 'l':
      return { singular: 'l', separator: 'none' };
    case 'ml':
      return { singular: 'ml', separator: 'none' };
    case 'tbsp':
      return { singular: 'tbsp' };
    case 'tablespoon':
      return { singular: 'tablespoon', plural: 'tablespoons' };
    case 'tablespoons':
      return { singular: 'tablespoon', plural: 'tablespoons' };
    case 'tsp':
      return { singular: 'tsp' };
    case 'teaspoon':
      return { singular: 'teaspoon', plural: 'teaspoons' };
    case 'teaspoons':
      return { singular: 'teaspoon', plural: 'teaspoons' };
    case 'cup':
      return { singular: 'cup', plural: 'cups' };
    case 'cups':
      return { singular: 'cup', plural: 'cups' };
    case 'clove':
      return { singular: 'clove', plural: 'cloves' };
    case 'cloves':
      return { singular: 'clove', plural: 'cloves' };
    case 'can':
      return { singular: 'can', plural: 'cans' };
    case 'cans':
      return { singular: 'can', plural: 'cans' };
    case 'tin':
      return { singular: 'tin', plural: 'tins' };
    case 'tins':
      return { singular: 'tin', plural: 'tins' };
    case 'pouch':
      return { singular: 'pouch', plural: 'pouches' };
    case 'pouches':
      return { singular: 'pouch', plural: 'pouches' };
    case 'packet':
      return { singular: 'packet', plural: 'packets' };
    case 'packets':
      return { singular: 'packet', plural: 'packets' };
    case 'jar':
      return { singular: 'jar', plural: 'jars' };
    case 'jars':
      return { singular: 'jar', plural: 'jars' };
    default:
      return undefined;
  }
}

function createMethodTextPlaceholder(value: string, placeholderValues: string[]) {
  const placeholderKey = `__RECIPE_METHOD_PLACEHOLDER_${placeholderValues.length}__`;
  placeholderValues.push(value);
  return placeholderKey;
}

function restoreMethodTextPlaceholders(text: string, placeholderValues: string[]) {
  let restoredText = text;

  placeholderValues.forEach((placeholderValue, placeholderIndex) => {
    const placeholderKey = `__RECIPE_METHOD_PLACEHOLDER_${placeholderIndex}__`;
    restoredText = restoredText.split(placeholderKey).join(placeholderValue);
  });

  return restoredText;
}

function replaceLiteralPackagedIngredientAmounts(
  step: string,
  recipe: Recipe,
  servingCount: number,
  ingredientAliasesById: Map<string, string[]>,
  createPlaceholder: (value: string) => string
) {
  return replaceStepIngredientAliases({
    ingredientAliasesById,
    recipe,
    step,
    shouldIncludeIngredient: (ingredient) =>
      ingredient.amount.type === 'scalable' && isWeightOrVolumeUnit(ingredient.amount.unit),
    replaceAlias: ({ ingredient, ingredientAlias, step: nextStep }) => {
      if (ingredient.amount.type !== 'scalable') {
        return nextStep;
      }

      const scaledIngredientAmount = formatScaledAmount(
        ingredient.amount.quantity,
        ingredient.amount.unit,
        servingCount,
        recipe.defaultServings
      );
      const normalizedIngredientQuantity = normalizeWeightOrVolumeQuantity(
        ingredient.amount.quantity,
        ingredient.amount.unit?.singular ?? ''
      );
      const packagedAmountPattern = new RegExp(
        `\\b(${LITERAL_QUANTITY_PATTERN})\\s*x\\s*(${LITERAL_QUANTITY_PATTERN})(kg|g|ml|l)\\s+${LITERAL_CONTAINER_PATTERN}\\s+of\\s+(${escapeRegExp(
          ingredientAlias
        )})(?=\\b)`,
        'gi'
      );

      nextStep = nextStep.replace(
        packagedAmountPattern,
        (match, containerCountLabel, packageQuantityLabel, packageUnitLabel, matchedAlias) => {
          const containerCount = parseQuantityLabel(containerCountLabel);
          const packageQuantity = parseQuantityLabel(packageQuantityLabel);

          if (containerCount === null || packageQuantity === null) {
            return match;
          }

          const normalizedPackagedQuantity =
            containerCount *
            normalizeWeightOrVolumeQuantity(packageQuantity, packageUnitLabel);

          if (Math.abs(normalizedPackagedQuantity - normalizedIngredientQuantity) > 0.01) {
            return match;
          }

          return createPlaceholder(`${scaledIngredientAmount} of ${matchedAlias}`);
        }
      );
      return nextStep;
    }
  });
}

function replaceLiteralCountIngredientAmounts(
  step: string,
  recipe: Recipe,
  servingCount: number,
  ingredientAliasesById: Map<string, string[]>,
  createPlaceholder: (value: string) => string
) {
  function replaceCountAmountPattern({
    pattern,
    text
  }: {
    pattern: RegExp;
    text: string;
  }) {
    return text.replace(pattern, (match, quantityLabel, descriptorLabel, matchedAlias) => {
      const quantity = parseQuantityLabel(quantityLabel);

      if (quantity === null) {
        return match;
      }

      const normalizedAlias = singularizeIngredientPhrase(matchedAlias);
      const scaledQuantity = scaleQuantity(
        quantity,
        servingCount,
        recipe.defaultServings
      );
      const scaledAlias =
        scaledQuantity === 1
          ? normalizedAlias
          : pluralizeIngredientPhrase(normalizedAlias);
      const descriptorPrefix = descriptorLabel?.trim()
        ? `${descriptorLabel.trim()} `
        : '';

      return createPlaceholder(
        `${formatQuantity(scaledQuantity)} ${descriptorPrefix}${scaledAlias}`
      );
    });
  }

  return replaceStepIngredientAliases({
    ingredientAliasesById,
    recipe,
    step,
    shouldIncludeIngredient: (ingredient) =>
      ingredient.amount.type === 'scalable' && ingredient.amount.unit?.singular === 'x',
    replaceAlias: ({ ingredient, ingredientAlias, step: nextStep }) => {
      if (ingredient.amount.type !== 'scalable' || ingredient.amount.unit?.singular !== 'x') {
        return nextStep;
      }

      const singularIngredientAlias = singularizeIngredientPhrase(ingredientAlias);
      const pluralIngredientAlias = pluralizeIngredientPhrase(singularIngredientAlias);
      const ingredientAliasPattern = [singularIngredientAlias, pluralIngredientAlias]
        .filter(Boolean)
        .sort((leftAlias, rightAlias) => rightAlias.length - leftAlias.length)
        .map(escapeRegExp)
        .join('|');

      if (!ingredientAliasPattern) {
        return nextStep;
      }

      const directCountAmountPattern = new RegExp(
        `\\b(${LITERAL_QUANTITY_PATTERN})\\s+(${LITERAL_COUNT_DESCRIPTOR_SEQUENCE_PATTERN})(${ingredientAliasPattern})(?=\\b)`,
        'gi'
      );
      const articleCountAmountPattern = new RegExp(
        `\\b(${LITERAL_QUANTITY_PATTERN})\\s+(?:of\\s+)?(?:a|an)\\s+(${LITERAL_COUNT_DESCRIPTOR_SEQUENCE_PATTERN})(${ingredientAliasPattern})(?=\\b)`,
        'gi'
      );

      nextStep = replaceCountAmountPattern({
        pattern: directCountAmountPattern,
        text: nextStep
      });
      nextStep = replaceCountAmountPattern({
        pattern: articleCountAmountPattern,
        text: nextStep
      });
      return nextStep;
    }
  });
}

function replaceLiteralTrailingUnitIngredientAmounts(
  step: string,
  recipe: Recipe,
  servingCount: number,
  ingredientAliasesById: Map<string, string[]>,
  createPlaceholder: (value: string) => string
) {
  return replaceStepIngredientAliases({
    ingredientAliasesById,
    recipe,
    step,
    shouldIncludeIngredient: (ingredient) =>
      ingredient.amount.type === 'scalable' &&
      Boolean(ingredient.amount.unit) &&
      ingredient.amount.unit?.singular !== 'x',
    replaceAlias: ({ ingredient, ingredientAlias, step: nextStep }) => {
      if (
        ingredient.amount.type !== 'scalable' ||
        !ingredient.amount.unit ||
        ingredient.amount.unit.singular === 'x'
      ) {
        return nextStep;
      }

      const ingredientUnit = ingredient.amount.unit;
      const unitPattern = [ingredientUnit.singular, ingredientUnit.plural]
        .filter((unitLabel): unitLabel is string => Boolean(unitLabel))
        .sort((leftUnitLabel, rightUnitLabel) => rightUnitLabel.length - leftUnitLabel.length)
        .map(escapeRegExp)
        .join('|');

      if (!unitPattern) {
        return nextStep;
      }

      const trailingUnitPattern = new RegExp(
        `\\b(${LITERAL_QUANTITY_PATTERN})\\s+((?:[a-z-]+\\s+)*)(${escapeRegExp(
          ingredientAlias
        )})\\s+(${unitPattern})(?=\\b)`,
        'gi'
      );

      nextStep = nextStep.replace(
        trailingUnitPattern,
        (_match, quantityLabel, descriptorLabel, matchedAlias) => {
          const quantity = parseQuantityLabel(quantityLabel);

          if (quantity === null) {
            return _match;
          }

          const scaledQuantity = scaleQuantity(
            quantity,
            servingCount,
            recipe.defaultServings
          );
          const trimmedDescriptorLabel = descriptorLabel.trim();
          const descriptorPrefix = trimmedDescriptorLabel
            ? `${trimmedDescriptorLabel} `
            : '';

          return createPlaceholder(
            `${formatQuantity(scaledQuantity)} ${descriptorPrefix}${matchedAlias} ${getUnitLabel(
              ingredientUnit,
              scaledQuantity
            )}`
          );
        }
      );
      return nextStep;
    }
  });
}

function replaceLiteralMeasuredAmounts(
  step: string,
  recipe: Recipe,
  servingCount: number
) {
  const scaleFactor = servingCount / recipe.defaultServings;

  return step.replace(LITERAL_MEASUREMENT_PATTERN, (match, quantityLabel, unitLabel) => {
    const quantity = parseQuantityLabel(quantityLabel);

    if (quantity === null) {
      return match;
    }

    const measurementUnit = getLiteralMeasurementUnitDefinition(unitLabel);

    if (!measurementUnit) {
      return match;
    }

    return formatQuantityWithUnit(quantity * scaleFactor, measurementUnit);
  });
}

export function renderMethodStepText(
  step: string,
  recipe: Recipe,
  servingCount: number,
  defaultServingCount = recipe.defaultServings
) {
  const scaledRecipe =
    defaultServingCount === recipe.defaultServings
      ? recipe
      : { ...recipe, defaultServings: defaultServingCount };
  const placeholderValues: string[] = [];
  const ingredientAliasesById = getRecipeIngredientAliases(scaledRecipe);
  let renderedStep = step.replace(RECIPE_METHOD_TOKEN_PATTERN, (match, rawToken) => {
    const [tokenType, ...tokenParts] = rawToken
      .split('|')
      .map((part: string) => part.trim());

    if (tokenType === 'ingredient') {
      const [ingredientId, nounSingular, nounPlural] = tokenParts;
      const ingredient = scaledRecipe.ingredients.find(
        (candidateIngredient) => candidateIngredient.id === ingredientId
      );

      if (!ingredient) {
        return match;
      }

      return createMethodTextPlaceholder(
        formatInlineIngredientAmount(
          ingredient,
          servingCount,
          scaledRecipe.defaultServings,
          nounSingular,
          nounPlural
        ),
        placeholderValues
      );
    }

    if (tokenType === 'ingredient-portion') {
      // Render a fraction of the ingredient amount, such as 1/4 of the ginger.
      if (tokenParts.length !== 2) {
        return match;
      }

      const [ingredientId, portionLabel] = tokenParts;
      const ingredient = scaledRecipe.ingredients.find(
        (candidateIngredient) => candidateIngredient.id === ingredientId
      );

      if (!ingredient || !portionLabel) {
        return match;
      }

      const amountLabel = formatIngredientPortionAmount(
        ingredient,
        portionLabel,
        servingCount,
        scaledRecipe.defaultServings
      );

      if (amountLabel === null) {
        return match;
      }

      return createMethodTextPlaceholder(amountLabel, placeholderValues);
    }

    if (tokenType === 'amount') {
      const [quantityLabel, unitSingular, unitPlural, separatorLabel] = tokenParts;
      const quantity = Number(quantityLabel);

      if (!Number.isFinite(quantity)) {
        return match;
      }

      return createMethodTextPlaceholder(
        formatScaledAmount(
          quantity,
          unitSingular
            ? {
                singular: unitSingular,
                plural: unitPlural || undefined,
                separator:
                  separatorLabel === 'none' || separatorLabel === 'space'
                    ? separatorLabel
                    : undefined
              }
            : undefined,
          servingCount,
          scaledRecipe.defaultServings
        ),
        placeholderValues
      );
    }

    return match;
  });

  if (servingCount !== scaledRecipe.defaultServings) {
    const createPlaceholder = (value: string) =>
      createMethodTextPlaceholder(value, placeholderValues);

    renderedStep = replaceLiteralPackagedIngredientAmounts(
      renderedStep,
      scaledRecipe,
      servingCount,
      ingredientAliasesById,
      createPlaceholder
    );
    renderedStep = replaceLiteralCountIngredientAmounts(
      renderedStep,
      scaledRecipe,
      servingCount,
      ingredientAliasesById,
      createPlaceholder
    );
    renderedStep = replaceLiteralTrailingUnitIngredientAmounts(
      renderedStep,
      scaledRecipe,
      servingCount,
      ingredientAliasesById,
      createPlaceholder
    );
    renderedStep = replaceLiteralMeasuredAmounts(renderedStep, scaledRecipe, servingCount);
  }

  return restoreMethodTextPlaceholders(renderedStep, placeholderValues);
}
