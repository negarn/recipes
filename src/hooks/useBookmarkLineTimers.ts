import { useEffect, useState } from 'react';
import { readBookmarkLineTimers, writeBookmarkLineTimers } from '../helpers/bookmarkTimers';
import type { StepTimerMap } from '../types/app';
import { useRecipeMethodTrackingAudio } from './useRecipeMethodTrackingAudio';
import { useRecipeMethodTrackingNotifications } from './useRecipeMethodTrackingNotifications';

function getBookmarkIdFromTimerKey(timerKey: string) {
  return timerKey.split(':', 1)[0];
}

export function useBookmarkLineTimers(
  bookmarkIds: string[],
  hasResolvedBookmarks: boolean
) {
  const [activeBookmarkLineTimers, setActiveBookmarkLineTimers] = useState<StepTimerMap>(
    () => readBookmarkLineTimers()
  );
  const { playTimerCompletionSound, primeTimerAudio } =
    useRecipeMethodTrackingAudio();
  const {
    clearTimerAlert,
    refreshTimerNow,
    resetTimerNotifications,
    timerNow
  } = useRecipeMethodTrackingNotifications(
    activeBookmarkLineTimers,
    'bookmarks',
    playTimerCompletionSound
  );

  useEffect(() => {
    if (!hasResolvedBookmarks) {
      return;
    }

    const allowedBookmarkIds = new Set(bookmarkIds);

    setActiveBookmarkLineTimers((currentBookmarkLineTimers) => {
      let didChange = false;
      const nextBookmarkLineTimers: StepTimerMap = {};

      for (const [timerKey, timerEndAt] of Object.entries(currentBookmarkLineTimers)) {
        const bookmarkId = getBookmarkIdFromTimerKey(timerKey);

        if (!allowedBookmarkIds.has(bookmarkId)) {
          didChange = true;
          continue;
        }

        nextBookmarkLineTimers[timerKey] = timerEndAt;
      }

      if (!didChange) {
        return currentBookmarkLineTimers;
      }

      writeBookmarkLineTimers(nextBookmarkLineTimers);
      return nextBookmarkLineTimers;
    });
  }, [bookmarkIds, hasResolvedBookmarks]);

  function updateBookmarkLineTimers(
    updater: (currentBookmarkLineTimers: StepTimerMap) => StepTimerMap
  ) {
    setActiveBookmarkLineTimers((currentBookmarkLineTimers) => {
      const nextBookmarkLineTimers = updater(currentBookmarkLineTimers);
      writeBookmarkLineTimers(nextBookmarkLineTimers);
      return nextBookmarkLineTimers;
    });
  }

  function startBookmarkLineTimer(timerKey: string, durationMs: number) {
    const nextTimerEndAt = Date.now() + durationMs;

    clearTimerAlert(timerKey);
    refreshTimerNow();
    updateBookmarkLineTimers((currentBookmarkLineTimers) => ({
      ...currentBookmarkLineTimers,
      [timerKey]: nextTimerEndAt
    }));

    void primeTimerAudio();
  }

  function clearBookmarkLineTimer(timerKey: string) {
    clearTimerAlert(timerKey);
    updateBookmarkLineTimers((currentBookmarkLineTimers) => {
      if (!(timerKey in currentBookmarkLineTimers)) {
        return currentBookmarkLineTimers;
      }

      const nextBookmarkLineTimers = { ...currentBookmarkLineTimers };
      delete nextBookmarkLineTimers[timerKey];
      return nextBookmarkLineTimers;
    });
  }

  function clearBookmarkTimersForBookmark(bookmarkId: string) {
    updateBookmarkLineTimers((currentBookmarkLineTimers) => {
      let didChange = false;
      const nextBookmarkLineTimers: StepTimerMap = {};
      const timerKeyPrefix = `${bookmarkId}:`;

      for (const [timerKey, timerEndAt] of Object.entries(currentBookmarkLineTimers)) {
        if (timerKey.startsWith(timerKeyPrefix)) {
          clearTimerAlert(timerKey);
          didChange = true;
          continue;
        }

        nextBookmarkLineTimers[timerKey] = timerEndAt;
      }

      return didChange ? nextBookmarkLineTimers : currentBookmarkLineTimers;
    });
  }

  function resetBookmarkLineTimers() {
    setActiveBookmarkLineTimers({});
    resetTimerNotifications();
    writeBookmarkLineTimers({});
  }

  return {
    activeBookmarkLineTimers,
    clearBookmarkLineTimer,
    clearBookmarkTimersForBookmark,
    resetBookmarkLineTimers,
    startBookmarkLineTimer,
    timerNow
  };
}
