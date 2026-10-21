import type { Ingredient, Recipe } from '../types/recipe';
import {
  expandIngredientAliasCandidates,
  getIngredientAliasCandidates,
  pluralizeIngredientPhrase,
  singularizeIngredientPhrase
} from './ingredientText';
import { inspectMethodStepText, parseQuantityLabel, renderMethodStepText } from './recipeDisplay';
import { formatQuantityWithUnit } from './quantityFormatting';
import { RECIPE_METHOD_MARKUP_PATTERN } from './recipeMethodTokens';

export type RecipeScalingIssue = {
  code: 'invalid-link' | 'unchanged-quantity' | 'missing-quantity' | 'amount-mismatch';
  severity: 'error' | 'warning';
  sectionId: string;
  sectionTitle: string;
  stepIndex: number;
  start: number;
  end: number;
  excerpt: string;
  message: string;
  baseText: string;
  scaledText: string;
  scalableText?: string;
};

export type RecipeScalingCheck = {
  issues: RecipeScalingIssue[];
  servingCounts: number[];
  checkedSteps: number;
};

const QUANTITY_PATTERN = /\d+\s*(?:&|and)\s*\d+\/\d+|\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]/g;
const YIELD_PATTERN = /^\s+((?:[a-z-]+\s+){0,3}(?:meatballs?|balls?|burgers?|bowls?|patties|patty))\b/i;
const NON_AMOUNT_PATTERN = /^\s*(?:°|degrees?\b|[cf]\b|minutes?\b|mins?\b|seconds?\b|secs?\b|hours?\b|hrs?\b|cm\b|mm\b|inches?\b|%|pinch(?:es)?\b|times?\b|[–-]\s*\d)/i;
const ACTION_WORD_PATTERN = /\b(?:and|then|for|until|into|with|cook|add|serve|divide|chop|heat|stir|fry|bake|slice|cut|reserve|peel|grate|drain|wash)\b/i;
const PACKAGE_PATTERN = /^\s*x?\s*(\d+(?:\.\d+)?)\s*(g|kg|ml|l)\s+(?:cans?|tins?|pouches?|packets?|jars?)\s+(?:of\s+)?/i;
const AMOUNT_UNIT_PATTERN = /\b(kg|kilograms?|g|grams?|ml|l|litres?|liters?|tbsp|tablespoons?|tsp|teaspoons?|cups?|cloves?|heads?|cans?|tins?|pouches?|packets?|jars?|x)\b/i;
const METHOD_ACTION_PATTERN = /\b(peel|chop|dice|slice|grate|wash|rinse|measure|reserve|de-stem|de-seed|trim|crush|juice|zest|add|mix|stir|pour|use|combine|heat|fry|cook|blend|blitz|toss|tip|drizzle|crumble|garnish|squeeze|whisk)\b/gi;
const PREPARATION_ACTIONS = new Set([
  'peel', 'chop', 'dice', 'slice', 'grate', 'wash', 'rinse', 'measure', 'reserve',
  'de-stem', 'de-seed', 'trim', 'crush', 'juice', 'zest'
]);

type IngredientAlias = { text: string; ingredient: Ingredient };
type IngredientMatch = { ingredient: Ingredient; start: number; end: number };
type LiteralIssue = Pick<RecipeScalingIssue, 'start' | 'end' | 'message' | 'scalableText'>;
type MethodQuantity = {
  start: number;
  end: number;
  quantityLabel: string;
  unitLabel?: string;
  ingredient?: Ingredient;
  yieldNoun?: string;
  packageQuantityLabel?: string;
  packageUnitLabel?: string;
};

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAliases(recipe: Recipe): IngredientAlias[] {
  return recipe.ingredients.flatMap((ingredient) => {
    const name = ingredient.name.replace(/\([^)]*\)/g, '').trim();
    const nameWithoutUnit = name.replace(/\s+(?:cloves?|cans?|tins?|pouches?|packets?|jars?|heads?)$/i, '');
    const aliases = expandIngredientAliasCandidates([
      ...getIngredientAliasCandidates(name),
      ...getIngredientAliasCandidates(nameWithoutUnit)
    ]);
    return aliases.map((text) => ({ text: text.toLowerCase(), ingredient }));
  });
}

