import { useCallback, useEffect, useRef, useState } from 'react';
import { resetAppFavicon, showTimerDoneFavicon } from '../helpers/favicon';
import type { StepTimerMap } from '../types/app';

export function useRecipeMethodTrackingNotifications(
  activeStepTimers: StepTimerMap,
  resetKey: string | null,
  playTimerCompletionSound: () => Promise<void>
) {
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const alertedStepTimerIdsRef = useRef<Set<string>>(new Set());

  const resetTimerNotifications = useCallback(() => {
    alertedStepTimerIdsRef.current.clear();
    resetAppFavicon();
    setTimerNow(Date.now());
  }, []);

  const clearTimerAlert = useCallback((stepId: string) => {
    alertedStepTimerIdsRef.current.delete(stepId);
  }, []);

  const refreshTimerNow = useCallback(() => {
    setTimerNow(Date.now());
  }, []);

  useEffect(() => {
    resetTimerNotifications();
  }, [resetKey, resetTimerNotifications]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    function clearTimerNotification() {
      resetAppFavicon();
    }

    function handleTabReturn() {
      if (!document.hidden && document.hasFocus()) {
        clearTimerNotification();
      }
    }

    resetAppFavicon();
    window.addEventListener('focus', handleTabReturn);
    document.addEventListener('visibilitychange', handleTabReturn);

    return () => {
      window.removeEventListener('focus', handleTabReturn);
      document.removeEventListener('visibilitychange', handleTabReturn);
      clearTimerNotification();
    };
  }, []);

  useEffect(() => {
    if (!Object.keys(activeStepTimers).length || typeof window === 'undefined') {
      return;
    }

    const intervalId = window.setInterval(() => {
      refreshTimerNow();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeStepTimers, refreshTimerNow]);

  useEffect(() => {
    for (const [stepId, timerEndAt] of Object.entries(activeStepTimers)) {
      if (timerEndAt > timerNow || alertedStepTimerIdsRef.current.has(stepId)) {
        continue;
      }

      alertedStepTimerIdsRef.current.add(stepId);

      if (
        typeof document !== 'undefined' &&
        (document.hidden || !document.hasFocus())
      ) {
        showTimerDoneFavicon();
      }

      void playTimerCompletionSound();
    }
  }, [activeStepTimers, playTimerCompletionSound, timerNow]);

  return {
    clearTimerAlert,
    refreshTimerNow,
    resetTimerNotifications,
    timerNow
  };
}
