import type { Recipe } from '../types/recipe';
import type {
  RecipeRatingMap,
  RecipeServingMap,
  RecipeSettings
} from '../types/app';
import { CHILD_RECIPE_TAG } from './recipeAudience';

const minorTitleWords = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'in',
  'nor',
  'of',
  'on',
  'or',
  'per',
  'the',
  'to',
  'via'
]);

export function formatRecipeTitle(title: string) {
  const words = title.trim().split(/\s+/);

  return words
    .map((word, index) => {
      const normalizedWord = word.toLowerCase();

      if (
        index !== 0 &&
        index !== words.length - 1 &&
        minorTitleWords.has(normalizedWord)
      ) {
        return normalizedWord;
      }

      return normalizedWord.replace(/^[a-z]/, (letter) => letter.toUpperCase());
    })
    .join(' ');
}

export function getRecipeTags(recipe: Recipe) {
  const dietaryTags = [];

  if (recipe.isVegan) {
    dietaryTags.push('vegan');
  } else if (recipe.isVegetarian) {
    dietaryTags.push('vegetarian');
  }

  return [...new Set([...dietaryTags, ...recipe.tags])]
    .filter((tag) => tag.trim().toLowerCase() !== CHILD_RECIPE_TAG);
}

function getRecipeRating(recipe: Recipe, recipeRatings: RecipeRatingMap) {
  return recipeRatings[recipe.id] ?? recipe.rating;
}

function getInitialRecipeServingCount(
  recipe: Recipe,
  recipeSettings: RecipeSettings
) {
  return recipeSettings.defaultServingSize ?? recipe.defaultServings;
}

function getRecipeServingCount(
  recipe: Recipe,
  recipeServings: RecipeServingMap,
  fallbackServingCount: number
) {
  return recipeServings[recipe.id] ?? fallbackServingCount;
}

export function getRecipeServingDetails(
  recipe: Recipe,
  recipeServings: RecipeServingMap,
  recipeSettings: RecipeSettings
) {
  const initialServingCount = getInitialRecipeServingCount(recipe, recipeSettings);

  return {
    defaultServingCount: recipe.defaultServings,
    servingCount: getRecipeServingCount(recipe, recipeServings, initialServingCount)
  };
}

export function applyRecipeRating(recipe: Recipe, recipeRatings: RecipeRatingMap) {
  const rating = getRecipeRating(recipe, recipeRatings);

  return rating === recipe.rating ? recipe : { ...recipe, rating };
}

export function recipeMatchesSearch(recipe: Recipe, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const searchableText = [recipe.title, ...recipe.ingredients.map(({ name }) => name)]
    .join(' ')
    .toLowerCase();

  return normalizedQuery
    .split(/\s+/)
    .every((searchTerm) => searchableText.includes(searchTerm));
}
