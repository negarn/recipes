import { promises as fs } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import type { Plugin } from 'vite';
import {
  normalizeRecipe,
  normalizeRecipes
} from '../src/helpers/customRecipes';
import {
  getTodayMealPlanDateString,
  isAllowedMealPlanDate,
  isValidMealPlanDate
} from '../src/helpers/mealPlanData';
import {
  normalizeRecipeBookmarks,
  isValidRecipeRating,
  normalizeRecipeNoteText,
  isValidRecipeServing
} from '../src/helpers/recipePreferenceData';
import { isNonEmptyString, isRecordLike } from '../src/helpers/normalization';
import {
  getRecipeAppPreferenceDefinition,
  recipeAppPreferenceKeys,
  type RecipeAppPreferenceKey,
  type RecipeAppPreferenceValueMap,
  type RecipePreferenceStore
} from '../src/helpers/recipePreferenceStores';
import { recipePreferenceApiPaths } from '../src/helpers/recipePreferenceRoutes';
import {
  createAsyncActionQueueRef,
  queueAsyncAction
} from '../src/helpers/asyncQueue';
import {
  createCloudSyncManager,
  type CloudSyncManager
} from './cloudSync';
import {
  getConfiguredPublicOrigin,
  getConfiguredPublicOriginHostName,
  getRequestOriginHeader
} from './publicOrigin';
import {
  createEmptyRecipeAppDataSnapshot,
  type RecipeAppDataSnapshot
} from '../src/helpers/cloudSyncData';
import {
  ensurePrivateJsonStorageFile,
  writePrivateJsonFile
} from './privateFilesystem';
import type {
  DatedRecipeMap,
  MealPlanMap,
  RecipePreferenceResponseKey
} from '../src/types/app';
import type { Recipe } from '../src/types/recipe';

type NextFunction = (error?: Error) => void;
type MiddlewareStack = {
  use: (
    handler: (
      request: IncomingMessage,
      response: ServerResponse,
      next: NextFunction
    ) => void
  ) => void;
};

type PersistedRecipeDataStore<T, K extends RecipePreferenceResponseKey> =
  RecipePreferenceStore<T, K> & {
    filePath: string;
  };
type AnyPersistedRecipeDataStore = PersistedRecipeDataStore<
  unknown,
  RecipePreferenceResponseKey
>;
type PersistedRecipeDataStoreMap = {
  [K in RecipeAppPreferenceKey]: PersistedRecipeDataStore<
    RecipeAppPreferenceValueMap[K],
    RecipePreferenceResponseKey
  >;
};
type MealPlanEntryReference = {
  currentDate: string;
  entryIndex: number;
};
type RequestBodyParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };
type PersistedStoreWrite = {
  nextValue: unknown;
  previousValue: unknown;
  store: AnyPersistedRecipeDataStore;
};
type RecipeStoreMutationSuffix = '/note' | '/rating' | '/servings';
type RecipeStoreMutationHandler = {
  handle: (args: {
    request: IncomingMessage;
    requestPath: string;
    response: ServerResponse;
  }) => Promise<void>;
  suffix: RecipeStoreMutationSuffix;
};
type ExactRecipePreferenceRouteHandler = {
  handle: (args: {
    request: IncomingMessage;
    response: ServerResponse;
  }) => Promise<void>;
  method: 'DELETE' | 'PUT';
  path: string;
};

class InvalidRequestBodyError extends Error {}
class RequestBodyTooLargeError extends Error {}
class PersistedRecipeDataRollbackError extends Error {
  constructor(
    message: string,
    readonly causes: unknown[]
  ) {
    super(message);
  }
}

const LOOPBACK_HOST_NAMES = new Set(['127.0.0.1', '::1', 'localhost']);
const defaultPersistedRecipeDataRootDir = resolve(homedir(), '.recipes');

function getRequestHostName(request: IncomingMessage) {
  const hostHeader = request.headers.host?.trim();

  if (!hostHeader) {
    return null;
  }

  if (hostHeader.startsWith('[')) {
    const closingBracketIndex = hostHeader.indexOf(']');

    if (closingBracketIndex <= 1) {
      return null;
    }

    return hostHeader.slice(1, closingBracketIndex).toLowerCase();
  }

  return hostHeader.split(':', 1)[0].toLowerCase();
}

function isLoopbackRemoteAddress(remoteAddress: string | null | undefined) {
  if (!remoteAddress) {
    return false;
  }

  const normalizedRemoteAddress = remoteAddress.toLowerCase();

  return (
    LOOPBACK_HOST_NAMES.has(normalizedRemoteAddress) ||
    normalizedRemoteAddress === '::ffff:127.0.0.1'
  );
}

function isTrustedLocalRequest(request: IncomingMessage) {
  const hostName = getRequestHostName(request);

  return (
    isLoopbackRemoteAddress(request.socket?.remoteAddress) &&
    Boolean(hostName && LOOPBACK_HOST_NAMES.has(hostName))
  );
}

function isTrustedPublicOriginRequest(
  request: IncomingMessage,
  requestPath: string
) {
  const configuredPublicOrigin = getConfiguredPublicOrigin();
  const configuredPublicOriginHostName = getConfiguredPublicOriginHostName();

  if (!configuredPublicOrigin || !configuredPublicOriginHostName) {
    return false;
  }

  const hostName = getRequestHostName(request);

  if (hostName !== configuredPublicOriginHostName) {
    return false;
  }

  const isCloudSyncCallbackRoute = /^\/api\/cloud-sync\/(google-drive|dropbox)\/callback$/.test(
    requestPath
  );

  if (isCloudSyncCallbackRoute) {
    return true;
  }

  if (request.method && request.method !== 'GET') {
    return getRequestOriginHeader(request) === configuredPublicOrigin;
  }

  return true;
}

