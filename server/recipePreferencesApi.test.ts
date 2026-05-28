import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recipePreferenceApiPaths } from '../src/helpers/recipePreferenceRoutes';
import { recipePreferencesApi } from './recipePreferencesApi';

type MiddlewareHandler = (
  request: IncomingMessage,
  response: ServerResponse,
  next: (error?: Error) => void
) => void;

let testDataDir = '';

beforeAll(async () => {
  testDataDir = await mkdtemp(join(tmpdir(), 'recipes-recipe-preferences-'));
  process.env.RECIPE_PREFERENCES_DATA_DIR = testDataDir;
});

afterAll(async () => {
  delete process.env.RECIPE_PREFERENCES_DATA_DIR;

  if (testDataDir) {
    await rm(testDataDir, { recursive: true, force: true });
  }
});

function createMiddlewareHandler() {
  let installedHandler: MiddlewareHandler | null = null;

  const plugin = recipePreferencesApi();
  plugin.configureServer({
    middlewares: {
      use(handler: MiddlewareHandler) {
        installedHandler = handler;
      }
    }
  } as never);

  if (!installedHandler) {
    throw new Error('Expected recipe preferences middleware to be installed.');
  }

  return installedHandler;
}

async function executeRequest({
  body,
  host = '127.0.0.1:5173',
  origin,
  method,
  remoteAddress = '127.0.0.1',
  xForwardedProto,
  url
}: {
  body?: string;
  host?: string;
  origin?: string;
  method: string;
  remoteAddress?: string;
  xForwardedProto?: string;
  url: string;
}) {
  const middleware = createMiddlewareHandler();
  const request = Readable.from(body === undefined ? [] : [body]) as IncomingMessage;
  const responseState = {
    body: '',
    headers: new Map<string, string>(),
    statusCode: 200
  };

  Object.assign(request, {
    headers: {
      'content-type': 'application/json',
      host,
      ...(origin ? { origin } : {}),
      ...(xForwardedProto ? { 'x-forwarded-proto': xForwardedProto } : {})
    },
    method,
    socket: {
      remoteAddress
    },
    url
  });

  const response = {
    end(chunk?: string | Buffer) {
      responseState.body = chunk ? String(chunk) : '';
      done({ kind: 'end' });
    },
    setHeader(name: string, value: string) {
      responseState.headers.set(name.toLowerCase(), String(value));
    },
    statusCode: responseState.statusCode
  } as unknown as ServerResponse;

  let done!: (value: { kind: 'end' | 'next' }) => void;
  const completion = new Promise<{ kind: 'end' | 'next' }>((resolve) => {
    done = resolve;
  });

  middleware(request, response, () => {
    done({ kind: 'next' });
  });

  const completionReason = await completion;
  responseState.statusCode = response.statusCode;

  if (completionReason.kind === 'next') {
    throw new Error(`Expected middleware to handle ${method} ${url}.`);
  }

  return {
    body: responseState.body ? (JSON.parse(responseState.body) as Record<string, unknown>) : {},
    headers: responseState.headers,
    statusCode: responseState.statusCode
  };
}

const recipePayload = {
  recipe: {
    defaultServings: 2,
    id: 'test-custom-unified-store',
    ingredients: [
      {
        amount: {
          quantity: 1,
          type: 'scalable',
          unit: {
            singular: 'x'
          }
        },
        id: 'test-ingredient',
        name: 'Test ingredient'
      }
    ],
    isVegan: false,
    isVegetarian: true,
    sections: [
      {
        id: 'prep',
        steps: ['Prepare the test ingredient.'],
        title: 'Prep'
      }
    ],
    tags: [],
    title: 'Test Custom Unified Store',
    totalTime: '10 mins'
  }
};

