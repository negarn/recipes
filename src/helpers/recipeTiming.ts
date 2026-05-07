const DURATION_PATTERN =
  /(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|hr|minutes?|mins?|min|seconds?|secs?|sec)\b|(\d+(?:\.\d+)?)\s*(hours?|hrs?|hr|minutes?|mins?|min|seconds?|secs?|sec)\b/gi;

function getDurationUnitSeconds(unitLabel: string) {
  const normalizedUnitLabel = unitLabel.toLowerCase();

  if (normalizedUnitLabel.startsWith('hour') || normalizedUnitLabel.startsWith('hr')) {
    return 60 * 60;
  }

  if (normalizedUnitLabel.startsWith('min')) {
    return 60;
  }

  return 1;
}

function getDurationValuesInSeconds(value: string) {
  const durationValuesInSeconds: number[] = [];

  DURATION_PATTERN.lastIndex = 0;

  for (const durationMatch of value.matchAll(DURATION_PATTERN)) {
    const quantity = durationMatch[2]
      ? Number(durationMatch[2])
      : Number(durationMatch[4]);
    const unitLabel = durationMatch[3] ?? durationMatch[5];

    if (!unitLabel || !Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    durationValuesInSeconds.push(quantity * getDurationUnitSeconds(unitLabel));
  }

  return durationValuesInSeconds;
}

export function getCookTimeMinutes(totalTime: string) {
  const normalizedTime = totalTime.toLowerCase();
  const durationValuesInSeconds = getDurationValuesInSeconds(normalizedTime);

  if (durationValuesInSeconds.length) {
    return durationValuesInSeconds.reduce(
      (totalDurationSeconds, durationSeconds) => totalDurationSeconds + durationSeconds,
      0
    ) / 60;
  }

  const firstNumberMatch = normalizedTime.match(/\d+/);
  return firstNumberMatch ? Number(firstNumberMatch[0]) : Number.POSITIVE_INFINITY;
}

export function formatCookTimeLabel(totalTime: string) {
  const minuteOnlyMatch = totalTime.match(/^\s*(\d+)\s*(minutes?|mins?|min)\s*$/i);

  if (!minuteOnlyMatch) {
    return totalTime;
  }

  const totalMinutes = Number(minuteOnlyMatch[1]);

  if (!Number.isFinite(totalMinutes) || totalMinutes < 60) {
    return totalTime;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const hourLabel = `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;

  if (remainingMinutes === 0) {
    return hourLabel;
  }

  return `${hourLabel} ${remainingMinutes} mins`;
}

export function getMethodStepTimerDurationMs(step: string) {
  const durationValuesInSeconds = getDurationValuesInSeconds(step);
  const maxDurationSeconds = Math.max(0, ...durationValuesInSeconds);

  return maxDurationSeconds > 0 ? maxDurationSeconds * 1000 : null;
}

export function formatActiveTimerCountdown(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${`${minutes}`.padStart(2, '0')}:${`${seconds}`.padStart(2, '0')}`;
  }

  return `${`${minutes}`.padStart(2, '0')}:${`${seconds}`.padStart(2, '0')}`;
}

export function scheduleTimerTone(
  audioContext: AudioContext,
  startTime: number,
  frequency: number,
  durationSeconds: number
) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(0.26, startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + durationSeconds
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + durationSeconds + 0.02);
}
