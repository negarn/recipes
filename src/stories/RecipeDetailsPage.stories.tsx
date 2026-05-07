import { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RecipeAppDataProvider } from '../contexts/RecipeAppDataContext';
import { appRoutePaths, getRecipeRoutePath } from '../helpers/appRoutes';
import { RecipePage } from '../pages/RecipePage';
import { loadStorybookRecipes, storybookRecipes } from './fakeRecipes';

type MockMode = 'default' | 'empty' | 'loading';
type FetchLike = typeof fetch;

const EXISTING_RECIPE_ID = 'storybook-skillet-pasta';
const MISSING_RECIPE_ID = 'story-missing-recipe';
const EXISTING_RECIPE_NOTE =
  'Great for weeknights. Add chili flakes and extra basil before serving.';

const baseApiPayloadByPath: Record<string, unknown> = {
  '/api/cooked-meal-history': { cookedMealHistory: {} },
  '/api/cooked-meal-history/entries': { cookedMealHistory: {} },
  '/api/meal-plan': { mealPlan: {} },
  '/api/meal-plan/entries': { mealPlan: {} },
  '/api/meal-plan/entries/move': { mealPlan: {} },
  '/api/meal-plan/entries/mark-cooked': { mealPlan: {}, cookedMealHistory: {} },
  '/api/recipe-catalog': { recipes: storybookRecipes },
  '/api/recipe-notes': { recipeNotes: {} },
  '/api/recipe-ratings': { recipeRatings: {} },
  '/api/recipe-servings': { recipeServings: {} },
  '/api/recipe-settings': { recipeSettings: {} },
  '/api/recipe-settings/default-serving-size': { recipeSettings: {} },
  '/api/shopping-list-checks': { shoppingListChecks: {} },
  '/api/shopping-list-custom-items': { shoppingListCustomItems: [] }
};

function resolveApiPayload(pathname: string, mode: MockMode) {
  if (mode === 'default' && pathname === '/api/recipe-notes') {
    return {
      recipeNotes: {
        [EXISTING_RECIPE_ID]: EXISTING_RECIPE_NOTE
      }
    };
  }

  if (pathname in baseApiPayloadByPath) {
    return baseApiPayloadByPath[pathname];
  }

  if (pathname.endsWith('/note')) {
    return { recipeNotes: {} };
  }

  if (pathname.endsWith('/rating')) {
    return { recipeRatings: {} };
  }

  if (pathname.endsWith('/servings')) {
    return { recipeServings: {} };
  }

  return {};
}

function getRequestUrl(input: Parameters<FetchLike>[0]) {
  if (typeof input === 'string') {
    return new URL(input, window.location.origin);
  }

  if (input instanceof URL) {
    return new URL(input.toString(), window.location.origin);
  }

  return new URL(input.url, window.location.origin);
}

function createStoryFetch(mode: MockMode, originalFetch: FetchLike): FetchLike {
  return (input, init) => {
    const requestUrl = getRequestUrl(input);

    if (!requestUrl.pathname.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    if (mode === 'loading') {
      return new Promise<Response>(() => undefined);
    }

    const payload = resolveApiPayload(requestUrl.pathname, mode);

    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
  };
}

function RecipeDetailsStoryHarness({
  mode,
  recipeId
}: {
  mode: MockMode;
  recipeId: string;
}) {
  const restoreFetchRef = useRef<null | (() => void)>(null);
  const logRouteClick = action('route-click');

  if (restoreFetchRef.current === null) {
    const originalFetch = globalThis.fetch.bind(globalThis);
    const storyFetch = createStoryFetch(mode, originalFetch);

    globalThis.fetch = storyFetch;
    restoreFetchRef.current = () => {
      globalThis.fetch = originalFetch;
    };
  }

  useEffect(() => {
    return () => {
      restoreFetchRef.current?.();
      restoreFetchRef.current = null;
    };
  }, []);

  return (
    <div
      onClickCapture={(event) => {
        const anchorElement =
          event.target instanceof Element ? event.target.closest('a[href]') : null;

        if (!anchorElement) {
          return;
        }

        event.preventDefault();

        logRouteClick({
          href: anchorElement.getAttribute('href'),
          label: anchorElement.textContent?.trim() || null
        });
      }}
    >
      <MemoryRouter initialEntries={[getRecipeRoutePath(recipeId)]}>
        <RecipeAppDataProvider loadRecipes={loadStorybookRecipes}>
          <Routes>
            <Route path={appRoutePaths.recipe} element={<RecipePage />} />
          </Routes>
        </RecipeAppDataProvider>
      </MemoryRouter>
    </div>
  );
}

const meta = {
  title: 'Pages/Recipe Details',
  parameters: {
    docs: {
      description: {
        component:
          'Recipe details page states rendered directly. Route link clicks are logged as Storybook actions instead of navigating.'
      }
    }
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RecipeDetailsStoryHarness
      mode="default"
      recipeId={EXISTING_RECIPE_ID}
    />
  )
};

export const Empty: Story = {
  render: () => <RecipeDetailsStoryHarness mode="empty" recipeId={MISSING_RECIPE_ID} />
};

export const Loading: Story = {
  render: () => (
    <RecipeDetailsStoryHarness
      mode="loading"
      recipeId={EXISTING_RECIPE_ID}
    />
  )
};
