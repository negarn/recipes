import { getIngredientMatchCandidates } from './ingredientText';
import type { IngredientUnit } from '../types/recipe';

export type ShoppingListCategoryId =
  | 'fruit-veg'
  | 'meat-seafood'
  | 'dairy-eggs'
  | 'bakery'
  | 'grains'
  | 'pantry'
  | 'herbs-spices'
  | 'frozen'
  | 'other';

export const shoppingListCategoryOrder: ShoppingListCategoryId[] = [
  'fruit-veg',
  'meat-seafood',
  'dairy-eggs',
  'bakery',
  'grains',
  'pantry',
  'herbs-spices',
  'frozen',
  'other'
];

export const shoppingListCategoryLabels: Record<ShoppingListCategoryId, string> = {
  bakery: 'Bakery',
  'dairy-eggs': 'Dairy & Eggs',
  'fruit-veg': 'Fruit & Veg',
  frozen: 'Frozen',
  grains: 'Rice, Pasta & Grains',
  'herbs-spices': 'Herbs & Spices',
  'meat-seafood': 'Meat & Seafood',
  other: 'Other',
  pantry: 'Tins, Jars & Packets'
};

const shoppingListCategoryMatchers: Array<{
  categoryId: ShoppingListCategoryId;
  keywords: string[];
}> = [
  // Ordered from most specific to most general so ambiguous ingredient names
  // are resolved by a single precedence list.
  {
    categoryId: 'grains',
    keywords: ['pasta/rice/puff pastry', 'puff pastry']
  },
  {
    categoryId: 'pantry',
    keywords: ['beef broth', 'beef stock cube', 'chicken stock cube', 'tinned corn']
  },
  {
    categoryId: 'fruit-veg',
    keywords: [
      'bell pepper',
      'bean sprout',
      'cilantro',
      'fresh basil',
      'fresh chive',
      'fresh cilantro',
      'fresh coriander',
      'fresh dill',
      'fresh mint',
      'fresh oregano',
      'fresh parsley',
      'fresh rosemary',
      'fresh sage',
      'fresh thyme',
      'green bean'
    ]
  },
  {
    categoryId: 'meat-seafood',
    keywords: [
      'anchov',
      'bacon',
      'beef',
      'chicken',
      'chorizo',
      'cod',
      'drumstick',
      'fish',
      'ham',
      'lamb',
      'mince',
      'pork',
      'prawn',
      'salmon',
      'sausage',
      'seafood',
      'shrimp',
      'steak',
      'thigh',
      'tuna',
      'turkey'
    ]
  },
  {
    categoryId: 'dairy-eggs',
    keywords: [
      'blue cheese',
      'brie',
      'butter',
      'cheddar',
      'cheese',
      'cream',
      'creme fraiche',
      'egg',
      'feta',
      'halloumi',
      'mascarpone',
      'milk',
      'mozzarella',
      'paneer',
      'parmesan',
      'ricotta',
      'sour cream',
      'yoghurt',
      'yogurt'
    ]
  },
  {
    categoryId: 'bakery',
    keywords: [
      'bagel',
      'bread',
      'breadcrumbs',
      'brioche',
      'bun',
      'flatbread',
      'naan',
      'pastry',
      'pita',
      'pitta',
      'roll',
      'tortilla',
      'wrap'
    ]
  },
  {
    categoryId: 'grains',
    keywords: [
      'barley',
      'basmati',
      'bulgur',
      'couscous',
      'flour',
      'grain',
      'linguine',
      'macaroni',
      'noodle',
      'oat',
      'orzo',
      'pasta',
      'penne',
      'quinoa',
      'rice',
      'spaghetti'
    ]
  },
  {
    categoryId: 'frozen',
    keywords: ['frozen']
  },
  {
    categoryId: 'herbs-spices',
    keywords: [
      'allspice',
      'basil',
      'bay',
      'cardamom',
      'cayenne',
      'chilli flake',
      'chili flake',
      'chilli powder',
      'chili powder',
      'chive',
      'cinnamon',
      'coriander',
      'cumin',
      'curry powder',
      'dill',
      'fennel seed',
      'garlic powder',
      'garam masala',
      'mint',
      'nutmeg',
      'oregano',
      'paprika',
      'parsley',
      'black pepper',
      'ground pepper',
      'white pepper',
      'rosemary',
      'sage',
      'salt',
      'seasoning',
      'sesame seed',
      'spice',
      'thyme',
      'turmeric'
    ]
  },
  {
    categoryId: 'pantry',
    keywords: [
      'almond flake',
      'bean',
      'broth',
      'caper',
      'chickpea',
      'dried apricot',
      'chopped tomato',
      'coconut milk',
      'cornflour',
      'honey',
      'hot sauce',
      'jam',
      'ketchup',
      'lentil',
      'maple syrup',
      'mayonnaise',
      'mayo',
      'mustard',
      'oil',
      'olive',
      'passata',
      'paste',
      'peanut butter',
      'pickle',
      'red wine',
      'puree',
      'soy sauce',
      'stock',
      'sugar',
      'syrup',
      'tahini',
      'walnut',
      'white wine',
      'worcestershire sauce',
      'tomato sauce',
      'tinned tomato',
      'tomatoes can',
      'vinegar'
    ]
  },
  {
    categoryId: 'fruit-veg',
    keywords: [
      'apple',
      'asparagus',
      'aubergine',
      'eggplant',
      'avocado',
      'banana',
      'beet',
      'bok choy',
      'broccoli',
      'cabbage',
      'carrot',
      'cauliflower',
      'celery',
      'chilli',
      'chili',
      'courgette',
      'cucumber',
      'fruit',
      'garlic',
      'ginger',
      'grape',
      'green onion',
      'herb',
      'jalapeno',
      'kale',
      'leek',
      'lemon',
      'lettuce',
      'lime',
      'mango',
      'mushroom',
      'onion',
      'orange',
      'pak choi',
      'pea',
      'pepper',
      'pineapple',
      'potato',
      'pumpkin',
      'salad',
      'savoy',
      'shallot',
      'spinach',
      'spring onion',
      'squash',
      'sweet potato',
      'tomato',
      'vegetable',
      'zucchini'
    ]
  }
];