describe('recipePreferencesApi', () => {
  it('returns 400 for malformed encoded recipe ids', async () => {
    const response = await executeRequest({
      body: JSON.stringify({ rating: 4 }),
      method: 'PUT',
      url: `${recipePreferenceApiPaths.recipes}/%E0%A4%A/rating`
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Expected a valid encoded recipe id.');
  });

  it('returns 403 for non-local requests', async () => {
    const response = await executeRequest({
      body: JSON.stringify({ rating: 4 }),
      method: 'PUT',
      remoteAddress: '203.0.113.10',
      url: `${recipePreferenceApiPaths.recipes}/sample-recipe/rating`
    });

    expect(response.statusCode).toBe(403);
    expect(response.body.error).toBe('This API is only available from localhost.');
  });

  it('allows requests from the configured public origin', async () => {
    process.env.RECIPE_PUBLIC_ORIGIN = 'https://recipes.example.com';

    try {
      const response = await executeRequest({
        body: JSON.stringify(recipePayload),
        host: 'recipes.example.com',
        method: 'PUT',
        origin: 'https://recipes.example.com',
        remoteAddress: '203.0.113.10',
        url: recipePreferenceApiPaths.recipeCatalog
      });

      expect(response.statusCode).toBe(200);
    } finally {
      delete process.env.RECIPE_PUBLIC_ORIGIN;
    }
  });

  it('returns 413 when request body exceeds the configured limit', async () => {
    const oversizedPayload = JSON.stringify({
      shoppingListChecks: {
        item: ['x'.repeat(270_000)]
      }
    });
    const response = await executeRequest({
      body: oversizedPayload,
      method: 'PUT',
      url: recipePreferenceApiPaths.shoppingListChecks
    });

    expect(response.statusCode).toBe(413);
    expect(response.body.error).toBe('Request body is too large.');
  });

  it('returns 400 for invalid cooked meal history entry payloads', async () => {
    const response = await executeRequest({
      body: JSON.stringify({
        date: 'not-a-date',
        recipeId: 'sample-recipe'
      }),
      method: 'PUT',
      url: recipePreferenceApiPaths.cookedMealHistoryEntries
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Expected a recipe id and a valid date.');
  });

  it('filters invalid recipe bookmark entries', async () => {
    const response = await executeRequest({
      body: JSON.stringify({
        recipeBookmarks: {
          'sample-recipe': [
            { id: '', label: 'Missing id', text: 'Saved text' }
          ]
        }
      }),
      method: 'PUT',
      url: recipePreferenceApiPaths.recipeBookmarks
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.recipeBookmarks).toEqual({});
  });

  it('returns 404 when cooking an unknown recipe id', async () => {
    const response = await executeRequest({
      body: JSON.stringify({
        date: '2026-04-12',
        recipeId: 'missing-recipe'
      }),
      method: 'PUT',
      url: recipePreferenceApiPaths.cookedMealHistoryEntries
    });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('That recipe could not be found.');
  });

  it('moves and removes cooked meal history entries', async () => {
    await executeRequest({
      body: JSON.stringify(recipePayload),
      method: 'PUT',
      url: recipePreferenceApiPaths.recipeCatalog
    });

    await executeRequest({
      body: JSON.stringify({
        date: '2026-05-27',
        recipeId: recipePayload.recipe.id
      }),
      method: 'PUT',
      url: recipePreferenceApiPaths.cookedMealHistoryEntries
    });

    const moveResponse = await executeRequest({
      body: JSON.stringify({
        currentDate: '2026-05-27',
        entryIndex: 0,
        nextDate: '2026-05-28'
      }),
      method: 'PUT',
      url: recipePreferenceApiPaths.cookedMealHistoryEntriesMove
    });

    expect(moveResponse.statusCode).toBe(200);
    expect(moveResponse.body.cookedMealHistory).toEqual({
      '2026-05-28': [recipePayload.recipe.id]
    });

    const deleteResponse = await executeRequest({
      body: JSON.stringify({
        currentDate: '2026-05-28',
        entryIndex: 0
      }),
      method: 'DELETE',
      url: recipePreferenceApiPaths.cookedMealHistoryEntries
    });

    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body.cookedMealHistory).toEqual({});
  });

  it('stores recipes in the unified recipe catalog file', async () => {
    const response = await executeRequest({
      body: JSON.stringify(recipePayload),
      method: 'PUT',
      url: recipePreferenceApiPaths.recipeCatalog
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.recipes).toEqual(
      expect.arrayContaining([recipePayload.recipe])
    );

    const recipesPath = join(testDataDir, 'recipes.json');
    const persistedRecipes = JSON.parse(await readFile(recipesPath, 'utf8')) as Array<{
      id: string;
    }>;
    const recipeFileStats = await stat(recipesPath);

    expect(persistedRecipes).toEqual([expect.objectContaining(recipePayload.recipe)]);
    expect(recipeFileStats.mode & 0o777).toBe(0o600);

    const recipesResponse = await executeRequest({
      method: 'GET',
      url: recipePreferenceApiPaths.recipeCatalog
    });

    expect(recipesResponse.statusCode).toBe(200);
    expect(recipesResponse.body.recipes).toEqual(
      expect.arrayContaining([recipePayload.recipe])
    );
  });
});