function isTrustedRequest(request: IncomingMessage, requestPath: string) {
  return isTrustedLocalRequest(request) || isTrustedPublicOriginRequest(request, requestPath);
}

function getRequestAccessErrorMessage() {
  return getConfiguredPublicOrigin()
    ? 'This API is only available from localhost or the configured public origin.'
    : 'This API is only available from localhost.';
}

function getPersistedRecipeDataPath(fileName: string) {
  return resolve(getPersistedRecipeDataRootDir(), fileName);
}

function createPersistedRecipeDataStore<K extends RecipeAppPreferenceKey>(key: K) {
  const definition = getRecipeAppPreferenceDefinition(key);

  return {
    ...definition.store,
    get filePath() {
      return getPersistedRecipeDataPath(definition.fileName);
    }
  } satisfies PersistedRecipeDataStore<
    ReturnType<(typeof definition.store)['createEmptyValue']>,
    (typeof definition.store)['responseKey']
  >;
}

function createPersistedRecipeDataStores() {
  return Object.fromEntries(
    recipeAppPreferenceKeys.map((key) => [key, createPersistedRecipeDataStore(key)])
  ) as PersistedRecipeDataStoreMap;
}

const persistedRecipeDataStores = createPersistedRecipeDataStores();
const recipeRatingsStore = persistedRecipeDataStores.recipeRatings;
const mealPlanStore = persistedRecipeDataStores.mealPlan;
const cookedMealHistoryStore = persistedRecipeDataStores.cookedMealHistory;
const recipeBookmarksStore = persistedRecipeDataStores.recipeBookmarks;
const recipeServingsStore = persistedRecipeDataStores.recipeServings;
const recipeNotesStore = persistedRecipeDataStores.recipeNotes;
const recipeSettingsStore = persistedRecipeDataStores.recipeSettings;
const shoppingListChecksStore = persistedRecipeDataStores.shoppingListChecks;
const shoppingListCustomItemsStore = persistedRecipeDataStores.shoppingListCustomItems;
let cloudSyncManager: CloudSyncManager | null = null;
type PersistedRecipeCatalog = Recipe[];

function getRecipeCatalogFilePath() {
  return getPersistedRecipeDataPath('recipes.json');
}

function createEmptyRecipeCatalog(): PersistedRecipeCatalog {
  return [];
}

function normalizeRecipeCatalog(value: unknown): PersistedRecipeCatalog {
  if (Array.isArray(value)) {
    const normalizedRecipes = normalizeRecipes(value);
    return normalizedRecipes.length ? normalizedRecipes : createEmptyRecipeCatalog();
  }

  return createEmptyRecipeCatalog();
}

async function readPersistedRecipeCatalog() {
  return readPersistedRecipeDataFile(
    getRecipeCatalogFilePath(),
    normalizeRecipeCatalog,
    createEmptyRecipeCatalog()
  );
}

async function writePersistedRecipeCatalog(value: PersistedRecipeCatalog) {
  await writePrivateJsonFile(getRecipeCatalogFilePath(), value);
}

const readableStoreByPath = new Map<
  string,
  PersistedRecipeDataStore<unknown, RecipePreferenceResponseKey>
>();
const persistedRecipeDataMutationQueueRef = createAsyncActionQueueRef();
const MAX_JSON_REQUEST_BODY_BYTES = 256 * 1024;

Object.values(persistedRecipeDataStores).forEach((store) => {
  readableStoreByPath.set(
    store.requestPath,
    store as PersistedRecipeDataStore<unknown, RecipePreferenceResponseKey>
  );
});

function queuePersistedRecipeDataMutation<T>(action: () => Promise<T>) {
  // Serialize read-modify-write mutations so overlapping requests cannot
  // overwrite each other's persisted snapshots.
  return queueAsyncAction(persistedRecipeDataMutationQueueRef, action);
}

function waitForPersistedRecipeDataMutations() {
  return persistedRecipeDataMutationQueueRef.current;
}

async function readPersistedRecipeDataFile<T>(
  filePath: string,
  normalize: (value: unknown) => T,
  emptyValue: T
) {
  await ensurePrivateJsonStorageFile(filePath);

  let fileContents: string;

  try {
    fileContents = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return emptyValue;
    }

    throw error;
  }

  try {
    return normalize(JSON.parse(fileContents));
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(
        `Could not parse persisted recipe data at ${filePath}; using an empty fallback value.`,
        error
      );
      return emptyValue;
    }

    throw error;
  }
}

async function readPersistedStore<T, K extends RecipePreferenceResponseKey>(
  store: PersistedRecipeDataStore<T, K>
) {
  return readPersistedRecipeDataFile(
    store.filePath,
    store.normalize,
    store.createEmptyValue()
  );
}

async function writePersistedStore<T, K extends RecipePreferenceResponseKey>(
  store: PersistedRecipeDataStore<T, K>,
  value: T
) {
  await writePrivateJsonFile(store.filePath, value);
}

async function writePersistedStoreAndSend<T, K extends RecipePreferenceResponseKey>(
  store: PersistedRecipeDataStore<T, K>,
  value: T,
  response: ServerResponse
) {
  await writePersistedStore(store, value);
  void cloudSyncManager?.scheduleSync();
  sendJson(response, 200, { [store.responseKey]: value });
}

