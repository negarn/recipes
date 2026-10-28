import type { Recipe } from '../types/recipe';
import {
  expandIngredientAliasCandidates,
  getCanonicalIngredientName,
  normalizeIngredientWhitespace
} from './ingredientText';

export type RecipeConsistencyIssue = {
  code: 'name-convention' | 'spelling' | 'duplicate-ingredient';
  field: 'ingredients' | 'prep' | 'cook';
  lineIndex: number;
  start: number;
  end: number;
  excerpt: string;
  message: string;
  replacement?: string;
};

export type RecipeConsistencyCheck = {
  issues: RecipeConsistencyIssue[];
};

type CatalogSpellingConvention = {
  alternatives: string[];
  replacement?: string;
};

const ingredientSpellingFamilies = [
  [['chili', 'chilies'], ['chilli', 'chillies']],
  [['yogurt', 'yogurts'], ['yoghurt', 'yoghurts']]
];

const ingredientVocabulary = `artichoke asparagus aubergine avocado basil bean beef beetroot blueberry
  broccoli bulgur butter cabbage carrot cauliflower cheddar cheese chicken chickpea chili chilli cilantro
  cinnamon coconut coriander corn courgette couscous cranberry cream cucumber cumin egg eggplant
  feta flour garlic ginger lentil lemon lettuce lime milk mushroom mustard oil olive onion oregano
  orzo paprika parmesan parsley parsnip pasta pepper potato quinoa radish raspberry rice rosemary
  saffron salmon salt sesame shallot spinach stock strawberry sugar thyme tofu tomato turmeric
  turnip vanilla vinegar yogurt yoghurt zucchini boneless skinless`;

// Correct cooking words can resemble ingredient names (e.g. "taste" and "paste").
const cookingVocabulary = `about after again before below between bring brown brush buttered
  carefully centre chopped chopping clove cloves coated coating colour coloured cover covered
  covering crush crushed cutting diced dicing divide divided dividing drain drained draining
  drizzle drizzled evenly extra finely finish flavour flavours gently golden grate grated grating
  grill grilled grilling ground halve halved halving heated heating larger later layer layers
  leave leaves little lower medium mince minced minutes mixed mixing needed package paper
  peeled peeling pieces place placed plates powder preheat prepare prepared quarter quarters
  ready reduce reduced reducing remain remaining remove removed removing repeat reserve shallow
  reserved return roast roasted roasting sauce saute serve served serving simmer simmering
  sliced slices slicing small smaller smooth soften softened spoon spread sprinkle squeeze
  steam steamed steaming stick sticks stock store stored strain strained surface table taste
  tender thick thicken thickened thickening thickens thicker thin thinner through together topped topping transfer trays until upper
  warmed warming water whisk whisked whole without`;

const commonIngredientWords = getIngredientWords(words(ingredientVocabulary));
const cookingWords = words(cookingVocabulary);

function words(value: string): string[] {
  return value.toLowerCase().match(/[\p{L}]+/gu) ?? [];
}

function isOneEditApart(left: string, right: string): boolean {
  if (left === right || Math.abs(left.length - right.length) > 1) {
    return false;
  }
  let index = 0;
  while (index < Math.min(left.length, right.length) && left[index] === right[index]) {
    index += 1;
  }
  if (left.length === right.length) {
    return left.slice(index + 1) === right.slice(index + 1) || (
      left[index] === right[index + 1] && left[index + 1] === right[index] &&
      left.slice(index + 2) === right.slice(index + 2)
    );
  }
  if (left.length > right.length) {
    return left.slice(index + 1) === right.slice(index);
  }
  return left.slice(index) === right.slice(index + 1);
}

