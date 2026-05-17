import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createAsyncActionQueueRef, queueAsyncAction } from '../src/helpers/asyncQueue';
import {
  cloudSyncProviderLabels,
  cloudSyncProviders,
  createDefaultCloudSyncStatus,
  createEmptyRecipeAppDataSnapshot,
  isRecipeAppDataSnapshotEmpty,
  normalizeCloudSyncBundle,
  serializeCloudSyncBundle,
  type CloudSyncBundle,
  type CloudSyncProvider,
  type CloudSyncProviderConnectionStatus,
  type CloudSyncStatus,
  type RecipeAppDataSnapshot
} from '../src/helpers/cloudSyncData';
import { getCloudSyncCallbackPath, getCloudSyncAuthorizePath } from '../src/helpers/cloudSyncRoutes';
import { getRequestOrigin } from './publicOrigin';
import {
  ensurePrivateJsonStorageFile,
  writePrivateJsonFile
} from './privateFilesystem';
import { getRequestPath } from './requestPath';
import type { IncomingMessage, ServerResponse } from 'node:http';

type CloudSyncProviderCredentials = {
  clientId: string | null;
  clientSecret: string | null;
};

type CloudSyncTokenState = {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
};

type CloudSyncConnectionState = {
  lastKnownRemoteModifiedAt: string | null;
  provider: CloudSyncProvider;
  remoteBundleId: string | null;
  remoteBundlePath: string | null;
  token: CloudSyncTokenState;
  lastSyncedAt: string | null;
};

type CloudSyncPersistedState = {
  activeConnection: CloudSyncConnectionState | null;
};

type CloudSyncManagerOptions = {
  applySnapshot: (snapshot: RecipeAppDataSnapshot) => Promise<void>;
  dataRootDir: string;
  getSnapshot: () => Promise<RecipeAppDataSnapshot>;
  onError?: (error: unknown) => void;
};

type RequestBodyParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

type ProviderAuthResponse = {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
};

const CLOUD_SYNC_STATE_FILE_NAME = 'cloud-sync.json';
const CLOUD_SYNC_BUNDLE_FILE_NAME = 'recipes-app-state.json';
const CLOUD_SYNC_POLL_INTERVAL_MS = 60_000;
const CLOUD_SYNC_SYNC_DEBOUNCE_MS = 750;

class CloudSyncError extends Error {}

function getStateFilePath(dataRootDir: string) {
  return resolve(dataRootDir, CLOUD_SYNC_STATE_FILE_NAME);
}

function getCloudSyncBundleFilePath(dataRootDir: string) {
  return resolve(dataRootDir, CLOUD_SYNC_BUNDLE_FILE_NAME);
}

function getProviderConfig(provider: CloudSyncProvider): CloudSyncProviderCredentials {
  switch (provider) {
    case 'google-drive':
      return {
        clientId: process.env.RECIPE_GOOGLE_DRIVE_CLIENT_ID ?? null,
        clientSecret: process.env.RECIPE_GOOGLE_DRIVE_CLIENT_SECRET ?? null
      };
    case 'dropbox':
      return {
        clientId: process.env.RECIPE_DROPBOX_CLIENT_ID ?? null,
        clientSecret: process.env.RECIPE_DROPBOX_CLIENT_SECRET ?? null
      };
  }
}

function isProviderConfigured(provider: CloudSyncProvider) {
  const { clientId, clientSecret } = getProviderConfig(provider);
  return Boolean(clientId && clientSecret);
}

function getEmptyProviderStatus(provider: CloudSyncProvider): CloudSyncProviderConnectionStatus {
  return {
    isConfigured: isProviderConfigured(provider),
    isConnected: false,
    lastError: null,
    lastKnownRemoteModifiedAt: null,
    lastSyncedAt: null
  };
}

function createEmptyPersistedState(): CloudSyncPersistedState {
  return {
    activeConnection: null
  };
}