function differsByOneLetter(left: string, right: string): boolean {
  if (left === right || Math.abs(left.length - right.length) > 1) {
    return false;
  }

  let leftIndex = 0;
  let rightIndex = 0;
  let differences = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    differences += 1;
    if (differences > 1) {
      return false;
    }
    if (left.length >= right.length) {
      leftIndex += 1;
    }
    if (right.length >= left.length) {
      rightIndex += 1;
    }
  }
  return differences + Number(leftIndex < left.length || rightIndex < right.length) === 1;
}

function isAmountDescriptor(value: string): boolean {
  return (
    !ACTION_WORD_PATTERN.test(value) &&
    /^[\s\p{L}-]*$/u.test(value) &&
    value.trim().split(/\s+/).length <= 8
  );
}

function findIngredient(tail: string, aliases: IngredientAlias[], allowSpellingMatches = true): IngredientMatch | undefined {
  const matches: Array<IngredientMatch & { start: number; length: number }> = [];
  for (const alias of aliases) {
    const match = new RegExp(`\\b${escapePattern(alias.text)}\\b`, 'i').exec(tail);
    if (match && isAmountDescriptor(tail.slice(0, match.index))) {
      matches.push({
        ingredient: alias.ingredient,
        start: match.index,
        end: match.index + match[0].length,
        length: match[0].length
      });
    }
  }

  // A close spelling match is only a warning; never change an ingredient name automatically.
  if (!matches.length && allowSpellingMatches) {
    for (const word of tail.matchAll(/[a-z-]+/gi)) {
      if (!isAmountDescriptor(tail.slice(0, word.index))) {
        break;
      }
      const wordText = word[0].toLowerCase();
      for (const alias of aliases) {
        if (
          alias.text.length >= 5 &&
          !alias.text.includes(' ') &&
          differsByOneLetter(wordText, alias.text)
        ) {
          matches.push({
            ingredient: alias.ingredient,
            start: word.index,
            end: word.index + word[0].length,
            length: word[0].length
          });
        }
      }
    }
  }

  matches.sort((left, right) => left.start - right.start || right.length - left.length);
  const best = matches[0];
  if (!best) {
    return undefined;
  }
  const ambiguous = matches.some((match) =>
    match.start === best.start &&
    match.length === best.length &&
    match.ingredient.id !== best.ingredient.id
  );
  return ambiguous ? undefined : best;
}

function getLiteralStep(step: string): string {
  return step.replace(RECIPE_METHOD_MARKUP_PATTERN, (match) => ' '.repeat(match.length));
}

