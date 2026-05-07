import { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { loadStorybookRecipes, storybookRecipes } from './fakeRecipes';

type MockMode = 'default' | 'empty' | 'loading';
type FetchLike = typeof fetch;

const LAST_HOME_ROUTE_STORAGE_KEY = 'navigation:last-home-route';
const EMPTY_HOME_QUERY = 'story-no-match-query';

const STORYBOOK_RECIPE_NOTES = {
  'storybook-lemon-chickpea-bowl': 'Add cucumber ribbons for a brighter lunch.'
};

const STORYBOOK_RECIPE_RATINGS = {
  'storybook-lemon-chickpea-bowl': 5,
  'storybook-skillet-pasta': 4.5
};

const STORYBOOK_RECIPE_SERVINGS = {
  'storybook-lemon-chickpea-bowl': 4,
  'storybook-skillet-pasta': 3
};

const STORYBOOK_RECIPE_BOOKMARKS = {
  'storybook-lemon-chickpea-bowl': [
    {
      id: 'storybook-lemon-chickpea-bowl-lunch-box',
      label: 'Lunch box note',
      text: 'Keep the dressing separate until serving.'
    }
  ],
  'storybook-skillet-pasta': [
    {
      id: 'storybook-skillet-pasta-weeknight',
      label: 'Weeknight shortcut',
      text: 'Use a deeper skillet so the tomatoes stay in the pan.'
    }
  ]
};

const STORYBOOK_MEAL_PLAN = {
  '2026-05-01': ['storybook-skillet-pasta'],
  '2026-05-02': ['storybook-lemon-chickpea-bowl', 'storybook-skillet-pasta']
};

const STORYBOOK_COOKED_MEAL_HISTORY = {
  '2026-04-28': ['storybook-skillet-pasta'],
  '2026-04-29': ['storybook-lemon-chickpea-bowl']
};

const STORYBOOK_RECIPE_SETTINGS = {
  defaultServingSize: 2
};

const STORYBOOK_SHOPPING_LIST_CUSTOM_ITEMS = [
  {
    amountText: '2 tbsp',
    id: 'storybook-tahini',
    ingredientName: 'tahini'
  }
];

const defaultApiPayloadByPath: Record<string, unknown> = {
  '/api/cooked-meal-history': {
    cookedMealHistory: STORYBOOK_COOKED_MEAL_HISTORY
  },
  '/api/cooked-meal-history/entries': {
    cookedMealHistory: STORYBOOK_COOKED_MEAL_HISTORY
  },
  '/api/meal-plan': {
    mealPlan: STORYBOOK_MEAL_PLAN
  },
  '/api/meal-plan/entries': {
    mealPlan: STORYBOOK_MEAL_PLAN
  },
  '/api/meal-plan/entries/mark-cooked': {
    cookedMealHistory: STORYBOOK_COOKED_MEAL_HISTORY,
    mealPlan: STORYBOOK_MEAL_PLAN
  },
  '/api/meal-plan/entries/move': {
    mealPlan: STORYBOOK_MEAL_PLAN
  },
  '/api/recipe-bookmarks': {
    recipeBookmarks: STORYBOOK_RECIPE_BOOKMARKS
  },
  '/api/recipe-catalog': {
    recipes: storybookRecipes
  },
  '/api/recipe-notes': {
    recipeNotes: STORYBOOK_RECIPE_NOTES
  },
  '/api/recipe-ratings': {
    recipeRatings: STORYBOOK_RECIPE_RATINGS
  },
  '/api/recipe-servings': {
    recipeServings: STORYBOOK_RECIPE_SERVINGS
  },
  '/api/recipe-settings': {
    recipeSettings: STORYBOOK_RECIPE_SETTINGS
  },
  '/api/recipe-settings/default-serving-size': {
    recipeSettings: STORYBOOK_RECIPE_SETTINGS
  },
  '/api/shopping-list-checks': {
    shoppingListChecks: {}
  },
  '/api/shopping-list-custom-items': {
    shoppingListCustomItems: STORYBOOK_SHOPPING_LIST_CUSTOM_ITEMS
  }
};

const emptyApiPayloadByPath: Record<string, unknown> = {
  '/api/cooked-meal-history': { cookedMealHistory: {} },
  '/api/cooked-meal-history/entries': { cookedMealHistory: {} },
  '/api/meal-plan': { mealPlan: {} },
  '/api/meal-plan/entries': { mealPlan: {} },
  '/api/meal-plan/entries/move': { mealPlan: {} },
  '/api/meal-plan/entries/mark-cooked': { mealPlan: {}, cookedMealHistory: {} },
  '/api/recipe-bookmarks': { recipeBookmarks: {} },
  '/api/recipe-catalog': { recipes: storybookRecipes },
  '/api/recipe-notes': { recipeNotes: {} },
  '/api/recipe-ratings': { recipeRatings: {} },
  '/api/recipe-servings': { recipeServings: {} },
  '/api/recipe-settings': { recipeSettings: {} },
  '/api/recipe-settings/default-serving-size': { recipeSettings: {} },
  '/api/shopping-list-checks': { shoppingListChecks: {} },
  '/api/shopping-list-custom-items': { shoppingListCustomItems: [] }
};

function resolveApiPayload(pathname: string, mode: Exclude<MockMode, 'loading'>) {
  const payloadByPath = mode === 'default' ? defaultApiPayloadByPath : emptyApiPayloadByPath;

  if (pathname in payloadByPath) {
    return payloadByPath[pathname];
  }

  if (pathname.endsWith('/note')) {
    return mode === 'default'
      ? { recipeNotes: STORYBOOK_RECIPE_NOTES }
      : { recipeNotes: {} };
  }

  if (pathname.endsWith('/rating')) {
    return mode === 'default'
      ? { recipeRatings: STORYBOOK_RECIPE_RATINGS }
      : { recipeRatings: {} };
  }

  if (pathname.endsWith('/servings')) {
    return mode === 'default'
      ? { recipeServings: STORYBOOK_RECIPE_SERVINGS }
      : { recipeServings: {} };
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

    // Keep mock responses deterministic and side-effect free for stories.
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

function AppStoryHarness({
  initialEntry,
  mode
}: {
  initialEntry: string;
  mode: MockMode;
}) {
  const restoreFetchRef = useRef<null | (() => void)>(null);

  if (restoreFetchRef.current === null) {
    const originalFetch = globalThis.fetch.bind(globalThis);
    const storyFetch = createStoryFetch(mode, originalFetch);

    globalThis.fetch = storyFetch;
    restoreFetchRef.current = () => {
      globalThis.fetch = originalFetch;
    };

    window.localStorage.removeItem(LAST_HOME_ROUTE_STORAGE_KEY);
  }

  useEffect(() => {
    return () => {
      restoreFetchRef.current?.();
      restoreFetchRef.current = null;
    };
  }, []);

  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <App loadRecipes={loadStorybookRecipes} />
    </MemoryRouter>
  );
}

const meta = {
  title: 'App/States',
  parameters: {
    docs: {
      description: {
        component:
          'Full app stories with tab navigation enabled. Default shows a populated fake snapshot while Empty and Loading exercise the shell states.'
      }
    }
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <AppStoryHarness mode="default" initialEntry="/" />
};

export const Empty: Story = {
  render: () => <AppStoryHarness mode="empty" initialEntry={`/?q=${EMPTY_HOME_QUERY}`} />
};

export const Loading: Story = {
  render: () => <AppStoryHarness mode="loading" initialEntry="/" />
};