type ShoppingListKeywordMatcher = (candidate: string) => boolean;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createShoppingListKeywordMatcher(keyword: string): ShoppingListKeywordMatcher {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return () => false;
  }

  if (normalizedKeyword.includes('/')) {
    return (candidate) => candidate.includes(normalizedKeyword);
  }

  const keywordParts = normalizedKeyword.split(/\s+/);
  const isWordPhrase = keywordParts.every((part) => /^[a-z]+$/.test(part));

  if (!isWordPhrase) {
    return (candidate) => candidate.includes(normalizedKeyword);
  }

  const lastKeywordPart = keywordParts[keywordParts.length - 1];
  const trailingKeywordPattern =
    lastKeywordPart.length >= 4
      ? `${escapeRegExp(lastKeywordPart)}\\w*`
      : escapeRegExp(lastKeywordPart);
  const leadingKeywordPattern = keywordParts
    .slice(0, -1)
    .map(escapeRegExp)
    .join('\\s+');
  const phrasePattern = leadingKeywordPattern
    ? `${leadingKeywordPattern}\\s+${trailingKeywordPattern}`
    : trailingKeywordPattern;
  const keywordRegex = new RegExp(`\\b${phrasePattern}\\b`);

  return (candidate) => keywordRegex.test(candidate);
}

const compiledShoppingListCategoryMatchers = shoppingListCategoryMatchers.map(
  ({ categoryId, keywords }) => ({
    categoryId,
    keywordMatchers: keywords.map(createShoppingListKeywordMatcher)
  })
);

export function getShoppingListCategoryId(
  ingredientName: string,
  unit?: IngredientUnit
): ShoppingListCategoryId {
  const matchCandidates = getIngredientMatchCandidates(ingredientName, unit).map((candidate) =>
    candidate.toLowerCase()
  );

  for (const { categoryId, keywordMatchers } of compiledShoppingListCategoryMatchers) {
    if (
      keywordMatchers.some((matchesKeyword) =>
        matchCandidates.some((candidate) => matchesKeyword(candidate))
      )
    ) {
      return categoryId;
    }
  }

  return 'other';
}