function getMethodQuantities(
  step: string,
  aliases: IngredientAlias[],
  allowSpellingMatches = true
): MethodQuantity[] {
  const literalStep = getLiteralStep(step);
  const quantities: MethodQuantity[] = [];
  let lastEnd = 0;

  for (const quantityMatch of literalStep.matchAll(QUANTITY_PATTERN)) {
    const start = quantityMatch.index;
    if (start < lastEnd || /[\d./]/.test(literalStep[start - 1] ?? '')) {
      continue;
    }
    const tailStart = start + quantityMatch[0].length;
    const remainingStep = literalStep.slice(tailStart);
    const packageMatch = PACKAGE_PATTERN.exec(remainingStep);
    const packageLength = packageMatch?.[0].length ?? 0;
    const tail = remainingStep.slice(packageLength).split(/[.,;:!?\n\d{}]/)[0].slice(0, 100);
    if (NON_AMOUNT_PATTERN.test(literalStep.slice(tailStart)) || /^\s+of\s+(?:the|this|that)\b/i.test(tail)) {
      continue;
    }
    if (/[\/¼½¾⅓⅔⅛⅜⅝⅞]/.test(quantityMatch[0]) && /^\s+of\s+/i.test(tail)) {
      continue;
    }
    const yieldMatch = YIELD_PATTERN.exec(tail);
    const ingredientMatch = findIngredient(tail, aliases, allowSpellingMatches);
    if (!yieldMatch && ingredientMatch?.ingredient.amount.type === 'fixed') {
      continue;
    }
    const candidateLength = yieldMatch?.[0].length ?? ingredientMatch?.end;
    if (!candidateLength) {
      continue;
    }
    let end = tailStart + packageLength + candidateLength;
    const ingredientAmount = ingredientMatch?.ingredient.amount;
    if (ingredientAmount?.type === 'scalable' && ingredientAmount.unit) {
      const unit = ingredientAmount.unit;
      const trailingUnit = new RegExp(
        `^\\s+(?:${escapePattern(unit.singular)}|${escapePattern(unit.plural ?? unit.singular)})\\b`,
        'i'
      ).exec(literalStep.slice(end));
      end += trailingUnit?.[0].length ?? 0;
    }
    const followingText = literalStep.slice(end, end + 55);
    if (/^\s*(?:each\b|per\b|on(?:to)?\s+each\b|in(?:to)?\s+each\b)/i.test(followingText)) {
      continue;
    }
    const descriptor = ingredientMatch ? tail.slice(0, ingredientMatch.start) : '';
    quantities.push({
      start,
      end,
      quantityLabel: quantityMatch[0],
      unitLabel: AMOUNT_UNIT_PATTERN.exec(descriptor)?.[1],
      ingredient: ingredientMatch?.ingredient,
      yieldNoun: yieldMatch?.[1],
      packageQuantityLabel: packageMatch?.[1],
      packageUnitLabel: packageMatch?.[2]
    });
    lastEnd = end;
  }
  return quantities;
}

function getUnchangedQuantities(
  step: string,
  recipe: Recipe,
  servingCounts: number[],
  aliases: IngredientAlias[]
): LiteralIssue[] {
  const issues: LiteralIssue[] = [];
  for (const candidate of getMethodQuantities(step, aliases)) {
    const { start, end, quantityLabel, yieldNoun } = candidate;
    // Include any glued verb ("chop75g") so the renderer sees the same word boundary.
    const prefix = step.slice(0, start).match(/[a-z]+$/i)?.[0] ?? '';
    const fragment = step.slice(start - prefix.length, end);
    const base = renderMethodStepText(fragment, recipe, recipe.defaultServings);
    const changes = servingCounts.some(
      (servings) => renderMethodStepText(fragment, recipe, servings) !== base
    );
    if (changes) {
      continue;
    }

    let scalableText: string | undefined;
    if (yieldNoun && /^\d+(?:\.\d+)?$/.test(quantityLabel)) {
      const singularNoun = singularizeIngredientPhrase(yieldNoun);
      const pluralNoun = pluralizeIngredientPhrase(singularNoun);
      scalableText = `{{amount|${quantityLabel}|${singularNoun}|${pluralNoun}}}`;
    }
    issues.push({
      start,
      end,
      scalableText,
      message: yieldNoun
        ? 'This number of portions stays unchanged. Scale the count or keep it fixed if it is intentional.'
        : 'This ingredient amount stays unchanged. Check spelling, the quantity, and its unit, or keep it fixed if it is intentional.'
    });
  }
  return issues;
}