function parseJsonOrNull(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeConnectionState(value: unknown): CloudSyncConnectionState | null {
  if (!isRecordLike(value)) {
    return null;
  }

  const { lastKnownRemoteModifiedAt, lastSyncedAt, provider, remoteBundleId, remoteBundlePath, token } =
    value as Partial<
      Record<
        | 'lastKnownRemoteModifiedAt'
        | 'lastSyncedAt'
        | 'provider'
        | 'remoteBundleId'
        | 'remoteBundlePath'
        | 'token',
        unknown
      >
    >;

  if (!cloudSyncProviders.includes(provider as CloudSyncProvider) || !isRecordLike(token)) {
    return null;
  }

  const { accessToken, accessTokenExpiresAt, refreshToken } = token as Partial<
    Record<'accessToken' | 'accessTokenExpiresAt' | 'refreshToken', unknown>
  >;

  if (
    typeof accessToken !== 'string' ||
    typeof accessTokenExpiresAt !== 'number' ||
    typeof refreshToken !== 'string'
  ) {
    return null;
  }

  return {
    lastKnownRemoteModifiedAt:
      typeof lastKnownRemoteModifiedAt === 'string' ? lastKnownRemoteModifiedAt : null,
    lastSyncedAt: typeof lastSyncedAt === 'string' ? lastSyncedAt : null,
    provider: provider as CloudSyncProvider,
    remoteBundleId: typeof remoteBundleId === 'string' ? remoteBundleId : null,
    remoteBundlePath: typeof remoteBundlePath === 'string' ? remoteBundlePath : null,
    token: {
      accessToken,
      accessTokenExpiresAt,
      refreshToken
    }
  };
}

function normalizePersistedState(value: unknown): CloudSyncPersistedState {
  if (!isRecordLike(value)) {
    return createEmptyPersistedState();
  }

  return {
    activeConnection: normalizeConnectionState(value.activeConnection)
  };
}

function isErrorLike(value: unknown): value is { message?: string } {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(value: unknown, fallbackMessage: string) {
  if (typeof value === 'string') {
    return value;
  }

  if (isErrorLike(value) && typeof value.message === 'string') {
    return value.message;
  }

  if (isRecordLike(value)) {
    const errorDescription = value.error_description;
    const error = value.error;

    if (typeof errorDescription === 'string') {
      return typeof error === 'string'
        ? `${error}: ${errorDescription}`
        : errorDescription;
    }

    if (typeof error === 'string') {
      return error;
    }
  }

  return fallbackMessage;
}

function formatJsonResponseBody(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readRequestBody(request: IncomingMessage) {
  let requestBodyText = '';

  for await (const chunk of request) {
    requestBodyText += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  }

  if (!requestBodyText) {
    return null;
  }

  return parseJsonOrNull(requestBodyText);
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

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(formatJsonResponseBody(payload));
}

function sendHtml(response: ServerResponse, statusCode: number, html: string) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(html);
}

async function readJsonFile<T>(filePath: string, fallbackValue: T) {
  await ensurePrivateJsonStorageFile(filePath);

  try {
    return parseJsonOrNull(await fs.readFile(filePath, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallbackValue;
    }

    throw error;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await writePrivateJsonFile(filePath, value);
}

async function getFetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        parseJsonOrNull(responseText),
        `Cloud provider request failed with status ${response.status}.`
      )
    );
  }

  return responseText ? parseJsonOrNull(responseText) : null;
}

async function postFormEncodedJson(
  url: string,
  body: Record<string, string | null | undefined>
) {
  const formBody = new URLSearchParams();

  Object.entries(body).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formBody.set(key, value);
    }
  });

  return (await getFetchJson(url, {
    body: formBody,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    method: 'POST'
  })) as Record<string, unknown>;
}

function getRedirectUri(request: IncomingMessage, provider: CloudSyncProvider) {
  return new URL(getCloudSyncCallbackPath(provider), getRequestOrigin(request)).toString();
}

function createCloudSyncAuthorizeUrl({
  provider,
  redirectUri,
  state
}: {
  provider: CloudSyncProvider;
  redirectUri: string;
  state: string;
}) {
  const { clientId } = getProviderConfig(provider);

  if (!clientId) {
    throw new CloudSyncError(`${cloudSyncProviderLabels[provider]} sync is not configured.`);
  }

  if (provider === 'google-drive') {
    const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.appdata');
    authorizeUrl.searchParams.set('access_type', 'offline');
    authorizeUrl.searchParams.set('prompt', 'consent');
    authorizeUrl.searchParams.set('state', state);
    return authorizeUrl.toString();
  }

  const authorizeUrl = new URL('https://www.dropbox.com/oauth2/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set(
    'scope',
    [
      'files.content.read',
      'files.content.write',
      'files.metadata.read'
    ].join(' ')
  );
  authorizeUrl.searchParams.set('token_access_type', 'offline');
  authorizeUrl.searchParams.set('state', state);
  return authorizeUrl.toString();
}

async function exchangeAuthorizationCode({
  code,
  provider,
  redirectUri
}: {
  code: string;
  provider: CloudSyncProvider;
  redirectUri: string;
}): Promise<ProviderAuthResponse> {
  const { clientId, clientSecret } = getProviderConfig(provider);

  if (!clientId || !clientSecret) {
    throw new CloudSyncError(`${cloudSyncProviderLabels[provider]} sync is not configured.`);
  }

  const endpoint =
    provider === 'google-drive'
      ? 'https://oauth2.googleapis.com/token'
      : 'https://api.dropboxapi.com/oauth2/token';

  const parsedResponse = await postFormEncodedJson(endpoint, {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  });

  const accessToken = parsedResponse.access_token;
  const refreshToken = parsedResponse.refresh_token;
  const expiresIn = parsedResponse.expires_in;

  if (
    typeof accessToken !== 'string' ||
    typeof refreshToken !== 'string' ||
    typeof expiresIn !== 'number'
  ) {
    throw new CloudSyncError(
      `Could not finish connecting to ${cloudSyncProviderLabels[provider]}.`
    );
  }

  return {
    accessToken,
    accessTokenExpiresAt: Date.now() + expiresIn * 1000,
    refreshToken
  };
}