function matchCase(replacement: string, original: string): string {
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function getIngredientWords(names: string[]): Set<string> {
  const vocabulary = new Set<string>();
  for (const name of names) {
    const primaryName = name.split(/[,(/]/)[0];
    for (const word of words(primaryName)) {
      for (const variant of expandIngredientAliasCandidates([word])) {
        vocabulary.add(variant);
      }
    }
  }
  return vocabulary;
}

function getConsistentIngredientName(name: string): string | undefined {
  const canonicalName = getCanonicalIngredientName(name);
  if (!canonicalName) {
    return undefined;
  }
  // These existing shopping-list aliases also change valid spelling variants.
  // Leave those labels alone instead of recommending one spelling over another.
  const changesSpellingVariant = (
    /\bchill(?:i|ies)\b/i.test(name) && /\bchil(?:i|ies)\b/i.test(canonicalName)
  ) || (
    /\byoghurts?\b/i.test(name) && /\byogurts?\b/i.test(canonicalName)
  );
  return changesSpellingVariant ? undefined : canonicalName;
}

function getCatalogSpellingConventions(names: string[]): Map<string, CatalogSpellingConvention> {
  const catalogWords = new Set(names.flatMap(words));
  const conventions = new Map<string, CatalogSpellingConvention>();
  for (const family of ingredientSpellingFamilies) {
    const usedSpellings = family.filter((spelling) => spelling.some((word) => catalogWords.has(word)));
    if (!usedSpellings.length) {
      continue;
    }
    for (const spelling of family) {
      spelling.forEach((word, formIndex) => {
        const alternatives = usedSpellings.map((usedSpelling) => usedSpelling[formIndex]);
        if (alternatives.length > 1) {
          conventions.set(word, { alternatives });
        } else if (word !== alternatives[0]) {
          conventions.set(word, { alternatives, replacement: alternatives[0] });
        }
      });
    }
  }
  return conventions;
}

function checkWords(
  text: string,
  location: Pick<RecipeConsistencyIssue, 'field' | 'lineIndex'>,
  targets: Set<string>,
  knownWords: Set<string>,
  spellingConventions: Map<string, CatalogSpellingConvention>
): RecipeConsistencyIssue[] {
  const issues: RecipeConsistencyIssue[] = [];
  const spellingTargets = location.field === 'ingredients'
    ? [...targets].filter((candidate) => candidate.length >= 5) : [];
  // IDs and amounts are structural. Check visible token labels while preserving their offsets.
  const visibleText = text.replace(/{{([^{}]*)}}/g, (token, body: string) => {
    const parts = body.split('|');
    const hiddenParts = parts[0].trim() === 'fixed' ? 1 : 2;
    const hiddenLength = 2 + parts.slice(0, hiddenParts).join('|').length + 1;
    return ' '.repeat(Math.min(hiddenLength, token.length)) + token.slice(hiddenLength);
  });
  for (const match of visibleText.matchAll(/[\p{L}]+/gu)) {
    const excerpt = match[0];
    const word = excerpt.toLowerCase();
    const convention = spellingConventions.get(word);
    if (convention) {
      const replacement = convention.replacement ? matchCase(convention.replacement, excerpt) : undefined;
      issues.push({
        ...location, code: 'name-convention', start: match.index, end: match.index + excerpt.length,
        excerpt, replacement,
        message: replacement
          ? `Other recipes use “${replacement}”. Review this spelling difference for consistency.`
          : `Other recipes mix ${convention.alternatives.map((alternative) => `“${alternative}”`).join(' and ')}. Choose a consistent spelling.`
      });
      continue;
    }
    if (location.field !== 'ingredients' || word.length < 5 || knownWords.has(word)) {
      continue;
    }
    let replacement: string | undefined;
    const code = 'spelling';
    const candidates = spellingTargets.filter((candidate) => isOneEditApart(word, candidate));
    if (candidates.length === 1) {
      replacement = candidates[0];
    } else if (candidates.length > 1) {
      issues.push({
        ...location, code, start: match.index, end: match.index + excerpt.length, excerpt,
        message: `Possible spelling mistake: check “${excerpt}” against ${candidates.map((candidate) => `“${candidate}”`).join(' or ')}.`
      });
    }
    if (!replacement) {
      continue;
    }
    replacement = matchCase(replacement, excerpt);
    issues.push({
      ...location, code, start: match.index, end: match.index + excerpt.length, excerpt, replacement,
      message: `Possible spelling mistake: did you mean “${replacement}”?`
    });
  }
  return issues;
}

export function checkRecipeConsistency(recipe: Recipe, catalog: Recipe[] = []): RecipeConsistencyCheck {
  const issues: RecipeConsistencyIssue[] = [];
  const catalogNames = catalog.filter((other) => other.id !== recipe.id)
    .flatMap((other) => other.ingredients.map((ingredient) => ingredient.name));
  const catalogWords = getIngredientWords(catalogNames);
  const spellingConventions = getCatalogSpellingConventions(catalogNames);
  const ingredientTargets = new Set([...commonIngredientWords, ...catalogWords]);
  const knownIngredientWords = new Set([...ingredientTargets, ...cookingWords]);
  const seenNames = new Map<string, number>();

  recipe.ingredients.forEach((ingredient, lineIndex) => {
    const nameKey = normalizeIngredientWhitespace(ingredient.name).toLowerCase();
    const canonicalName = getConsistentIngredientName(ingredient.name);
    const duplicateName = normalizeIngredientWhitespace(
      getCanonicalIngredientName(ingredient.name) ?? ingredient.name
    ).toLowerCase();
    const previousLine = seenNames.get(duplicateName);
    const location = { field: 'ingredients' as const, lineIndex };
    // Do not treat a misspelled ingredient as its own spelling reference.
    const wordIssues = checkWords(ingredient.name, location, ingredientTargets, knownIngredientWords, spellingConventions);
    const nameSuggestion = wordIssues.some((issue) => issue.code === 'name-convention')
      ? undefined : canonicalName;
    if (nameSuggestion && nameSuggestion.toLowerCase() !== nameKey) {
      issues.push({
        ...location, code: 'name-convention', start: 0, end: ingredient.name.length,
        excerpt: ingredient.name, replacement: nameSuggestion,
        message: `Use “${nameSuggestion}” to match the established ingredient name.`
      });
    } else {
      issues.push(...wordIssues);
    }
    if (previousLine !== undefined) {
      issues.push({
        ...location, code: 'duplicate-ingredient', start: 0, end: ingredient.name.length,
        excerpt: ingredient.name,
        message: `This ingredient is also listed on line ${previousLine + 1}. Combine the amounts or clarify the different uses if needed.`
      });
    } else {
      seenNames.set(duplicateName, lineIndex);
    }
  });

  for (const section of recipe.sections) {
    if (section.id !== 'prep' && section.id !== 'cook') {
      continue;
    }
    const field = section.id;
    section.steps.forEach((step, lineIndex) => {
      issues.push(...checkWords(step, { field, lineIndex }, ingredientTargets, knownIngredientWords, spellingConventions));
    });
  }
  return { issues };
}

export function replaceConsistencyIssueText(
  text: string,
  issue: RecipeConsistencyIssue
): string {
  if (!issue.replacement || text.slice(issue.start, issue.end) !== issue.excerpt) {
    return text;
  }
  return text.slice(0, issue.start) + issue.replacement + text.slice(issue.end);
}