function getMissingQuantities(step: string, aliases: IngredientAlias[]): LiteralIssue[] {
  const issues: LiteralIssue[] = [];
  const literalStep = getLiteralStep(step);
  for (const match of literalStep.matchAll(/\b(?:cloves|tablespoons|teaspoons|tbsp|tsp|grams|cups)\s+of\s+/gi)) {
    const before = step.slice(0, match.index).trimEnd();
    const precedingAmount = before.match(/(?:[\d¼½¾⅓⅔⅛⅜⅝⅞]|}}|\b(?:a|one|two|three|few|some|couple\s+of))(?:\s+[a-z-]+){0,4}$/i);
    if (precedingAmount && !ACTION_WORD_PATTERN.test(precedingAmount[0])) {
      continue;
    }
    const tailStart = match.index + match[0].length;
    const tail = literalStep.slice(tailStart).split(/[.,;:!?\n\d{}]/)[0].slice(0, 80);
    const ingredient = findIngredient(tail, aliases);
    if (ingredient?.ingredient.amount.type === 'scalable') {
      issues.push({
        start: match.index,
        end: tailStart + ingredient.end,
        message: 'This ingredient appears to be missing a quantity. Enter the amount used in this step.'
      });
    }
  }
  return issues;
}

type ComparableQuantity = { quantity: number; family: string; factor: number };
type IngredientUse = {
  ingredient: Ingredient;
  quantity: number;
  preparation: boolean;
  partial: boolean;
  remaining: boolean;
  issue: Omit<RecipeScalingIssue, 'code' | 'severity' | 'message'>;
};
type SourceRange = Pick<RecipeScalingIssue, 'start' | 'end'>;

function getComparableQuantity(quantity: number, unit = 'x'): ComparableQuantity | undefined {
  switch (unit.trim().toLowerCase()) {
    case 'g': case 'gram': case 'grams':
      return { quantity, family: 'weight', factor: 1 };
    case 'kg': case 'kilogram': case 'kilograms':
      return { quantity: quantity * 1000, family: 'weight', factor: 1000 };
    case 'ml':
      return { quantity, family: 'volume', factor: 1 };
    case 'l': case 'litre': case 'litres': case 'liter': case 'liters':
      return { quantity: quantity * 1000, family: 'volume', factor: 1000 };
    case 'tsp': case 'teaspoon': case 'teaspoons':
      return { quantity, family: 'spoon', factor: 1 };
    case 'tbsp': case 'tablespoon': case 'tablespoons':
      return { quantity: quantity * 3, family: 'spoon', factor: 3 };
    case 'cup': case 'cups':
      return { quantity, family: 'cup', factor: 1 };
    case 'x': case 'clove': case 'cloves': case 'head': case 'heads':
    case 'can': case 'cans': case 'tin': case 'tins': case 'pouch': case 'pouches':
    case 'packet': case 'packets': case 'jar': case 'jars':
      return { quantity, family: 'count', factor: 1 };
    default:
      return undefined;
  }
}

function getComparableMethodQuantity(candidate: MethodQuantity): ComparableQuantity | undefined {
  const quantity = parseQuantityLabel(candidate.quantityLabel);
  const amount = candidate.ingredient?.amount;
  if (quantity === null || amount?.type !== 'scalable') {
    return undefined;
  }
  if (candidate.packageQuantityLabel && candidate.packageUnitLabel) {
    const packageQuantity = parseQuantityLabel(candidate.packageQuantityLabel);
    return packageQuantity === null
      ? undefined
      : getComparableQuantity(quantity * packageQuantity, candidate.packageUnitLabel);
  }
  if (candidate.unitLabel) {
    return getComparableQuantity(quantity, candidate.unitLabel);
  }
  const listedUnit = getComparableQuantity(1, amount.unit?.singular);
  // A bare count can describe an onion or garlic clove, but cannot imply grams or teaspoons.
  return listedUnit?.family === 'count' ? getComparableQuantity(quantity) : undefined;
}

