import { useEffect, useRef, useState } from 'react';
import {
  cloudSyncProviderLabels,
  cloudSyncProviders,
  createDefaultCloudSyncStatus,
  type CloudSyncProvider,
  type CloudSyncStatus
} from '../helpers/cloudSyncData';
import {
  cloudSyncApiPaths,
  getCloudSyncAuthorizePath
} from '../helpers/cloudSyncRoutes';

const CLOUD_SYNC_STATUS_POLL_INTERVAL_MS = 30_000;
const CLOUD_SYNC_CONNECT_POLL_INTERVAL_MS = 1_000;
const CLOUD_SYNC_POPUP_FEATURES =
  'popup=yes,width=560,height=760,menubar=no,toolbar=no,location=yes,status=yes';
export const CLOUD_SYNC_APP_DATA_REFRESH_EVENT = 'recipes-cloud-sync-app-data-refresh';
export type CloudSyncAppDataRefreshEventDetail = {
  shouldForceRefresh?: boolean;
};
type CloudSyncPendingAction = 'reset-local' | 'sync' | null;

function dispatchCloudSyncAppDataRefresh(detail?: CloudSyncAppDataRefreshEventDetail) {
  window.dispatchEvent(
    new CustomEvent<CloudSyncAppDataRefreshEventDetail>(
      CLOUD_SYNC_APP_DATA_REFRESH_EVENT,
      {
        detail
      }
    )
  );
}

function normalizeCloudSyncStatus(value: unknown): CloudSyncStatus {
  if (!value || typeof value !== 'object') {
    return createDefaultCloudSyncStatus();
  }

  const parsedValue = value as Partial<CloudSyncStatus>;
  const providerStatus = (parsedValue.providers ?? {}) as Partial<CloudSyncStatus['providers']>;

  return {
    activeProvider:
      parsedValue.activeProvider && cloudSyncProviders.includes(parsedValue.activeProvider)
        ? parsedValue.activeProvider
        : null,
    isSyncing: Boolean(parsedValue.isSyncing),
    providers: {
      'google-drive': {
        ...createDefaultCloudSyncStatus().providers['google-drive'],
        ...(providerStatus['google-drive'] ?? {})
      },
      dropbox: {
        ...createDefaultCloudSyncStatus().providers.dropbox,
        ...(providerStatus.dropbox ?? {})
      }
    }
  };
}

async function fetchCloudSyncStatus() {
  const response = await fetch(cloudSyncApiPaths.status);

  if (!response.ok) {
    throw new Error('Could not load cloud sync status.');
  }

  const parsedResponse = (await response.json()) as unknown;

  if (
    parsedResponse &&
    typeof parsedResponse === 'object' &&
    'cloudSync' in parsedResponse
  ) {
    return normalizeCloudSyncStatus(
      (parsedResponse as { cloudSync?: unknown }).cloudSync
    );
  }

  return normalizeCloudSyncStatus(parsedResponse);
}

async function readCloudSyncError(response: Response, fallbackMessage: string) {
  try {
    const parsedResponse = (await response.json()) as unknown;

    if (
      parsedResponse &&
      typeof parsedResponse === 'object' &&
      'error' in parsedResponse &&
      typeof (parsedResponse as { error?: unknown }).error === 'string'
    ) {
      return (parsedResponse as { error: string }).error;
    }
  } catch (error) {
    console.error(error);
  }

  return fallbackMessage;
}