async function writePersistedStoresWithRollback(storeWrites: PersistedStoreWrite[]) {
  const appliedWrites: PersistedStoreWrite[] = [];

  try {
    for (const storeWrite of storeWrites) {
      await writePersistedStore(storeWrite.store, storeWrite.nextValue);
      appliedWrites.push(storeWrite);
    }
  } catch (error) {
    const rollbackResults = await Promise.allSettled(
      appliedWrites
        .slice()
        .reverse()
        .map((storeWrite) => writePersistedStore(storeWrite.store, storeWrite.previousValue))
    );
    const rollbackErrors = rollbackResults.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : []
    );

    if (rollbackErrors.length) {
      throw new PersistedRecipeDataRollbackError(
        'Could not persist recipe data and rollback failed.',
        [error, ...rollbackErrors]
      );
    }

    throw error;
  }

  void cloudSyncManager?.scheduleSync();
}

function getPersistedRecipeDataRootDir() {
  return process.env.RECIPE_PREFERENCES_DATA_DIR ?? defaultPersistedRecipeDataRootDir;
}

async function readPersistedRecipeAppSnapshot(): Promise<RecipeAppDataSnapshot> {
  const [recipes, cookedMealHistory, mealPlan, recipeBookmarks, recipeNotes, recipeRatings, recipeServings, recipeSettings, shoppingListChecks, shoppingListCustomItems] =
    await Promise.all([
      readPersistedRecipeCatalog(),
      readPersistedStore(cookedMealHistoryStore),
      readPersistedStore(mealPlanStore),
      readPersistedStore(recipeBookmarksStore),
      readPersistedStore(recipeNotesStore),
      readPersistedStore(recipeRatingsStore),
      readPersistedStore(recipeServingsStore),
      readPersistedStore(recipeSettingsStore),
      readPersistedStore(shoppingListChecksStore),
      readPersistedStore(shoppingListCustomItemsStore)
    ]);

  return {
    cookedMealHistory,
    mealPlan,
    recipes,
    recipeBookmarks,
    recipeNotes,
    recipeRatings,
    recipeServings,
    recipeSettings,
    shoppingListChecks,
    shoppingListCustomItems
  };
}

async function writePersistedRecipeAppSnapshot(snapshot: RecipeAppDataSnapshot) {
  await writePersistedRecipeCatalog(snapshot.recipes);
  await writePersistedStore(cookedMealHistoryStore, snapshot.cookedMealHistory);
  await writePersistedStore(mealPlanStore, snapshot.mealPlan);
  await writePersistedStore(recipeBookmarksStore, snapshot.recipeBookmarks);
  await writePersistedStore(recipeNotesStore, snapshot.recipeNotes);
  await writePersistedStore(recipeRatingsStore, snapshot.recipeRatings);
  await writePersistedStore(recipeServingsStore, snapshot.recipeServings);
  await writePersistedStore(recipeSettingsStore, snapshot.recipeSettings);
  await writePersistedStore(shoppingListChecksStore, snapshot.shoppingListChecks);
  await writePersistedStore(shoppingListCustomItemsStore, snapshot.shoppingListCustomItems);
}

cloudSyncManager = createCloudSyncManager({
  applySnapshot: writePersistedRecipeAppSnapshot,
  dataRootDir: getPersistedRecipeDataRootDir(),
  getSnapshot: readPersistedRecipeAppSnapshot,
  onError: console.error
});

function appendDatedRecipeEntry(
  datedRecipeMap: DatedRecipeMap,
  date: string,
  recipeId: string
) {
  datedRecipeMap[date] = [...(datedRecipeMap[date] ?? []), recipeId];
}

function getMealPlanEntryRecipeId(
  mealPlan: MealPlanMap,
  currentDate: string,
  entryIndex: number
) {
  const mealPlanEntries = mealPlan[currentDate];

  if (
    !mealPlanEntries ||
    !Number.isSafeInteger(entryIndex) ||
    entryIndex < 0 ||
    entryIndex >= mealPlanEntries.length
  ) {
    return null;
  }

  return mealPlanEntries[entryIndex];
}

function removeMealPlanEntryAt(
  mealPlan: MealPlanMap,
  currentDate: string,
  entryIndex: number
) {
  const mealPlanEntries = mealPlan[currentDate];

  if (!mealPlanEntries) {
    return;
  }

  const nextMealPlanEntries = mealPlanEntries.filter((_, index) => index !== entryIndex);

  if (nextMealPlanEntries.length) {
    mealPlan[currentDate] = nextMealPlanEntries;
  } else {
    delete mealPlan[currentDate];
  }
}

function sendMealPlanEntryNotFound(response: ServerResponse) {
  sendJson(response, 404, { error: 'That meal plan entry could not be found.' });
}

async function loadExistingMealPlanEntry({
  currentDate,
  entryIndex
}: MealPlanEntryReference) {
  const mealPlan = await readPersistedStore(mealPlanStore);
  const recipeId = getMealPlanEntryRecipeId(mealPlan, currentDate, entryIndex);

  if (!recipeId) {
    return null;
  }

  return {
    currentDate,
    entryIndex,
    mealPlan,
    recipeId
  };
}

type ExistingMealPlanEntry = NonNullable<
  Awaited<ReturnType<typeof loadExistingMealPlanEntry>>
>;

function hasRequestBodyKey(
  requestBody: unknown,
  key: string
): requestBody is Record<string, unknown> {
  return isRecordLike(requestBody) && Object.prototype.hasOwnProperty.call(requestBody, key);
}