function renderQuantityCheckStep(step: string, recipe: Recipe): {
  text: string;
  getSourceRange: (start: number, end: number) => SourceRange;
} {
  const pieces: Array<{ start: number; end: number; sourceStart: number; sourceEnd: number; token: boolean }> = [];
  let text = '';
  let sourceOffset = 0;

  function append(value: string, sourceStart: number, sourceEnd: number, token: boolean) {
    pieces.push({ start: text.length, end: text.length + value.length, sourceStart, sourceEnd, token });
    text += value;
  }

  for (const match of step.matchAll(RECIPE_METHOD_MARKUP_PATTERN)) {
    append(step.slice(sourceOffset, match.index), sourceOffset, match.index, false);
    const inspection = inspectMethodStepText(match[0], recipe, recipe.defaultServings);
    const tokenType = match[0].slice(2, -2).split('|')[0].trim();
    const excluded = tokenType === 'fixed' || inspection.issues.length > 0;
    append(excluded ? ' '.repeat(match[0].length) : inspection.text, match.index, match.index + match[0].length, true);
    sourceOffset = match.index + match[0].length;
  }
  append(step.slice(sourceOffset), sourceOffset, step.length, false);

  function getSourceRange(start: number, end: number): SourceRange {
    const first = pieces.find((piece) => piece.start <= start && piece.end > start)!;
    const last = pieces.find((piece) => piece.start < end && piece.end >= end)!;
    return {
      start: first.token ? first.sourceStart : first.sourceStart + start - first.start,
      end: last.token ? last.sourceEnd : last.sourceStart + end - last.start
    };
  }
  return { text, getSourceRange };
}

function isPreparationAmount(text: string, start: number): boolean {
  const actions = [...text.slice(0, start).matchAll(METHOD_ACTION_PATTERN)];
  const lastAction = actions[actions.length - 1];
  if (!lastAction || !PREPARATION_ACTIONS.has(lastAction[1].toLowerCase())) {
    return false;
  }
  const afterAction = text.slice(lastAction.index + lastAction[0].length, start);
  return !/^\s+(?:in|into|over)\b/i.test(afterAction);
}