async function refreshAccessToken({
  provider,
  refreshToken
}: {
  provider: CloudSyncProvider;
  refreshToken: string;
}) {
  const { clientId, clientSecret } = getProviderConfig(provider);

  if (!clientId || !clientSecret) {
    throw new CloudSyncError(`${cloudSyncProviderLabels[provider]} sync is not configured.`);
  }

  const endpoint =
    provider === 'google-drive'
      ? 'https://oauth2.googleapis.com/token'
      : 'https://api.dropboxapi.com/oauth2/token';

  const parsedResponse = await postFormEncodedJson(endpoint, {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  const accessToken = parsedResponse.access_token;
  const expiresIn = parsedResponse.expires_in;

  if (typeof accessToken !== 'string' || typeof expiresIn !== 'number') {
    throw new CloudSyncError(
      `Could not refresh ${cloudSyncProviderLabels[provider]} credentials.`
    );
  }

  return {
    accessToken,
    accessTokenExpiresAt: Date.now() + expiresIn * 1000
  };
}

async function getGoogleRemoteFileMetadata(accessToken: string, fileId: string) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,modifiedTime,trashed`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new CloudSyncError('Could not read Google Drive sync metadata.');
  }

  const parsedResponse = (await response.json()) as Partial<Record<'id' | 'modifiedTime' | 'trashed', unknown>>;

  if (
    typeof parsedResponse.id !== 'string' ||
    typeof parsedResponse.modifiedTime !== 'string' ||
    parsedResponse.trashed === true
  ) {
    return null;
  }

  return {
    fileId: parsedResponse.id,
    modifiedAt: parsedResponse.modifiedTime
  };
}

async function findGoogleRemoteFileId(accessToken: string) {
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D%27recipes-app-state.json%27%20and%20trashed%3Dfalse&fields=files(id%2CmodifiedTime%2Cname)',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new CloudSyncError('Could not find Google Drive sync file.');
  }

  const parsedResponse = (await response.json()) as Partial<{
    files: Array<Partial<Record<'id' | 'modifiedTime' | 'name', unknown>>>;
  }>;
  const remoteFile = parsedResponse.files?.[0];

  if (
    !remoteFile ||
    typeof remoteFile.id !== 'string' ||
    typeof remoteFile.modifiedTime !== 'string'
  ) {
    return null;
  }

  return {
    fileId: remoteFile.id,
    modifiedAt: remoteFile.modifiedTime
  };
}

async function createGoogleRemoteFile(accessToken: string, bundle: CloudSyncBundle) {
  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,modifiedTime,name', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    method: 'POST',
    body: JSON.stringify({
      mimeType: 'application/json',
      name: CLOUD_SYNC_BUNDLE_FILE_NAME,
      parents: ['appDataFolder']
    })
  });

  if (!response.ok) {
    throw new CloudSyncError('Could not create Google Drive sync file.');
  }

  const parsedResponse = (await response.json()) as Partial<Record<'id' | 'modifiedTime', unknown>>;

  if (typeof parsedResponse.id !== 'string') {
    throw new CloudSyncError('Could not create Google Drive sync file.');
  }

  const uploadResponse = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(parsedResponse.id)}?uploadType=media&fields=id,modifiedTime,name`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      method: 'PATCH',
      body: JSON.stringify(bundle)
    }
  );

  if (!uploadResponse.ok) {
    throw new CloudSyncError('Could not upload Google Drive sync data.');
  }

  const uploadedBundle = (await uploadResponse.json()) as Partial<Record<'id' | 'modifiedTime', unknown>>;

  return {
    fileId: typeof uploadedBundle.id === 'string' ? uploadedBundle.id : parsedResponse.id,
    modifiedAt:
      typeof uploadedBundle.modifiedTime === 'string'
        ? uploadedBundle.modifiedTime
        : typeof parsedResponse.modifiedTime === 'string'
          ? parsedResponse.modifiedTime
          : new Date().toISOString()
  };
}