export function useCloudSyncStatus() {
  const [status, setStatus] = useState<CloudSyncStatus>(createDefaultCloudSyncStatus());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionPending, setIsActionPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<CloudSyncPendingAction>(null);
  const [pendingProvider, setPendingProvider] = useState<CloudSyncProvider | null>(null);
  const pendingPopupRef = useRef<Window | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadStatus() {
      try {
        const nextStatus = await fetchCloudSyncStatus();

        if (!isCurrent) {
          return;
        }

        setStatus(nextStatus);
        setError(null);
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        console.error(error);
        setError('Could not load cloud sync status.');
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadStatus();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!status.activeProvider) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void refreshStatus();
    }, CLOUD_SYNC_STATUS_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [status.activeProvider]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearInterval(refreshTimerRef.current);
      }

      pendingPopupRef.current?.close();
    };
  }, []);

  async function refreshStatus() {
    try {
      const nextStatus = await fetchCloudSyncStatus();
      setStatus(nextStatus);
      setError(null);
      return nextStatus;
    } catch (error) {
      console.error(error);
      setError('Could not load cloud sync status.');
      return status;
    }
  }

  async function waitForConnection(provider: CloudSyncProvider) {
    const popupWindow = pendingPopupRef.current;

    if (!popupWindow) {
      return false;
    }

    return await new Promise<boolean>((resolve) => {
      refreshTimerRef.current = window.setInterval(async () => {
        if (popupWindow.closed) {
          if (refreshTimerRef.current !== null) {
            window.clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
          }

          setPendingProvider(null);
          const nextStatus = await refreshStatus();
          resolve(nextStatus.activeProvider === provider && nextStatus.providers[provider].isConnected);
          return;
        }

        const nextStatus = await refreshStatus();

        if (nextStatus.activeProvider === provider && nextStatus.providers[provider].isConnected) {
          if (refreshTimerRef.current !== null) {
            window.clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
          }

          popupWindow.close();
          setPendingProvider(null);
          resolve(true);
        }
      }, CLOUD_SYNC_CONNECT_POLL_INTERVAL_MS);
    });
  }

  async function connect(provider: CloudSyncProvider) {
    setError(null);

    if (!status.providers[provider].isConfigured) {
      setError(`${cloudSyncProviderLabels[provider]} sync is not configured yet.`);
      return false;
    }

    const popupWindow = window.open(
      getCloudSyncAuthorizePath(provider),
      'recipes-cloud-sync',
      CLOUD_SYNC_POPUP_FEATURES
    );

    if (!popupWindow) {
      setError(`Could not open the ${cloudSyncProviderLabels[provider]} authorization window.`);
      return false;
    }

    pendingPopupRef.current = popupWindow;
    setPendingProvider(provider);

    const isConnected = await waitForConnection(provider);

    if (!isConnected) {
      setError(`Could not finish connecting to ${cloudSyncProviderLabels[provider]}.`);
    }

    await refreshStatus();
    return isConnected;
  }

  async function disconnect() {
    setError(null);
    setIsActionPending(true);

    try {
      const response = await fetch(cloudSyncApiPaths.disconnect, {
        method: 'POST'
      });

      if (!response.ok) {
        const message = await readCloudSyncError(response, 'Could not disconnect cloud sync.');
        await refreshStatus();
        setError(message);
        return false;
      }

      await refreshStatus();
      return true;
    } finally {
      setIsActionPending(false);
    }
  }

  async function syncNow() {
    setError(null);
    setIsActionPending(true);
    setPendingAction('sync');

    try {
      const response = await fetch(cloudSyncApiPaths.sync, {
        method: 'POST'
      });

      if (!response.ok) {
        const message = await readCloudSyncError(response, 'Could not sync cloud data.');
        await refreshStatus();
        setError(message);
        return false;
      }

      await refreshStatus();
      dispatchCloudSyncAppDataRefresh();
      return true;
    } finally {
      setPendingAction(null);
      setIsActionPending(false);
    }
  }

  async function resetLocalFromCloud() {
    setError(null);
    setIsActionPending(true);
    setPendingAction('reset-local');

    try {
      const response = await fetch(cloudSyncApiPaths.resetLocal, {
        method: 'POST'
      });

      if (!response.ok) {
        const message = await readCloudSyncError(response, 'Could not reset local data from cloud.');
        await refreshStatus();
        setError(message);
        return false;
      }

      await refreshStatus();
      dispatchCloudSyncAppDataRefresh({ shouldForceRefresh: true });
      return true;
    } finally {
      setPendingAction(null);
      setIsActionPending(false);
    }
  }

  return {
    connect,
    disconnect,
    error,
    isLoading,
    isPending: Boolean(pendingProvider) || isActionPending || status.isSyncing,
    pendingAction,
    pendingProvider,
    refreshStatus,
    resetLocalFromCloud,
    status,
    syncNow
  };
}
