import type { IngredientUnit } from '../types/recipe';

const ingredientAliasPrefixWords = new Set([
  'fresh',
  'ground',
  'dried',
  'mild',
  'smoked',
  'unsalted',
  'salted',
  'plain',
  'tinned',
  'canned',
  'frozen',
  'raw',
  'greek',
  'heavy',
  'double',
  'jarred',
  'ready-rolled',
  'microwave',
  'loose'
]);

const canonicalIngredientNameByLowercase: Record<string, string> = {
  'beef mince': 'Beef mince',
  'chicken thighs, bonelss, skinless': 'Chicken thighs, boneless, skinless',
  'cilantro': 'Cilantro',
  'creme fraiche': 'Creme fraiche',
  'crème fraîche': 'Creme fraiche',
  'double / heavy cream': 'Heavy cream',
  'cheddar cheese': 'Cheddar',
  'fresh cilantro': 'Cilantro',
  'green chili': 'Green chilli',
  'green chillies': 'Green chilli',
  'green chilli': 'Green chilli',
  'greek yogurt': 'Greek yoghurt',
  'greek yoghurt': 'Greek yoghurt',
  'heavy cream': 'Heavy cream',
  'lemon': 'Lemon',
  'lemons': 'Lemon',
  'lime': 'Lime',
  'limes': 'Lime',
  'mild chili powder': 'Mild chilli powder',
  'mild chilli powder': 'Mild chilli powder',
  'minced beef': 'Beef mince',
  'red bell pepper': 'Red bell pepper',
  'red bell peppers': 'Red bell pepper',
  'red onion': 'Red onion',
  'red onions': 'Red onion',
  'red wine': 'Red wine',
  'red wine (substitute: 175 ml water or stock + 1 tsp red wine vinegar)': 'Red wine',
  'small flour tortilla': 'Small flour tortilla',
  'small flour tortillas': 'Small flour tortilla',
  'feta cheese': 'Feta',
  'vegetable stock cube': 'Vegetable stock cube',
  'vegetable stock cubes': 'Vegetable stock cube',
  'yellow onion': 'Yellow onion',
  'yellow onions': 'Yellow onion',
  'zucchini': 'Zucchini',
  'zucchinis': 'Zucchini'
};

const singularIngredientWordOverrides: Record<string, string> = {
  chillies: 'chilli',
  leaves: 'leaf',
  lettuces: 'lettuce',
  naans: 'naan',
  potatoes: 'potato',
  tomatoes: 'tomato'
};

const pluralIngredientWordOverrides: Record<string, string> = {
  chilli: 'chillies',
  leaf: 'leaves',
  lettuce: 'lettuces',
  naan: 'naans',
  potato: 'potatoes',
  tomato: 'tomatoes'
};

export function normalizeIngredientWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function singularizeIngredientWord(word: string) {
  const normalizedWord = word.toLowerCase();

  if (singularIngredientWordOverrides[normalizedWord]) {
    return singularIngredientWordOverrides[normalizedWord];
  }

  if (normalizedWord.endsWith('ies') && normalizedWord.length > 3) {
    return `${normalizedWord.slice(0, -3)}y`;
  }

  if (normalizedWord.endsWith('oes') && normalizedWord.length > 3) {
    return normalizedWord.slice(0, -2);
  }

  if (normalizedWord.endsWith('s') && !normalizedWord.endsWith('ss')) {
    return normalizedWord.slice(0, -1);
  }

  return normalizedWord;
}

function pluralizeIngredientWord(word: string) {
  const normalizedWord = word.toLowerCase();

  if (pluralIngredientWordOverrides[normalizedWord]) {
    return pluralIngredientWordOverrides[normalizedWord];
  }

  if (
    normalizedWord.endsWith('s') ||
    normalizedWord.endsWith('x') ||
    normalizedWord.endsWith('z') ||
    normalizedWord.endsWith('ch') ||
    normalizedWord.endsWith('sh')
  ) {
    return `${normalizedWord}es`;
  }

  if (/[^aeiou]y$/i.test(normalizedWord)) {
    return `${normalizedWord.slice(0, -1)}ies`;
  }

  return `${normalizedWord}s`;
}

function singularizeIngredientSegment(segment: string) {
  const normalizedSegment = normalizeIngredientWhitespace(segment).toLowerCase();

  if (!normalizedSegment) {
    return normalizedSegment;
  }

  const words = normalizedSegment.split(' ');
  words[words.length - 1] = singularizeIngredientWord(words[words.length - 1]);

  return words.join(' ');
}

function normalizeSingularIngredientName(name: string) {
  const [base, ...rest] = normalizeIngredientWhitespace(name).split(',');
  const singularBase = base
    .split('/')
    .map((segment) => singularizeIngredientSegment(segment))
    .join(' / ');

  if (!rest.length) {
    return singularBase;
  }

  return [
    singularBase,
    ...rest.map((segment) => normalizeIngredientWhitespace(segment).toLowerCase())
  ].join(', ');
}