function getAmountMismatches(recipe: Recipe, aliases: IngredientAlias[]): RecipeScalingIssue[] {
  const usesByIngredient = new Map<string, IngredientUse[]>();
  const incompleteIngredients = new Set<string>();
  const incompletePreparationIngredients = new Set<string>();

  for (const section of recipe.sections) {
    section.steps.forEach((step, stepIndex) => {
      const rendered = renderQuantityCheckStep(step, recipe);
      const candidates = getMethodQuantities(rendered.text, aliases, false);
      const tokens = [...step.matchAll(/{{(.*?)}}/g)]
        .map((match) => ({
          start: match.index,
          parts: match[1].split('|').map((part) => part.trim())
        }));
      for (const alias of aliases) {
        const matches = rendered.text.matchAll(new RegExp(`\\b${escapePattern(alias.text)}\\b`, 'gi'));
        for (const match of matches) {
          if (!candidates.some((candidate) => candidate.ingredient?.id === alias.ingredient.id && candidate.start <= match.index && candidate.end >= match.index + match[0].length)) {
            incompleteIngredients.add(alias.ingredient.id);
            if (isPreparationAmount(rendered.text, match.index)) {
              incompletePreparationIngredients.add(alias.ingredient.id);
            }
          }
        }
        for (const { start, parts: [type, value] } of tokens) {
          const isPartialLink = type === 'ingredient-portion' && value === alias.ingredient.id;
          const isFixedMention = type === 'fixed' && new RegExp(`\\b${escapePattern(alias.text)}\\b`, 'i').test(value);
          if (isPartialLink || isFixedMention) {
            incompleteIngredients.add(alias.ingredient.id);
            if (isPreparationAmount(step, start)) {
              incompletePreparationIngredients.add(alias.ingredient.id);
            }
          }
        }
      }
      for (const candidate of candidates) {
        const ingredient = candidate.ingredient;
        if (!ingredient || ingredient.amount.type !== 'scalable') {
          continue;
        }
        const listed = getComparableQuantity(ingredient.amount.quantity, ingredient.amount.unit?.singular);
        const measured = getComparableMethodQuantity(candidate);
        if (!listed || !measured || listed.family !== measured.family) {
          incompleteIngredients.add(ingredient.id);
          if (isPreparationAmount(rendered.text, candidate.start)) {
            incompletePreparationIngredients.add(ingredient.id);
          }
          continue;
        }
        const range = rendered.getSourceRange(candidate.start, candidate.end);
        const use: IngredientUse = {
          ingredient,
          quantity: measured.quantity,
          preparation: isPreparationAmount(rendered.text, candidate.start),
          partial: measured.family === 'count' && candidate.quantityLabel.includes('/'),
          remaining: /\bremaining\s*$/i.test(rendered.text.slice(0, candidate.start)) ||
            /\bremaining\b/i.test(rendered.text.slice(candidate.start, candidate.end)),
          issue: {
            sectionId: section.id, sectionTitle: section.title, stepIndex,
            ...range, excerpt: step.slice(range.start, range.end),
            baseText: renderMethodStepText(step, recipe, recipe.defaultServings),
            scaledText: renderMethodStepText(step, recipe, recipe.defaultServings * 2)
          }
        };
        const uses = usesByIngredient.get(ingredient.id) ?? [];
        uses.push(use);
        usesByIngredient.set(ingredient.id, uses);
      }
    });
  }

  const issues: RecipeScalingIssue[] = [];
  for (const uses of usesByIngredient.values()) {
    const ingredient = uses[0].ingredient;
    if (ingredient.amount.type !== 'scalable') {
      continue;
    }
    const listed = getComparableQuantity(ingredient.amount.quantity, ingredient.amount.unit?.singular)!;
    // Stored amounts can be rounded to tenths while steps retain hundredths.
    const tolerance = Math.max(0.051 * listed.factor, listed.quantity * 0.001);
    const excessiveUse = uses.find((use) => use.quantity > listed.quantity + tolerance);
    const preparationUses = uses.filter((use) => use.preparation);
    const singlePreparation = preparationUses.length === 1 ? preparationUses[0] : undefined;
    const consumptionUses = uses.filter((use) => !use.preparation);
    const consumedQuantity = consumptionUses.reduce((sum, use) => sum + use.quantity, 0);
    const combinedMatchesList = singlePreparation !== undefined &&
      Math.abs(singlePreparation.quantity + consumedQuantity - listed.quantity) <= tolerance;
    // A smaller prepared portion can be separate from a quantified remainder.
    const preparationIsSplit = Boolean(singlePreparation && !singlePreparation.partial &&
      singlePreparation.quantity < listed.quantity - tolerance &&
      (combinedMatchesList || consumptionUses.some((use) => use.remaining)));
    // If cooking repeats the prepared amount before using the remainder, count it only once.
    const includePreparation = preparationIsSplit &&
      (combinedMatchesList || consumptionUses.every((use) => use.remaining));
    // An unquantified portion or garnish does not explain a mismatched preparation amount.
    const preparationMismatch = singlePreparation && !singlePreparation.partial && !preparationIsSplit &&
      !incompletePreparationIngredients.has(ingredient.id) &&
      Math.abs(singlePreparation.quantity - listed.quantity) > tolerance
      ? singlePreparation
      : undefined;
    const comparableUses = consumptionUses.length && !includePreparation ? consumptionUses : uses;
    const total = comparableUses.reduce((sum, use) => sum + use.quantity, 0);
    const difference = total - listed.quantity;
    const canCheckTotal = difference > tolerance || includePreparation || (
      !incompleteIngredients.has(ingredient.id) && !comparableUses.some((use) => use.partial)
    );
    if (!excessiveUse && !preparationMismatch && (!canCheckTotal || Math.abs(difference) <= tolerance)) {
      continue;
    }
    // Prep amounts describe ingredients later used again; compare a single prep amount,
    // rather than treating repeated preparation instructions as additional consumption.
    if (!excessiveUse && !consumptionUses.length && uses.length > 1) {
      continue;
    }
    const affectedUse = excessiveUse ?? preparationMismatch ?? comparableUses[0];
    const listedLabel = formatQuantityWithUnit(ingredient.amount.quantity, ingredient.amount.unit, { hideCountUnit: true });
    const checkedQuantity = comparableUses.includes(affectedUse) ? total : affectedUse.quantity;
    const checkedLabel = formatQuantityWithUnit(checkedQuantity / listed.factor, ingredient.amount.unit, { hideCountUnit: true });
    const subject = comparableUses.length > 1 && comparableUses.includes(affectedUse)
      ? 'The prep and cook amounts total'
      : 'This step specifies';
    issues.push({
      ...affectedUse.issue, code: 'amount-mismatch', severity: 'warning',
      message: `${subject} ${checkedLabel} of ${ingredient.name}, but the ingredient list has ${listedLabel}.`
    });
  }
  return issues;
}

