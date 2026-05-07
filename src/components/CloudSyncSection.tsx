import { useMemo } from 'react';
import { InlineMessage } from './InlineMessage';
import { cn, pillButtonClass, pillDangerButtonClass, subheadingChipClass, subheadingLabelClass, surfaceSectionCardClass, surfaceSectionTitleClass } from '../helpers/uiClasses';
import {
  cloudSyncProviderLabels,
  cloudSyncProviders,
  type CloudSyncProvider,
  type CloudSyncProviderConnectionStatus
} from '../helpers/cloudSyncData';
import { useCloudSyncStatus } from '../hooks/useCloudSyncStatus';

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not synced yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not synced yet';
  }

  return date.toLocaleString();
}

function getSyncPillClassName({
  isConnected,
  isConfigured,
  isSyncing
}: {
  isConnected: boolean;
  isConfigured: boolean;
  isSyncing: boolean;
}) {
  return cn(
    'inline-flex w-fit items-center rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em]',
    isSyncing
      ? 'border-app-brand bg-app-button-tint text-app-brand-strong'
      : isConnected
        ? 'border-app-brand bg-app-button-tint-hover text-app-brand-strong'
        : isConfigured
          ? 'border-app-field-border bg-app-surface-tint text-app-muted'
          : 'border-app-danger/30 bg-app-danger-soft text-app-danger'
  );
}

function CloudProviderCard({
  activeProvider,
  connect,
  disconnect,
  isPending,
  pendingProvider,
  provider,
  syncNow,
  status
}: {
  activeProvider: CloudSyncProvider | null;
  connect: (provider: CloudSyncProvider) => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  isPending: boolean;
  pendingProvider: CloudSyncProvider | null;
  provider: CloudSyncProvider;
  syncNow: () => Promise<boolean>;
  status: CloudSyncProviderConnectionStatus;
}) {
  const providerLabel = cloudSyncProviderLabels[provider];
  const isActive = activeProvider === provider && status.isConnected;
  const connectLabel = activeProvider && activeProvider !== provider
    ? `Switch to ${providerLabel}`
    : `Connect ${providerLabel}`;

  return (
    <section className={cn(surfaceSectionCardClass, 'grid gap-4')}>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className={surfaceSectionTitleClass}>{providerLabel}</h3>
          <span
            className={getSyncPillClassName({
              isConnected: status.isConnected,
              isConfigured: status.isConfigured,
              isSyncing: isPending && pendingProvider === provider
            })}
          >
            {isPending && pendingProvider === provider
              ? 'Connecting'
              : isActive
                ? 'Connected'
                : status.isConfigured
                  ? 'Ready'
                  : 'Needs setup'}
          </span>
        </div>

        <p className="m-0 text-[0.92rem] leading-[1.56] text-app-muted">
          {provider === 'google-drive'
            ? 'Uses Google Drive’s private app data folder.'
            : 'Uses Dropbox’s private app folder.'}
        </p>
      </div>

      <div className="grid gap-2.5 border-t border-app-field-border/85 pt-3">
        <p className="m-0 text-[0.84rem] font-medium text-app-muted">
          Last synced: <span className="font-semibold text-app-ink">{formatDateTime(status.lastSyncedAt)}</span>
        </p>

        {status.lastError ? (
          <InlineMessage className="max-w-[48rem]" tone="error">
            {status.lastError}
          </InlineMessage>
        ) : null}

        {!status.isConfigured ? (
          <p className="m-0 text-[0.82rem] leading-[1.45] text-app-muted">
            {provider === 'google-drive'
              ? 'Set up the Google Drive OAuth credentials in your environment before connecting.'
              : 'Set up the Dropbox OAuth credentials in your environment before connecting.'}
          </p>
        ) : null}

        <div className="flex w-full flex-col gap-2.5 min-[720px]:flex-row min-[720px]:flex-nowrap min-[720px]:items-center min-[720px]:justify-end">
          {!isActive ? (
            <button
              type="button"
              className={cn(
                pillButtonClass,
                'h-[2.78rem] w-full justify-center px-[1rem] text-[0.82rem] min-[720px]:w-auto min-[720px]:min-w-[11rem]'
              )}
              onClick={() => void connect(provider)}
              disabled={!status.isConfigured || isPending}
            >
              {pendingProvider === provider
                ? 'Connecting...'
                : connectLabel}
            </button>
          ) : null}

          {isActive ? (
            <button
              type="button"
              className={cn(
                pillButtonClass,
                '!border-app-line-strong !bg-app-button-surface !text-app-ink enabled:hover:!bg-app-button-surface-hover h-[2.78rem] w-full justify-center px-[1rem] text-[0.82rem] min-[720px]:w-auto min-[720px]:min-w-[9.5rem]'
              )}
              onClick={() => void syncNow()}
              disabled={isPending}
            >
              {isPending && pendingProvider === null ? 'Syncing...' : 'Sync now'}
            </button>
          ) : null}

          {isActive ? (
            <button
              type="button"
              className={cn(
                pillDangerButtonClass,
                'h-[2.78rem] w-full justify-center px-[1rem] text-[0.82rem] min-[720px]:w-auto min-[720px]:min-w-[9.5rem]'
              )}
              onClick={() => void disconnect()}
              disabled={isPending}
            >
              Disconnect
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function CloudSyncSection() {
  const {
    connect,
    disconnect,
    error,
    isLoading,
    isPending,
    pendingProvider,
    status,
    syncNow
  } = useCloudSyncStatus();

  const cards = useMemo(
    () =>
      cloudSyncProviders.map((provider) => (
        <CloudProviderCard
          key={provider}
          activeProvider={status.activeProvider}
          connect={connect}
          disconnect={disconnect}
          isPending={isPending}
          pendingProvider={pendingProvider}
          provider={provider}
          syncNow={syncNow}
          status={status.providers[provider]}
        />
      )),
    [connect, disconnect, isPending, pendingProvider, status, syncNow]
  );

  return (
    <section className="grid w-full gap-2.5">
      <h2 className={cn(subheadingLabelClass, subheadingChipClass)}>
        Cloud sync
      </h2>

      <div className="grid gap-4 rounded-[24px] border border-app-field-border bg-app-meal-row p-4 min-[1100px]:p-5">
        <p className="m-0 max-w-none text-[0.92rem] leading-[1.56] text-app-muted">
          Connect Google Drive or Dropbox to keep a private copy of your app data in your own
          account. New changes sync there automatically.
        </p>

        {!isLoading ? (
          <div className="grid gap-4 min-[1100px]:grid-cols-2">
            {cards}
          </div>
        ) : (
          <div className="grid gap-4 min-[1100px]:grid-cols-2" aria-hidden="true">
            {cloudSyncProviders.map((provider) => (
              <div
                key={provider}
                className="grid gap-3 rounded-[24px] border border-app-field-border bg-app-surface p-5"
              >
                <span className="h-[1.4rem] w-[9rem] rounded-full bg-app-button-tint animate-pulse" />
                <span className="h-[1.05rem] w-[100%] rounded-full bg-app-button-tint animate-pulse" />
                <span className="h-[1.05rem] w-[82%] rounded-full bg-app-button-tint animate-pulse" />
                <span className="mt-2 h-[2.78rem] w-full rounded-full bg-app-button-tint animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {error ? <InlineMessage>{error}</InlineMessage> : null}
      </div>
    </section>
  );
}