async function uploadGoogleBundle({
  accessToken,
  bundle,
  remoteBundleId
}: {
  accessToken: string;
  bundle: CloudSyncBundle;
  remoteBundleId: string | null;
}) {
  if (!remoteBundleId) {
    return createGoogleRemoteFile(accessToken, bundle);
  }

  const uploadResponse = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(remoteBundleId)}?uploadType=media&fields=id,modifiedTime,name`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      method: 'PATCH',
      body: JSON.stringify(bundle)
    }
  );

  if (!uploadResponse.ok) {
    if (uploadResponse.status === 404) {
      return createGoogleRemoteFile(accessToken, bundle);
    }

    throw new CloudSyncError('Could not upload Google Drive sync data.');
  }

  const uploadedBundle = (await uploadResponse.json()) as Partial<Record<'id' | 'modifiedTime', unknown>>;

  return {
    fileId:
      typeof uploadedBundle.id === 'string'
        ? uploadedBundle.id
        : remoteBundleId,
    modifiedAt:
      typeof uploadedBundle.modifiedTime === 'string'
        ? uploadedBundle.modifiedTime
        : new Date().toISOString()
  };
}

async function downloadGoogleBundle({
  accessToken,
  fileId
}: {
  accessToken: string;
  fileId: string;
}) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new CloudSyncError('Could not download Google Drive sync data.');
  }

  return normalizeCloudSyncBundle(await response.json());
}

async function getDropboxRemoteFileMetadata(accessToken: string, remoteBundlePath: string) {
  const response = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      path: remoteBundlePath
    })
  });

  if (response.status === 409 || response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new CloudSyncError('Could not read Dropbox sync metadata.');
  }

  const parsedResponse = (await response.json()) as Partial<Record<'server_modified' | 'path_lower', unknown>>;

  if (typeof parsedResponse.server_modified !== 'string') {
    return null;
  }

  return {
    modifiedAt: parsedResponse.server_modified
  };
}

async function downloadDropboxBundle({
  accessToken,
  remoteBundlePath
}: {
  accessToken: string;
  remoteBundlePath: string;
}) {
  const response = await fetch('https://content.dropboxapi.com/2/files/download', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({
        path: remoteBundlePath
      })
    },
    method: 'POST'
  });

  if (response.status === 409 || response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new CloudSyncError('Could not download Dropbox sync data.');
  }

  return normalizeCloudSyncBundle(await response.json());
}

async function uploadDropboxBundle({
  accessToken,
  bundle,
  remoteBundlePath
}: {
  accessToken: string;
  bundle: CloudSyncBundle;
  remoteBundlePath: string;
}) {
  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        autorename: false,
        mode: 'overwrite',
        mute: true,
        path: remoteBundlePath
      })
    },
    method: 'POST',
    body: JSON.stringify(bundle)
  });

  if (!response.ok) {
    throw new CloudSyncError('Could not upload Dropbox sync data.');
  }

  const parsedResponse = (await response.json()) as Partial<Record<'server_modified', unknown>>;

  if (typeof parsedResponse.server_modified !== 'string') {
    throw new CloudSyncError('Could not upload Dropbox sync data.');
  }

  return {
    modifiedAt: parsedResponse.server_modified
  };
}

function getRemoteBundlePath(provider: CloudSyncProvider) {
  if (provider === 'dropbox') {
    return `/${CLOUD_SYNC_BUNDLE_FILE_NAME}`;
  }

  return null;
}

class CloudProviderAdapter {
  constructor(
    readonly provider: CloudSyncProvider,
    private readonly options: CloudSyncManagerOptions,
    private readonly persistState: () => Promise<void>
  ) {}

  get label() {
    return cloudSyncProviderLabels[this.provider];
  }

  get isConfigured() {
    return isProviderConfigured(this.provider);
  }

  async ensureRemoteMetadata(connection: CloudSyncConnectionState) {
    if (this.provider === 'google-drive') {
      const accessToken = await this.getValidAccessToken(connection);
      const remoteBundleId =
        connection.remoteBundleId ??
        (await findGoogleRemoteFileId(accessToken))?.fileId ??
        null;

      if (!remoteBundleId) {
        return null;
      }

      const metadata = await getGoogleRemoteFileMetadata(accessToken, remoteBundleId);

      if (!metadata) {
        return null;
      }

      return {
        modifiedAt: metadata.modifiedAt,
        remoteBundleId: metadata.fileId
      };
    }

    const accessToken = await this.getValidAccessToken(connection);
    const remoteBundlePath = connection.remoteBundlePath ?? getRemoteBundlePath(this.provider);

    if (!remoteBundlePath) {
      return null;
    }

    const metadata = await getDropboxRemoteFileMetadata(accessToken, remoteBundlePath);

    if (!metadata) {
      return null;
    }

    return {
      modifiedAt: metadata.modifiedAt,
      remoteBundlePath
    };
  }

  async getValidAccessToken(connection: CloudSyncConnectionState) {
    if (Date.now() < connection.token.accessTokenExpiresAt - 60_000) {
      return connection.token.accessToken;
    }

    const refreshedToken = await refreshAccessToken({
      provider: this.provider,
      refreshToken: connection.token.refreshToken
    });

    connection.token.accessToken = refreshedToken.accessToken;
    connection.token.accessTokenExpiresAt = refreshedToken.accessTokenExpiresAt;
    await this.persistState();
    return refreshedToken.accessToken;
  }

  async createOrUpdateRemoteBundle({
    bundle,
    connection
  }: {
    bundle: CloudSyncBundle;
    connection: CloudSyncConnectionState;
  }) {
    const accessToken = await this.getValidAccessToken(connection);

    if (this.provider === 'google-drive') {
      const nextRemoteBundle = await uploadGoogleBundle({
        accessToken,
        bundle,
        remoteBundleId: connection.remoteBundleId
      });

      connection.remoteBundleId = nextRemoteBundle.fileId;
      connection.lastKnownRemoteModifiedAt = nextRemoteBundle.modifiedAt;
      return nextRemoteBundle.modifiedAt;
    }

    const remoteBundlePath = connection.remoteBundlePath ?? getRemoteBundlePath(this.provider);

    if (!remoteBundlePath) {
      throw new CloudSyncError('Could not resolve Dropbox sync path.');
    }

    const nextRemoteBundle = await uploadDropboxBundle({
      accessToken,
      bundle,
      remoteBundlePath
    });

    connection.remoteBundlePath = remoteBundlePath;
    connection.lastKnownRemoteModifiedAt = nextRemoteBundle.modifiedAt;
    return nextRemoteBundle.modifiedAt;
  }

  async downloadRemoteBundle({
    connection
  }: {
    connection: CloudSyncConnectionState;
  }) {
    const accessToken = await this.getValidAccessToken(connection);

    if (this.provider === 'google-drive') {
      const remoteBundleId =
        connection.remoteBundleId ??
        (await findGoogleRemoteFileId(accessToken))?.fileId ??
        null;

      if (!remoteBundleId) {
        return null;
      }

      const nextBundle = await downloadGoogleBundle({
        accessToken,
        fileId: remoteBundleId
      });

      if (!nextBundle) {
        return null;
      }

      connection.remoteBundleId = remoteBundleId;
      return nextBundle;
    }

    const remoteBundlePath = connection.remoteBundlePath ?? getRemoteBundlePath(this.provider);

    if (!remoteBundlePath) {
      return null;
    }

    const nextBundle = await downloadDropboxBundle({
      accessToken,
      remoteBundlePath
    });

    if (!nextBundle) {
      return null;
    }

    connection.remoteBundlePath = remoteBundlePath;
    return nextBundle;
  }
}

export type CloudSyncManager = ReturnType<typeof createCloudSyncManager>;

export function createCloudSyncManager(options: CloudSyncManagerOptions) {
  const stateFilePath = getStateFilePath(options.dataRootDir);
  const remoteBundleFilePath = getCloudSyncBundleFilePath(options.dataRootDir);
  const queueRef = createAsyncActionQueueRef();
  let saveState = async () => undefined;
  const providerAdapters = new Map<CloudSyncProvider, CloudProviderAdapter>(
    cloudSyncProviders.map((provider) => [
      provider,
      new CloudProviderAdapter(provider, options, () => saveState())
    ])
  );

  let readyPromise: Promise<void> | null = null;
  let isReady = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let syncTimer: ReturnType<typeof setTimeout> | null = null;
  let syncSuppressionCount = 0;
  let isSyncInFlight = false;
  let persistedState: CloudSyncPersistedState = createEmptyPersistedState();
  let lastErrorByProvider: Record<CloudSyncProvider, string | null> = {
    'google-drive': null,
    dropbox: null
  };
  let status = createDefaultCloudSyncStatus();

  function getActiveConnection() {
    return persistedState.activeConnection;
  }

  function getActiveProvider() {
    return persistedState.activeConnection?.provider ?? null;
  }

  function getProviderStatus(provider: CloudSyncProvider): CloudSyncProviderConnectionStatus {
    const adapter = providerAdapters.get(provider);
    const isConfigured = adapter?.isConfigured ?? false;
    const isConnected = persistedState.activeConnection?.provider === provider && Boolean(persistedState.activeConnection);

    return {
      isConfigured,
      isConnected,
      lastError: lastErrorByProvider[provider],
      lastKnownRemoteModifiedAt:
        persistedState.activeConnection?.provider === provider
          ? persistedState.activeConnection.lastKnownRemoteModifiedAt
          : null,
      lastSyncedAt:
        persistedState.activeConnection?.provider === provider
          ? persistedState.activeConnection.lastSyncedAt
          : null
    };
  }

  function refreshStatus() {
    status = {
      activeProvider: getActiveProvider(),
      isSyncing: syncSuppressionCount > 0 || isSyncInFlight || Boolean(syncTimer),
      providers: {
        'google-drive': getProviderStatus('google-drive'),
        dropbox: getProviderStatus('dropbox')
      }
    };
  }

  saveState = async () => {
    await writeJsonFile(stateFilePath, persistedState);
    refreshStatus();
  };

  async function loadState() {
    const loadedState = normalizePersistedState(await readJsonFile(stateFilePath, null));
    persistedState = loadedState;
    refreshStatus();
  }

  async function readLocalBundleFile() {
    return normalizeCloudSyncBundle(await readJsonFile(remoteBundleFilePath, createEmptyRecipeAppDataSnapshot()));
  }

  async function writeLocalBundleFile(snapshot: RecipeAppDataSnapshot) {
    await writeJsonFile(remoteBundleFilePath, serializeCloudSyncBundle(snapshot));
  }

  async function applySnapshotToLocal(snapshot: RecipeAppDataSnapshot) {
    syncSuppressionCount += 1;

    try {
      await options.applySnapshot(snapshot);
      await writeLocalBundleFile(snapshot);
    } finally {
      syncSuppressionCount = Math.max(0, syncSuppressionCount - 1);
      refreshStatus();
    }
  }

  async function getLocalSnapshot() {
    const bundleSnapshot = await options.getSnapshot();
    await writeLocalBundleFile(bundleSnapshot);
    return bundleSnapshot;
  }

  async function readCurrentBundleSnapshot() {
    return readLocalBundleFile();
  }

  async function getConnectionOrThrow() {
    const connection = getActiveConnection();

    if (!connection) {
      throw new CloudSyncError('Cloud sync is not connected.');
    }

    const adapter = providerAdapters.get(connection.provider);

    if (!adapter) {
      throw new CloudSyncError('Cloud sync is not configured.');
    }

    return { adapter, connection };
  }

  async function syncLocalBundleToRemote() {
    const { adapter, connection } = await getConnectionOrThrow();

    isSyncInFlight = true;

    try {
      const localBundle = serializeCloudSyncBundle(await getLocalSnapshot());
      const modifiedAt = await adapter.createOrUpdateRemoteBundle({
        bundle: localBundle,
        connection
      });

      connection.lastKnownRemoteModifiedAt = modifiedAt;
      connection.lastSyncedAt = new Date().toISOString();
      persistedState.activeConnection = connection;
      await saveState();
    } finally {
      isSyncInFlight = false;
      refreshStatus();
    }
  }

  async function pullRemoteBundleIfNewer() {
    const { adapter, connection } = await getConnectionOrThrow();
    isSyncInFlight = true;

    try {
      const remoteMetadata = await adapter.ensureRemoteMetadata(connection);

      if (!remoteMetadata?.modifiedAt) {
        return false;
      }

      const knownRemoteModifiedAt = connection.lastKnownRemoteModifiedAt;

      if (knownRemoteModifiedAt && remoteMetadata.modifiedAt <= knownRemoteModifiedAt) {
        return false;
      }

      const remoteBundle = await adapter.downloadRemoteBundle({ connection });

      if (!remoteBundle) {
        return false;
      }

      await applySnapshotToLocal(remoteBundle);
      connection.lastKnownRemoteModifiedAt = remoteMetadata.modifiedAt;
      connection.lastSyncedAt = new Date().toISOString();
      persistedState.activeConnection = connection;
      await saveState();
      return true;
    } finally {
      isSyncInFlight = false;
      refreshStatus();
    }
  }

  async function resetLocalBundleFromRemote() {
    const { adapter, connection } = await getConnectionOrThrow();

    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }

    isSyncInFlight = true;

    try {
      const remoteMetadata = await adapter.ensureRemoteMetadata(connection);

      if (!remoteMetadata?.modifiedAt) {
        throw new CloudSyncError('No cloud sync data was found to restore.');
      }

      const remoteBundle = await adapter.downloadRemoteBundle({ connection });

      if (!remoteBundle) {
        throw new CloudSyncError('Could not download cloud sync data.');
      }

      await applySnapshotToLocal(remoteBundle);
      connection.lastKnownRemoteModifiedAt = remoteMetadata.modifiedAt;
      connection.lastSyncedAt = new Date().toISOString();
      persistedState.activeConnection = connection;
      await saveState();
    } finally {
      isSyncInFlight = false;
      refreshStatus();
    }
  }

  async function connectProvider({
    provider,
    code,
    redirectUri
  }: {
    code: string;
    provider: CloudSyncProvider;
    redirectUri: string;
  }) {
    const adapter = providerAdapters.get(provider);

    if (!adapter || !adapter.isConfigured) {
      throw new CloudSyncError(`${cloudSyncProviderLabels[provider]} sync is not configured.`);
    }

    const token = await exchangeAuthorizationCode({ code, provider, redirectUri });
    const connection: CloudSyncConnectionState = {
      lastKnownRemoteModifiedAt: null,
      lastSyncedAt: null,
      provider,
      remoteBundleId: null,
      remoteBundlePath: provider === 'dropbox' ? getRemoteBundlePath(provider) : null,
      token
    };

    persistedState.activeConnection = connection;
    refreshStatus();
    await saveState();

    const localSnapshot = await options.getSnapshot();
    const remoteMetadata = await adapter.ensureRemoteMetadata(connection);
    const shouldPullRemote = Boolean(
      remoteMetadata &&
        isRecipeAppDataSnapshotEmpty(localSnapshot) &&
        remoteMetadata.modifiedAt
    );

    if (shouldPullRemote) {
      const remoteBundle = await adapter.downloadRemoteBundle({ connection });

      if (remoteBundle) {
        await applySnapshotToLocal(remoteBundle);
        connection.lastKnownRemoteModifiedAt = remoteMetadata.modifiedAt;
      }
    } else {
      const nextModifiedAt = await adapter.createOrUpdateRemoteBundle({
        bundle: serializeCloudSyncBundle(localSnapshot),
        connection
      });

      connection.lastKnownRemoteModifiedAt = nextModifiedAt;
    }

    connection.lastSyncedAt = new Date().toISOString();
    persistedState.activeConnection = connection;
    refreshStatus();
    await saveState();
    await ensurePollTimer();
    return connection;
  }

  async function disconnectProvider() {
    persistedState = createEmptyPersistedState();
    lastErrorByProvider = {
      'google-drive': null,
      dropbox: null
    };
    refreshStatus();
    await saveState();
    stopPollTimer();
  }

  function stopPollTimer() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
  }

  async function ensurePollTimer() {
    if (pollTimer || !getActiveConnection()) {
      return;
    }

    pollTimer = setInterval(() => {
      void queueAsyncAction(queueRef, async () => {
        if (!getActiveConnection()) {
          return;
        }

        try {
          await pullRemoteBundleIfNewer();
        } catch (error) {
          const message = getErrorMessage(error, 'Could not refresh cloud sync.');
          if (persistedState.activeConnection) {
            lastErrorByProvider[persistedState.activeConnection.provider] = message;
            refreshStatus();
          }

          options.onError?.(error);
        }
      });
    }, CLOUD_SYNC_POLL_INTERVAL_MS);
  }

  async function initialize() {
    if (readyPromise) {
      return readyPromise;
    }

    readyPromise = (async () => {
      await loadState();

      if (getActiveConnection()) {
        await ensurePollTimer();

        try {
          await pullRemoteBundleIfNewer();
        } catch (error) {
          options.onError?.(error);
        }
      }

      isReady = true;
      refreshStatus();
    })();

    return readyPromise;
  }

  async function ensureReady() {
    if (isReady) {
      return;
    }

    await initialize();
  }

  type PendingAuthorizeState = {
    provider: CloudSyncProvider;
    redirectUri: string;
    stateToken: string;
  };
  const pendingAuthorizeStates = new Map<string, PendingAuthorizeState>();

  async function handleAuthorizeRoute({
    provider,
    request,
    response
  }: {
    provider: CloudSyncProvider;
    request: IncomingMessage;
    response: ServerResponse;
  }) {
    const state = randomUUID();
    const redirectUri = getRedirectUri(request, provider);
    const authorizeUrl = createCloudSyncAuthorizeUrl({
      provider,
      redirectUri,
      state
    });

    pendingAuthorizeStates.set(state, {
      provider,
      redirectUri,
      stateToken: state
    });

    response.statusCode = 302;
    response.setHeader('Location', authorizeUrl);
    response.end();
  }

  function getCallbackCloseHtml({
    message,
    provider
  }: {
    message: string;
    provider?: CloudSyncProvider;
  }) {
    const safeMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return `<!doctype html><html><head><meta charset="utf-8" /><title>Cloud sync</title></head><body style="font-family: system-ui, sans-serif; padding: 24px; line-height: 1.5;">
      <p>${safeMessage}</p>
      <script>
        try {
          window.opener && window.opener.postMessage(${JSON.stringify({
            provider,
            type: 'recipes-cloud-sync-complete'
          })}, window.location.origin);
        } catch (error) {}
        setTimeout(() => window.close(), 150);
      </script>
    </body></html>`;
  }

  async function handleCallbackRoute({
    provider,
    request,
    response
  }: {
    provider: CloudSyncProvider;
    request: IncomingMessage;
    response: ServerResponse;
  }) {
    const requestUrl = new URL(request.url ?? '', getRequestOrigin(request));
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');

    if (!code || !state) {
      sendHtml(response, 400, getCallbackCloseHtml({ message: 'Missing cloud sync authorization data.' }));
      return;
    }

    const pendingState = pendingAuthorizeStates.get(state);

    if (!pendingState || pendingState.provider !== provider) {
      sendHtml(response, 400, getCallbackCloseHtml({ message: 'Cloud sync authorization expired.' }));
      return;
    }

    pendingAuthorizeStates.delete(state);

    try {
      await connectProvider({
        code,
        provider,
        redirectUri: pendingState.redirectUri
      });

      sendHtml(
        response,
        200,
        getCallbackCloseHtml({
          message: `Connected ${cloudSyncProviderLabels[provider]} sync.`,
          provider
        })
      );
    } catch (error) {
      const message = getErrorMessage(error, `Could not connect ${cloudSyncProviderLabels[provider]} sync.`);
      lastErrorByProvider[provider] = message;
      refreshStatus();
      options.onError?.(error);
      sendHtml(response, 500, getCallbackCloseHtml({ message }));
    }
  }

  async function handleDisconnectRoute(response: ServerResponse) {
    await disconnectProvider();
    sendJson(response, 200, { cloudSync: await getStatus() });
  }

  async function handleSyncRoute(response: ServerResponse) {
    try {
      const didPullRemote = await pullRemoteBundleIfNewer();

      if (!didPullRemote) {
        await syncLocalBundleToRemote();
      }

      sendJson(response, 200, { cloudSync: await getStatus() });
    } catch (error) {
      const message = getErrorMessage(error, 'Could not sync cloud data.');
      if (persistedState.activeConnection) {
        lastErrorByProvider[persistedState.activeConnection.provider] = message;
        refreshStatus();
      }
      options.onError?.(error);
      sendJson(response, 500, { error: message });
    }
  }

  async function handleResetLocalRoute(response: ServerResponse) {
    try {
      await resetLocalBundleFromRemote();
      sendJson(response, 200, { cloudSync: await getStatus() });
    } catch (error) {
      const message = getErrorMessage(error, 'Could not reset local data from cloud.');
      if (persistedState.activeConnection) {
        lastErrorByProvider[persistedState.activeConnection.provider] = message;
        refreshStatus();
      }
      options.onError?.(error);
      sendJson(response, 500, { error: message });
    }
  }

  async function getStatus() {
    refreshStatus();
    return status;
  }

  async function scheduleSync() {
    if (syncSuppressionCount > 0 || !getActiveConnection()) {
      return;
    }

    if (syncTimer) {
      clearTimeout(syncTimer);
    }

    syncTimer = setTimeout(() => {
      syncTimer = null;
      void queueAsyncAction(queueRef, async () => {
        if (!getActiveConnection()) {
          return;
        }

        try {
          await syncLocalBundleToRemote();
        } catch (error) {
          const message = getErrorMessage(error, 'Could not sync cloud data.');
          if (persistedState.activeConnection) {
            lastErrorByProvider[persistedState.activeConnection.provider] = message;
            refreshStatus();
          }

          options.onError?.(error);
        }
      });
    }, CLOUD_SYNC_SYNC_DEBOUNCE_MS);
  }

  async function withSyncSuppressed<T>(action: () => Promise<T>) {
    syncSuppressionCount += 1;

    try {
      return await action();
    } finally {
      syncSuppressionCount = Math.max(0, syncSuppressionCount - 1);
      refreshStatus();
    }
  }

  async function handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
    next: (error?: Error) => void
  ): Promise<boolean> {
    const requestPath = getRequestPath(request);

    if (request.method === 'GET' && requestPath === '/api/cloud-sync') {
      sendJson(response, 200, { cloudSync: await getStatus() });
      return true;
    }

    if (request.method === 'POST' && requestPath === '/api/cloud-sync/disconnect') {
      await handleDisconnectRoute(response);
      return true;
    }

    if (request.method === 'POST' && requestPath === '/api/cloud-sync/sync') {
      await handleSyncRoute(response);
      return true;
    }

    if (request.method === 'POST' && requestPath === '/api/cloud-sync/reset-local') {
      await handleResetLocalRoute(response);
      return true;
    }

    const authorizeMatch = requestPath.match(/^\/api\/cloud-sync\/(google-drive|dropbox)\/authorize$/);
    if (request.method === 'GET' && authorizeMatch) {
      await handleAuthorizeRoute({
        provider: authorizeMatch[1] as CloudSyncProvider,
        request,
        response
      });
      return true;
    }

    const callbackMatch = requestPath.match(/^\/api\/cloud-sync\/(google-drive|dropbox)\/callback$/);
    if (request.method === 'GET' && callbackMatch) {
      await handleCallbackRoute({
        provider: callbackMatch[1] as CloudSyncProvider,
        request,
        response
      });
      return true;
    }

    return false;
  }

  return {
    ensureReady,
    getStatus,
    handleRequest,
    initialize,
    scheduleSync,
    stopPollTimer,
    withSyncSuppressed
  };
}