function getRequestBodyField(value: unknown, key: string) {
  return isRecordLike(value) ? value[key] : undefined;
}

function isValidEntryIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseMealPlanEntryCreateRequestBody(
  value: unknown
): RequestBodyParseResult<{ date: string; recipeId: string }> {
  if (!isRecordLike(value)) {
    return {
      ok: false,
      message: `Expected a recipe id and a date on or after ${getTodayMealPlanDateString()}.`
    };
  }

  const { date, recipeId } = value as Partial<Record<'date' | 'recipeId', unknown>>;

  if (!isAllowedMealPlanDate(date) || !isNonEmptyString(recipeId)) {
    return {
      ok: false,
      message: `Expected a recipe id and a date on or after ${getTodayMealPlanDateString()}.`
    };
  }

  return {
    ok: true,
    value: {
      date,
      recipeId
    }
  };
}

function parseCookedMealHistoryEntryCreateRequestBody(
  value: unknown
): RequestBodyParseResult<{ date: string; recipeId: string }> {
  if (!isRecordLike(value)) {
    return {
      ok: false,
      message: 'Expected a recipe id and a valid date.'
    };
  }

  const { date, recipeId } = value as Partial<Record<'date' | 'recipeId', unknown>>;

  if (!isValidMealPlanDate(date) || !isNonEmptyString(recipeId)) {
    return {
      ok: false,
      message: 'Expected a recipe id and a valid date.'
    };
  }

  return {
    ok: true,
    value: {
      date,
      recipeId
    }
  };
}

function parseMealPlanEntryMoveRequestBody(
  value: unknown
): RequestBodyParseResult<{
  currentDate: string;
  entryIndex: number;
  nextDate: string;
}> {
  const invalidBodyMessage = `Expected a valid current date, a next date on or after ${getTodayMealPlanDateString()}, and an entry index.`;
  const parsedEntryReference = parseMealPlanEntryReferenceRequestBodyWithMessage(
    value,
    invalidBodyMessage
  );
  if (parsedEntryReference.ok === false) {
    return {
      ok: false,
      message: parsedEntryReference.message
    };
  }
  const { currentDate, entryIndex } = parsedEntryReference.value;
  const { nextDate } = value as Partial<Record<'nextDate', unknown>>;

  if (!isAllowedMealPlanDate(nextDate)) {
    return {
      ok: false,
      message: invalidBodyMessage
    };
  }

  return {
    ok: true,
    value: {
      currentDate,
      entryIndex,
      nextDate
    }
  };
}

function parseMealPlanEntryReferenceRequestBodyWithMessage(
  value: unknown,
  message: string
): RequestBodyParseResult<MealPlanEntryReference> {
  if (!isRecordLike(value)) {
    return {
      ok: false,
      message
    };
  }

  const { currentDate, entryIndex } = value as Partial<
    Record<'currentDate' | 'entryIndex', unknown>
  >;

  if (!isValidMealPlanDate(currentDate) || !isValidEntryIndex(entryIndex)) {
    return {
      ok: false,
      message
    };
  }

  return {
    ok: true,
    value: {
      currentDate,
      entryIndex
    }
  };
}

function parseMealPlanEntryReferenceRequestBody(value: unknown) {
  return parseMealPlanEntryReferenceRequestBodyWithMessage(
    value,
    'Expected a valid current date and entry index.'
  );
}

function parseDefaultServingSizeRequestBody(
  value: unknown
): RequestBodyParseResult<{ defaultServingSize: number | null }> {
  if (!isRecordLike(value)) {
    return {
      ok: false,
      message: 'Expected a whole-number default serving size greater than 0, or null.'
    };
  }

  const { defaultServingSize } = value as Partial<Record<'defaultServingSize', unknown>>;

  if (!(defaultServingSize === null || isValidRecipeServing(defaultServingSize))) {
    return {
      ok: false,
      message: 'Expected a whole-number default serving size greater than 0, or null.'
    };
  }

  const normalizedDefaultServingSize =
    defaultServingSize === null ? null : (defaultServingSize as number);

  return {
    ok: true,
    value: {
      defaultServingSize: normalizedDefaultServingSize
    }
  };
}

function parseRecipeCatalogUpsertRequestBody(
  value: unknown
): RequestBodyParseResult<Recipe> {
  if (!isRecordLike(value) || !hasRequestBodyKey(value, 'recipe')) {
    return {
      ok: false,
      message: 'Expected a recipe payload.'
    };
  }

  const normalizedRecipe = normalizeRecipe(value.recipe);

  if (!normalizedRecipe) {
    return {
      ok: false,
      message: 'Expected a valid recipe.'
    };
  }

  return {
    ok: true,
    value: normalizedRecipe
  };
}

async function readRequestBody(request: IncomingMessage) {
  let requestBodyText = '';
  let requestBodyByteLength = 0;

  for await (const chunk of request) {
    requestBodyByteLength +=
      typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.byteLength;

    if (requestBodyByteLength > MAX_JSON_REQUEST_BODY_BYTES) {
      throw new RequestBodyTooLargeError(
        `Request body exceeds ${MAX_JSON_REQUEST_BODY_BYTES} bytes.`
      );
    }

    requestBodyText += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  }

  if (!requestBodyText) {
    return null;
  }

  try {
    return JSON.parse(requestBodyText) as unknown;
  } catch {
    throw new InvalidRequestBodyError('Expected a valid JSON request body.');
  }
}