export function checkRecipeScaling(recipe: Recipe): RecipeScalingCheck {
  const servingCounts = [...new Set([Math.max(1, recipe.defaultServings - 1), recipe.defaultServings * 2])]
    .filter((servings) => servings !== recipe.defaultServings);
  const aliases = getAliases(recipe);
  const issues: RecipeScalingIssue[] = [];
  let checkedSteps = 0;

  for (const section of recipe.sections) {
    section.steps.forEach((step, stepIndex) => {
      checkedSteps += 1;
      const inspection = inspectMethodStepText(step, recipe, recipe.defaultServings);
      const baseText = inspection.text;
      const scaledText = renderMethodStepText(step, recipe, recipe.defaultServings * 2);
      const location = { sectionId: section.id, sectionTitle: section.title, stepIndex, baseText, scaledText };
      for (const issue of inspection.issues) {
        issues.push({
          ...location, ...issue, excerpt: step.slice(issue.start, issue.end),
          code: 'invalid-link', severity: 'error'
        });
      }
      function isAlreadyReported(issue: LiteralIssue): boolean {
        return issues.some((existing) =>
          existing.sectionId === section.id &&
          existing.stepIndex === stepIndex &&
          existing.start <= issue.start && existing.end >= issue.end
        );
      }
      for (const issue of getUnchangedQuantities(step, recipe, servingCounts, aliases)) {
        if (!isAlreadyReported(issue)) {
          issues.push({
            ...location, ...issue, excerpt: step.slice(issue.start, issue.end),
            code: 'unchanged-quantity', severity: 'warning'
          });
        }
      }
      for (const issue of getMissingQuantities(step, aliases)) {
        if (!isAlreadyReported(issue)) {
          issues.push({
            ...location, ...issue, excerpt: step.slice(issue.start, issue.end),
            code: 'missing-quantity', severity: 'warning'
          });
        }
      }
    });
  }
  for (const mismatch of getAmountMismatches(recipe, aliases)) {
    const alreadyReported = issues.some((issue) =>
      issue.sectionId === mismatch.sectionId && issue.stepIndex === mismatch.stepIndex &&
      issue.start <= mismatch.start && issue.end >= mismatch.end
    );
    if (!alreadyReported) {
      issues.push(mismatch);
    }
  }
  return { issues, servingCounts, checkedSteps };
}

export function replaceScalingIssueText(step: string, issue: RecipeScalingIssue, replacement: string): string {
  if (step.slice(issue.start, issue.end) !== issue.excerpt) {
    return step;
  }
  return step.slice(0, issue.start) + replacement + step.slice(issue.end);
}

export function getMethodStepDraftRange(draft: string, stepIndex: number): { start: number; end: number } | undefined {
  let offset = 0;
  let currentStepIndex = 0;
  for (const line of draft.split('\n')) {
    const trimmed = line.trim();
    if (trimmed) {
      if (currentStepIndex === stepIndex) {
        const start = offset + line.indexOf(trimmed);
        return { start, end: start + trimmed.length };
      }
      currentStepIndex += 1;
    }
    offset += line.length + 1;
  }
  return undefined;
}
