const DURATION_NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, another: 1,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90
};
const COMPOUND_NUMBER_PATTERN =
  '(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[ -](?:one|two|three|four|five|six|seven|eight|nine)';
const DURATION_QUANTITY_PATTERN =
  `(?:\\d+(?:\\.\\d+)?|${COMPOUND_NUMBER_PATTERN}|${Object.keys(DURATION_NUMBER_WORDS).join('|')})`;
const DURATION_PATTERN = new RegExp(
  `\\b(${DURATION_QUANTITY_PATTERN})(?:\\s*(?:to|[-–—])\\s*(${DURATION_QUANTITY_PATTERN}))?\\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\\b`,
  'gi'
);

function getDurationQuantity(quantityLabel: string): number {
  const quantity = Number(quantityLabel);

  if (Number.isFinite(quantity)) {
    return quantity;
  }

  return quantityLabel.toLowerCase().split(/[ -]/).reduce(
    (total, word) => total + DURATION_NUMBER_WORDS[word],
    0
  );
}

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
    const quantity = getDurationQuantity(durationMatch[2] ?? durationMatch[1]);
    const unitLabel = durationMatch[3];

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