function parseValueOrSendBadRequest<T>(
  response: ServerResponse,
  value: unknown,
  parseBody: (value: unknown) => RequestBodyParseResult<T>
) {
  const parsedBody = parseBody(value);

  if (parsedBody.ok === false) {
    sendJson(response, 400, { error: parsedBody.message });
    return null;
  }

  return parsedBody.value;
}

async function readParsedRequestBodyOrSendBadRequest<T>({
  request,
  response,
  parseBody
}: {
  request: IncomingMessage;
  response: ServerResponse;
  parseBody: (value: unknown) => RequestBodyParseResult<T>;
}) {
  return parseValueOrSendBadRequest(
    response,
    await readRequestBody(request),
    parseBody
  );
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

async function hasRecipeWithId(recipeId: string) {
  const recipeCatalog = await readPersistedRecipeCatalog();
  return recipeCatalog.some((recipe) => recipe.id === recipeId);
}

async function resolveRecipeId(
  requestPath: string,
  response: ServerResponse,
  suffix: '/note' | '/rating' | '/servings'
) {
  const recipePathPrefix = `${recipePreferenceApiPaths.recipes}/`;
  const encodedRecipeId = requestPath.slice(recipePathPrefix.length, -suffix.length);
  let recipeId: string;

  try {
    recipeId = decodeURIComponent(encodedRecipeId);
  } catch {
    sendJson(response, 400, { error: 'Expected a valid encoded recipe id.' });
    return null;
  }

  if (!isNonEmptyString(recipeId)) {
    sendJson(response, 400, { error: 'A recipe id is required.' });
    return null;
  }

  if (!(await hasRecipeWithId(recipeId))) {
    sendJson(response, 404, { error: 'That recipe could not be found.' });
    return null;
  }

  return recipeId;
}

async function handleRecipeStoreMutation<TStore, TParsedBody, K extends RecipePreferenceResponseKey>({
  request,
  response,
  requestPath,
  suffix,
  store,
  parseBody,
  mutateStore
}: {
  request: IncomingMessage;
  response: ServerResponse;
  requestPath: string;
  suffix: '/note' | '/rating' | '/servings';
  store: PersistedRecipeDataStore<TStore, K>;
  parseBody: (value: unknown) => RequestBodyParseResult<TParsedBody>;
  mutateStore: (storeValue: TStore, recipeId: string, parsedBody: TParsedBody) => void;
}) {
  const recipeId = await resolveRecipeId(requestPath, response, suffix);

  if (!recipeId) {
    return;
  }

  const parsedBody = await readParsedRequestBodyOrSendBadRequest({
    request,
    response,
    parseBody
  });

  if (parsedBody === null) {
    return;
  }

  await queuePersistedRecipeDataMutation(async () => {
    const storeValue = await readPersistedStore(store);
    mutateStore(storeValue, recipeId, parsedBody);
    await writePersistedStoreAndSend(store, storeValue, response);
  });
}

async function handleNormalizedStoreWrite<TStore, K extends RecipePreferenceResponseKey>({
  request,
  response,
  store,
  requestBodyKey,
  parseBody,
  missingBodyErrorMessage
}: {
  request: IncomingMessage;
  response: ServerResponse;
  store: PersistedRecipeDataStore<TStore, K>;
  requestBodyKey: string;
  parseBody: (value: unknown) => RequestBodyParseResult<TStore>;
  missingBodyErrorMessage: string;
}) {
  const requestBody = await readRequestBody(request);

  if (!hasRequestBodyKey(requestBody, requestBodyKey)) {
    sendJson(response, 400, { error: missingBodyErrorMessage });
    return;
  }

  const parsedBody = parseValueOrSendBadRequest(
    response,
    requestBody[requestBodyKey],
    parseBody
  );

  if (parsedBody === null) {
    return;
  }

  await queuePersistedRecipeDataMutation(async () => {
    await writePersistedStoreAndSend(store, parsedBody, response);
  });
}

async function handleMealPlanEntryMutation<TParsedBody>({
  getEntryReference,
  mutateEntry,
  parseBody,
  request,
  response
}: {
  getEntryReference: (parsedBody: TParsedBody) => MealPlanEntryReference;
  mutateEntry: (
    existingMealPlanEntry: ExistingMealPlanEntry,
    parsedBody: TParsedBody
  ) => Promise<void>;
  parseBody: (value: unknown) => RequestBodyParseResult<TParsedBody>;
  request: IncomingMessage;
  response: ServerResponse;
}) {
  const parsedBody = await readParsedRequestBodyOrSendBadRequest({
    request,
    response,
    parseBody
  });

  if (parsedBody === null) {
    return;
  }

  await queuePersistedRecipeDataMutation(async () => {
    const existingMealPlanEntry = await loadExistingMealPlanEntry(
      getEntryReference(parsedBody)
    );

    if (!existingMealPlanEntry) {
      sendMealPlanEntryNotFound(response);
      return;
    }

    await mutateEntry(existingMealPlanEntry, parsedBody);
  });
}

function getMealPlanEntryReference<TParsedBody extends MealPlanEntryReference>({
  currentDate,
  entryIndex
}: TParsedBody): MealPlanEntryReference {
  return {
    currentDate,
    entryIndex
  };
}

function createMealPlanEntryMutationRoute<TParsedBody>({
  getEntryReference,
  mutateEntry,
  parseBody
}: {
  getEntryReference: (parsedBody: TParsedBody) => MealPlanEntryReference;
  mutateEntry: (
    existingMealPlanEntry: ExistingMealPlanEntry,
    parsedBody: TParsedBody,
    response: ServerResponse
  ) => Promise<void>;
  parseBody: (value: unknown) => RequestBodyParseResult<TParsedBody>;
}) {
  return async ({
    request,
    response
  }: {
    request: IncomingMessage;
    response: ServerResponse;
  }) => {
    await handleMealPlanEntryMutation({
      getEntryReference,
      mutateEntry: (existingMealPlanEntry, parsedBody) =>
        mutateEntry(existingMealPlanEntry, parsedBody, response),
      parseBody,
      request,
      response
    });
  };
}

function createMealPlanEntryReferenceMutationRoute({
  mutateEntry
}: {
  mutateEntry: (
    existingMealPlanEntry: ExistingMealPlanEntry,
    response: ServerResponse
  ) => Promise<void>;
}) {
  return createMealPlanEntryMutationRoute({
    parseBody: parseMealPlanEntryReferenceRequestBody,
    getEntryReference: getMealPlanEntryReference,
    mutateEntry: async (existingMealPlanEntry, _parsedBody, response) =>
      mutateEntry(existingMealPlanEntry, response)
  });
}

function createNormalizedStoreWriteRoute<TStore, K extends RecipePreferenceResponseKey>({
  missingBodyErrorMessage,
  parseBody,
  requestBodyKey,
  store
}: {
  missingBodyErrorMessage: string;
  parseBody: (value: unknown) => RequestBodyParseResult<TStore>;
  requestBodyKey: string;
  store: PersistedRecipeDataStore<TStore, K>;
}) {
  return async ({
    request,
    response
  }: {
    request: IncomingMessage;
    response: ServerResponse;
  }) => {
    await handleNormalizedStoreWrite({
      request,
      response,
      store,
      requestBodyKey,
      parseBody,
      missingBodyErrorMessage
    });
  };
}

function createRecipeStoreMutationHandler<
  TStore,
  TParsedBody,
  K extends RecipePreferenceResponseKey
>({
  mutateStore,
  parseBody,
  store,
  suffix
}: {
  mutateStore: (storeValue: TStore, recipeId: string, parsedBody: TParsedBody) => void;
  parseBody: (value: unknown) => RequestBodyParseResult<TParsedBody>;
  store: PersistedRecipeDataStore<TStore, K>;
  suffix: RecipeStoreMutationSuffix;
}): RecipeStoreMutationHandler {
  return {
    suffix,
    handle: ({ request, requestPath, response }) =>
      handleRecipeStoreMutation({
        request,
        requestPath,
        response,
        suffix,
        store,
        parseBody,
        mutateStore
      })
  };
}

const recipeStoreMutationHandlers: RecipeStoreMutationHandler[] = [
  createRecipeStoreMutationHandler({
    suffix: '/rating',
    store: recipeRatingsStore,
    parseBody: (value) => {
      const rating = getRequestBodyField(value, 'rating');

      if (rating === null) {
        return { ok: true, value: null };
      }

      return isValidRecipeRating(rating)
        ? { ok: true, value: rating }
        : {
            ok: false,
            message: 'Expected a rating between 0.5 and 5 in 0.5 steps.'
          };
    },
    mutateStore: (recipeRatings, recipeId, rating) => {
      if (rating === null) {
        delete recipeRatings[recipeId];
        return;
      }

      recipeRatings[recipeId] = rating;
    }
  }),
  createRecipeStoreMutationHandler({
    suffix: '/servings',
    store: recipeServingsStore,
    parseBody: (value) => {
      const servings = getRequestBodyField(value, 'servings');

      return isValidRecipeServing(servings)
        ? { ok: true, value: servings }
        : {
            ok: false,
            message: 'Expected a whole-number servings value greater than 0.'
          };
    },
    mutateStore: (recipeServings, recipeId, servings) => {
      recipeServings[recipeId] = servings;
    }
  }),
  createRecipeStoreMutationHandler({
    suffix: '/note',
    store: recipeNotesStore,
    parseBody: (value) => {
      const note = getRequestBodyField(value, 'note');

      return typeof note === 'string'
        ? { ok: true, value: normalizeRecipeNoteText(note) }
        : { ok: false, message: 'Expected a note string.' };
    },
    mutateStore: (recipeNotes, recipeId, note) => {
      if (note) {
        recipeNotes[recipeId] = note;
        return;
      }

      delete recipeNotes[recipeId];
    }
  })
];

function resolveRecipeStoreMutationHandler(requestPath: string) {
  if (!requestPath.startsWith(`${recipePreferenceApiPaths.recipes}/`)) {
    return null;
  }

  return (
    recipeStoreMutationHandlers.find(({ suffix }) => requestPath.endsWith(suffix)) ?? null
  );
}

async function handleMealPlanEntryCreateRoute({
  request,
  response
}: {
  request: IncomingMessage;
  response: ServerResponse;
}) {
  const parsedBody = await readParsedRequestBodyOrSendBadRequest({
    request,
    response,
    parseBody: parseMealPlanEntryCreateRequestBody
  });

  if (parsedBody === null) {
    return;
  }

  const { date, recipeId } = parsedBody;

  if (!(await hasRecipeWithId(recipeId))) {
    sendJson(response, 404, { error: 'That recipe could not be found.' });
    return;
  }

  await queuePersistedRecipeDataMutation(async () => {
    const mealPlan = await readPersistedStore(mealPlanStore);
    appendDatedRecipeEntry(mealPlan, date, recipeId);
    await writePersistedStoreAndSend(mealPlanStore, mealPlan, response);
  });
}

async function handleCookedMealHistoryEntryCreateRoute({
  request,
  response
}: {
  request: IncomingMessage;
  response: ServerResponse;
}) {
  const parsedBody = await readParsedRequestBodyOrSendBadRequest({
    request,
    response,
    parseBody: parseCookedMealHistoryEntryCreateRequestBody
  });

  if (parsedBody === null) {
    return;
  }

  const { date, recipeId } = parsedBody;

  if (!(await hasRecipeWithId(recipeId))) {
    sendJson(response, 404, { error: 'That recipe could not be found.' });
    return;
  }

  await queuePersistedRecipeDataMutation(async () => {
    const cookedMealHistory = await readPersistedStore(cookedMealHistoryStore);
    appendDatedRecipeEntry(cookedMealHistory, date, recipeId);
    await writePersistedStoreAndSend(cookedMealHistoryStore, cookedMealHistory, response);
  });
}

const handleMealPlanEntryMoveRoute = createMealPlanEntryMutationRoute({
  parseBody: parseMealPlanEntryMoveRequestBody,
  getEntryReference: getMealPlanEntryReference,
  mutateEntry: async (
    { currentDate, entryIndex, mealPlan, recipeId },
    { nextDate },
    response
  ) => {
    if (currentDate === nextDate) {
      sendJson(response, 200, { mealPlan });
      return;
    }

    removeMealPlanEntryAt(mealPlan, currentDate, entryIndex);
    appendDatedRecipeEntry(mealPlan, nextDate, recipeId);

    await writePersistedStoreAndSend(mealPlanStore, mealPlan, response);
  }
});

const handleMealPlanEntryDeleteRoute = createMealPlanEntryReferenceMutationRoute({
  mutateEntry: async ({ currentDate, entryIndex, mealPlan }, response) => {
    removeMealPlanEntryAt(mealPlan, currentDate, entryIndex);
    await writePersistedStoreAndSend(mealPlanStore, mealPlan, response);
  }
});

const handleMealPlanEntryMarkCookedRoute = createMealPlanEntryReferenceMutationRoute({
  mutateEntry: async ({ currentDate, entryIndex, mealPlan, recipeId }, response) => {
    const cookedMealHistory = await readPersistedStore(cookedMealHistoryStore);
    const previousMealPlan = structuredClone(mealPlan);
    const previousCookedMealHistory = structuredClone(cookedMealHistory);

    removeMealPlanEntryAt(mealPlan, currentDate, entryIndex);
    appendDatedRecipeEntry(cookedMealHistory, currentDate, recipeId);

    await writePersistedStoresWithRollback([
      {
        nextValue: mealPlan,
        previousValue: previousMealPlan,
        store: mealPlanStore
      },
      {
        nextValue: cookedMealHistory,
        previousValue: previousCookedMealHistory,
        store: cookedMealHistoryStore
      }
    ]);

    sendJson(response, 200, {
      cookedMealHistory,
      mealPlan
    });
  }
});

async function handleRecipeSettingsDefaultServingSizeRoute({
  request,
  response
}: {
  request: IncomingMessage;
  response: ServerResponse;
}) {
  const parsedBody = await readParsedRequestBodyOrSendBadRequest({
    request,
    response,
    parseBody: parseDefaultServingSizeRequestBody
  });

  if (parsedBody === null) {
    return;
  }

  await queuePersistedRecipeDataMutation(async () => {
    const recipeSettings = await readPersistedStore(recipeSettingsStore);
    const { defaultServingSize } = parsedBody;

    if (defaultServingSize === null) {
      delete recipeSettings.defaultServingSize;
    } else {
      recipeSettings.defaultServingSize = defaultServingSize;
    }

    await writePersistedStoreAndSend(recipeSettingsStore, recipeSettings, response);
  });
}

const handleRecipeBookmarksRoute = createNormalizedStoreWriteRoute({
  store: recipeBookmarksStore,
  requestBodyKey: 'recipeBookmarks',
  parseBody: (value) =>
    isRecordLike(value)
      ? { ok: true, value: normalizeRecipeBookmarks(value) }
      : { ok: false, message: 'Expected a recipe bookmarks object.' },
  missingBodyErrorMessage: 'Expected a recipe bookmarks payload.'
});

const handleShoppingListChecksRoute = createNormalizedStoreWriteRoute({
  store: shoppingListChecksStore,
  requestBodyKey: 'shoppingListChecks',
  parseBody: (value) =>
    isRecordLike(value)
      ? { ok: true, value: shoppingListChecksStore.normalize(value) }
      : { ok: false, message: 'Expected a shopping list checks object.' },
  missingBodyErrorMessage: 'Expected a shopping list checks payload.'
});

const handleShoppingListCustomItemsRoute = createNormalizedStoreWriteRoute({
  store: shoppingListCustomItemsStore,
  requestBodyKey: 'shoppingListCustomItems',
  parseBody: (value) =>
    Array.isArray(value)
      ? { ok: true, value: shoppingListCustomItemsStore.normalize(value) }
      : { ok: false, message: 'Expected a custom shopping list items array.' },
  missingBodyErrorMessage: 'Expected a custom shopping list items payload.'
});

async function handleRecipeCatalogRoute({
  request,
  response
}: {
  request: IncomingMessage;
  response: ServerResponse;
}) {
  const parsedRecipe = await readParsedRequestBodyOrSendBadRequest({
    request,
    response,
    parseBody: parseRecipeCatalogUpsertRequestBody
  });

  if (parsedRecipe === null) {
    return;
  }

  await queuePersistedRecipeDataMutation(async () => {
    const recipeCatalog = await readPersistedRecipeCatalog();
    const nextRecipes = recipeCatalog.map((recipe) =>
      recipe.id === parsedRecipe.id ? parsedRecipe : recipe
    );

    if (!nextRecipes.some((recipe) => recipe.id === parsedRecipe.id)) {
      nextRecipes.push(parsedRecipe);
    }

    const nextRecipeCatalogValue = normalizeRecipeCatalog(nextRecipes);
    await writePersistedRecipeCatalog(nextRecipeCatalogValue);
    void cloudSyncManager?.scheduleSync();
    sendJson(response, 200, { recipes: nextRecipeCatalogValue });
  });
}

function createExactRecipePreferenceRouteHandler({
  method,
  path,
  handle
}: ExactRecipePreferenceRouteHandler) {
  return {
    method,
    path,
    handle
  } satisfies ExactRecipePreferenceRouteHandler;
}

const exactRecipePreferenceRouteHandlers: ExactRecipePreferenceRouteHandler[] = [
  createExactRecipePreferenceRouteHandler({
    method: 'PUT',
    path: recipePreferenceApiPaths.recipeCatalog,
    handle: handleRecipeCatalogRoute
  }),
  createExactRecipePreferenceRouteHandler({
    method: 'PUT',
    path: recipePreferenceApiPaths.cookedMealHistoryEntries,
    handle: handleCookedMealHistoryEntryCreateRoute
  }),
  createExactRecipePreferenceRouteHandler({
    method: 'PUT',
    path: recipePreferenceApiPaths.mealPlanEntries,
    handle: handleMealPlanEntryCreateRoute
  }),
  createExactRecipePreferenceRouteHandler({
    method: 'PUT',
    path: recipePreferenceApiPaths.mealPlanEntriesMove,
    handle: handleMealPlanEntryMoveRoute
  }),
  createExactRecipePreferenceRouteHandler({
    method: 'DELETE',
    path: recipePreferenceApiPaths.mealPlanEntries,
    handle: handleMealPlanEntryDeleteRoute
  }),
  createExactRecipePreferenceRouteHandler({
    method: 'PUT',
    path: recipePreferenceApiPaths.mealPlanEntriesMarkCooked,
    handle: handleMealPlanEntryMarkCookedRoute
  }),
  createExactRecipePreferenceRouteHandler({
    method: 'PUT',
    path: recipePreferenceApiPaths.recipeSettingsDefaultServingSize,
    handle: handleRecipeSettingsDefaultServingSizeRoute
  }),
  createExactRecipePreferenceRouteHandler({
    method: 'PUT',
    path: recipePreferenceApiPaths.recipeBookmarks,
    handle: handleRecipeBookmarksRoute
  }),
  createExactRecipePreferenceRouteHandler({
    method: 'PUT',
    path: recipePreferenceApiPaths.shoppingListChecks,
    handle: handleShoppingListChecksRoute
  }),
  createExactRecipePreferenceRouteHandler({
    method: 'PUT',
    path: recipePreferenceApiPaths.shoppingListCustomItems,
    handle: handleShoppingListCustomItemsRoute
  })
];

async function handleRecipePreferencesRequest(
  request: IncomingMessage,
  response: ServerResponse,
  next: NextFunction
) {
  const requestPath = request.url ? request.url.split('?')[0] : '';

  if (!isTrustedRequest(request, requestPath)) {
    sendJson(response, 403, { error: getRequestAccessErrorMessage() });
    return;
  }

  try {
    await cloudSyncManager?.ensureReady();

    if (cloudSyncManager && (await cloudSyncManager.handleRequest(request, response, next))) {
      return;
    }

    if (request.method === 'GET' && requestPath === recipePreferenceApiPaths.recipeCatalog) {
      await waitForPersistedRecipeDataMutations();
      const recipeCatalog = await readPersistedRecipeCatalog();
      sendJson(response, 200, { recipes: recipeCatalog });
      return;
    }

    const readableStore =
      request.method === 'GET' ? readableStoreByPath.get(requestPath) : undefined;

    if (readableStore) {
      await waitForPersistedRecipeDataMutations();
      const value = await readPersistedStore(readableStore);
      sendJson(response, 200, { [readableStore.responseKey]: value });
      return;
    }

    const exactRouteHandler =
      request.method === 'PUT' || request.method === 'DELETE'
        ? exactRecipePreferenceRouteHandlers.find(
            ({ method, path }) => method === request.method && path === requestPath
          )
        : undefined;

    if (exactRouteHandler) {
      await exactRouteHandler.handle({ request, response });
      return;
    }

    if (request.method === 'PUT') {
      const recipeStoreMutationHandler = resolveRecipeStoreMutationHandler(requestPath);

      if (recipeStoreMutationHandler) {
        await recipeStoreMutationHandler.handle({
          request,
          requestPath,
          response
        });
        return;
      }
    }

    next();
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      sendJson(response, 413, { error: 'Request body is too large.' });
      return;
    }

    if (error instanceof InvalidRequestBodyError) {
      sendJson(response, 400, { error: error.message });
      return;
    }

    console.error(error);
    sendJson(response, 500, { error: 'Could not update saved recipe data.' });
  }
}

export function recipePreferencesApi() {
  const install = (middlewares: MiddlewareStack) => {
    middlewares.use((request, response, next) => {
      void handleRecipePreferencesRequest(request, response, next);
    });
  };

  return {
    name: 'recipe-preferences-api',
    configureServer(server) {
      install(server.middlewares);
    },
    configurePreviewServer(server) {
      install(server.middlewares);
    }
  } satisfies Plugin;
}