function formatIngredientNameCase(name: string) {
  const normalizedName = normalizeSingularIngredientName(name);

  if (!normalizedName) {
    return normalizedName;
  }

  return normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1).toLowerCase();
}

export function normalizeIngredientName(name: string, unit?: IngredientUnit) {
  const normalizedName = normalizeIngredientWhitespace(name).toLowerCase();
  const canonicalName = canonicalIngredientNameByLowercase[normalizedName] ?? name;
  const formattedName = formatIngredientNameCase(canonicalName);

  if (formattedName === 'Rice' && unit?.singular === 'cup') {
    return 'Cooked rice';
  }

  return formattedName;
}

export function singularizeIngredientPhrase(phrase: string) {
  return singularizeIngredientSegment(phrase);
}

export function pluralizeIngredientPhrase(phrase: string) {
  const phraseWords = normalizeIngredientWhitespace(phrase).toLowerCase().split(/\s+/);

  if (!phraseWords.length) {
    return normalizeIngredientWhitespace(phrase).toLowerCase();
  }

  phraseWords[phraseWords.length - 1] = pluralizeIngredientWord(
    phraseWords[phraseWords.length - 1]
  );

  return phraseWords.join(' ');
}

export function getIngredientAliasCandidates(ingredientName: string) {
  const normalizedIngredientName = normalizeIngredientWhitespace(ingredientName).toLowerCase();
  const primaryIngredientName = normalizedIngredientName.split(',')[0].trim();
  const ingredientNameWords = normalizedIngredientName.split(/\s+/);
  const primaryIngredientNameWords = primaryIngredientName
    ? primaryIngredientName.split(/\s+/)
    : [];
  const ingredientAliasCandidates: string[] = [];

  function addIngredientAliasCandidate(candidate: string) {
    const normalizedCandidate = normalizeIngredientWhitespace(candidate).toLowerCase();

    if (!normalizedCandidate || ingredientAliasCandidates.includes(normalizedCandidate)) {
      return;
    }

    ingredientAliasCandidates.push(normalizedCandidate);
  }

  addIngredientAliasCandidate(normalizedIngredientName);
  addIngredientAliasCandidate(primaryIngredientName);

  if (ingredientNameWords.length > 1) {
    addIngredientAliasCandidate(
      ingredientNameWords.slice(Math.max(ingredientNameWords.length - 2, 0)).join(' ')
    );
  }
  if (primaryIngredientNameWords.length > 1) {
    addIngredientAliasCandidate(
      primaryIngredientNameWords
        .slice(Math.max(primaryIngredientNameWords.length - 2, 0))
        .join(' ')
    );
  }

  addIngredientAliasCandidate(ingredientNameWords[ingredientNameWords.length - 1]);
  if (primaryIngredientNameWords.length) {
    addIngredientAliasCandidate(
      primaryIngredientNameWords[primaryIngredientNameWords.length - 1]
    );
  }

  let strippedIngredientNameWords = [...ingredientNameWords];

  while (
    strippedIngredientNameWords.length > 1 &&
    ingredientAliasPrefixWords.has(strippedIngredientNameWords[0])
  ) {
    strippedIngredientNameWords = strippedIngredientNameWords.slice(1);

    addIngredientAliasCandidate(strippedIngredientNameWords.join(' '));

    if (strippedIngredientNameWords.length > 1) {
      addIngredientAliasCandidate(
        strippedIngredientNameWords
          .slice(Math.max(strippedIngredientNameWords.length - 2, 0))
          .join(' ')
      );
    }

    addIngredientAliasCandidate(
      strippedIngredientNameWords[strippedIngredientNameWords.length - 1]
    );
  }

  return ingredientAliasCandidates;
}

export function expandIngredientAliasCandidates(ingredientAliases: string[]) {
  const expandedIngredientAliases = new Set<string>();

  ingredientAliases.forEach((ingredientAlias) => {
    const singularIngredientAlias = singularizeIngredientPhrase(ingredientAlias);
    expandedIngredientAliases.add(ingredientAlias);
    expandedIngredientAliases.add(singularIngredientAlias);
    expandedIngredientAliases.add(pluralizeIngredientPhrase(singularIngredientAlias));
  });

  return [...expandedIngredientAliases]
    .filter(Boolean)
    .sort((leftAlias, rightAlias) => rightAlias.length - leftAlias.length);
}

export function getIngredientMatchCandidates(
  ingredientName: string,
  unit?: IngredientUnit
) {
  return expandIngredientAliasCandidates(
    getIngredientAliasCandidates(normalizeIngredientName(ingredientName, unit))
  );
}
