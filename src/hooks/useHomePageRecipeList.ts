import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createHomePageSearchParams,
  readHomePageAudience,
  readHomePageRawAudienceParam,
  readHomePageRawPageParam,
  readHomePageRawQueryParam,
  readHomePageSearchPage,
  readHomePageSearchQuery
} from '../helpers/homePageSearchParams';
import {
  applyRecipeRating,
  recipeMatchesSearch
} from '../helpers/recipeMetadata';
import { isRecipeForChildren } from '../helpers/recipeAudience';
import { getCookTimeMinutes } from '../helpers/recipeTiming';
import type { RecipeRatingMap } from '../types/app';
import type { Recipe } from '../types/recipe';

export const HOME_PAGE_RECIPES_PER_PAGE = 20;

export function useHomePageRecipeList(
  recipes: Recipe[],
  recipeRatings: RecipeRatingMap,
  { shouldNormalizeSearchParams = true }: { shouldNormalizeSearchParams?: boolean } = {}
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const audience = readHomePageAudience(searchParams);
  const query = readHomePageSearchQuery(searchParams);
  const hasSearchQuery = query.length > 0;
  const ratedAndSortedRecipes = useMemo(
    () =>
      recipes
        .map((recipe) => applyRecipeRating(recipe, recipeRatings))
        .sort((leftRecipe, rightRecipe) => {
          const leftRating = leftRecipe.rating ?? Number.NEGATIVE_INFINITY;
          const rightRating = rightRecipe.rating ?? Number.NEGATIVE_INFINITY;

          if (rightRating !== leftRating) {
            return rightRating - leftRating;
          }

          return (
            getCookTimeMinutes(leftRecipe.totalTime) -
            getCookTimeMinutes(rightRecipe.totalTime)
          );
        }),
    [recipeRatings, recipes]
  );
  const audienceFilteredRecipes = useMemo(
    () =>
      ratedAndSortedRecipes.filter((recipe) =>
        audience === 'children' ? isRecipeForChildren(recipe) : !isRecipeForChildren(recipe)
      ),
    [audience, ratedAndSortedRecipes]
  );
  const filteredRecipes = useMemo(
    () =>
      audienceFilteredRecipes.filter((recipe) => recipeMatchesSearch(recipe, query)),
    [audienceFilteredRecipes, query]
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecipes.length / HOME_PAGE_RECIPES_PER_PAGE)
  );
  const searchParamPage = readHomePageSearchPage(searchParams);
  const currentPage = Math.min(searchParamPage ?? 1, totalPages);
  const currentPageIndex = currentPage - 1;
  const paginatedRecipes = useMemo(
    () =>
      filteredRecipes.slice(
        currentPageIndex * HOME_PAGE_RECIPES_PER_PAGE,
        (currentPageIndex + 1) * HOME_PAGE_RECIPES_PER_PAGE
      ),
    [currentPageIndex, filteredRecipes]
  );

  function setHomePageSearchParams(nextQuery: string, nextPage: number) {
    setSearchParams(
      (currentSearchParams) =>
        createHomePageSearchParams(currentSearchParams, {
          audience,
          page: nextPage,
          query: nextQuery
        }),
      { replace: true }
    );
  }

  function updateCurrentPage(nextPage: number) {
    setHomePageSearchParams(query, nextPage);
  }

  function updateSearchQuery(nextQuery: string) {
    setHomePageSearchParams(nextQuery, 1);
  }

  function clearSearchQuery() {
    updateSearchQuery('');
  }

  function updateAudience(nextAudience: 'adults' | 'children') {
    setSearchParams(
      (currentSearchParams) =>
        createHomePageSearchParams(currentSearchParams, {
          audience: nextAudience,
          page: 1,
          query
        }),
      { replace: true }
    );
  }

  useEffect(() => {
    if (!shouldNormalizeSearchParams) {
      return;
    }

    const rawAudienceParam = readHomePageRawAudienceParam(searchParams);
    const rawQueryParam = readHomePageRawQueryParam(searchParams);
    const rawPageParam = readHomePageRawPageParam(searchParams);
    const shouldNormalizeAudience =
      rawAudienceParam !== null &&
      (rawAudienceParam !== audience || audience === 'adults');
    const shouldNormalizeQuery = rawQueryParam !== null && rawQueryParam.trim().length === 0;
    const shouldNormalizePage =
      rawPageParam !== null && searchParamPage !== currentPage;

    if (!(shouldNormalizeAudience || shouldNormalizeQuery || shouldNormalizePage)) {
      return;
    }

    const normalizedSearchParams = createHomePageSearchParams(searchParams, {
      audience,
      page: currentPage,
      query
    });

    if (normalizedSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(normalizedSearchParams, { replace: true });
    }
  }, [
    currentPage,
    query,
    audience,
    searchParamPage,
    searchParams,
    setSearchParams,
    shouldNormalizeSearchParams
  ]);

  return {
    audience,
    clearSearchQuery,
    currentPage,
    filteredRecipeCount: filteredRecipes.length,
    hasSearchQuery,
    paginatedRecipes,
    query,
    totalPages,
    updateAudience,
    updateCurrentPage,
    updateSearchQuery
  };
}
