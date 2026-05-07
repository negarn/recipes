import { useCallback, useEffect, useRef } from 'react';
import { scheduleTimerTone } from '../helpers/recipeTiming';

const TIMER_COMPLETION_TONES = [
  { frequency: 880, offsetSeconds: 0.02, durationSeconds: 0.35 },
  { frequency: 1174.66, offsetSeconds: 0.48, durationSeconds: 0.38 },
  { frequency: 880, offsetSeconds: 1.02, durationSeconds: 0.35 },
  { frequency: 1174.66, offsetSeconds: 1.5, durationSeconds: 0.4 },
  { frequency: 1567.98, offsetSeconds: 2.02, durationSeconds: 0.48 }
];

async function resumeTimerAudioContext(audioContext: AudioContext) {
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
}

export function useRecipeMethodTrackingAudio() {
  const timerAudioContextRef = useRef<AudioContext | null>(null);

  const getTimerAudioContext = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
      return null;
    }

    if (!timerAudioContextRef.current) {
      timerAudioContextRef.current = new window.AudioContext();
    }

    return timerAudioContextRef.current;
  }, []);

  const closeTimerAudioContext = useCallback(async () => {
    if (!timerAudioContextRef.current) {
      return;
    }

    const audioContext = timerAudioContextRef.current;
    timerAudioContextRef.current = null;

    await audioContext.close().catch(() => {
      // Ignore audio context cleanup failures on unmount.
    });
  }, []);

  const primeTimerAudio = useCallback(async () => {
    const audioContext = await getTimerAudioContext();

    if (!audioContext) {
      return;
    }

    await resumeTimerAudioContext(audioContext);
  }, [getTimerAudioContext]);

  const playTimerCompletionSound = useCallback(async () => {
    try {
      const audioContext = await getTimerAudioContext();

      if (!audioContext) {
        return;
      }

      await resumeTimerAudioContext(audioContext);

      const startTime = audioContext.currentTime + 0.02;

      TIMER_COMPLETION_TONES.forEach(({ durationSeconds, frequency, offsetSeconds }) => {
        scheduleTimerTone(
          audioContext,
          startTime + offsetSeconds,
          frequency,
          durationSeconds
        );
      });
    } catch (error) {
      console.error(error);
    }
  }, [getTimerAudioContext]);

  useEffect(() => {
    return () => {
      void closeTimerAudioContext();
    };
  }, [closeTimerAudioContext]);

  return {
    playTimerCompletionSound,
    primeTimerAudio
  };
}
