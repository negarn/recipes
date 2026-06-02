import { describe, expect, it } from 'vitest';
import {
  formatCookTimeLabel,
  getMethodStepTimerDurationMs
} from './recipeTiming';

describe('formatCookTimeLabel', () => {
  it('keeps sub-hour minute labels unchanged', () => {
    expect(formatCookTimeLabel('45 mins')).toBe('45 mins');
  });

  it('converts 60 minutes to 1 hr', () => {
    expect(formatCookTimeLabel('60 mins')).toBe('1 hr');
  });

  it('converts minute labels over an hour into hour + mins', () => {
    expect(formatCookTimeLabel('105 mins')).toBe('1 hr 45 mins');
  });

  it('supports singular minute unit labels', () => {
    expect(formatCookTimeLabel('61 minute')).toBe('1 hr 1 mins');
  });

  it('does not alter non-minute-only labels', () => {
    expect(formatCookTimeLabel('1 hr 30 mins')).toBe('1 hr 30 mins');
    expect(formatCookTimeLabel('25-30 mins')).toBe('25-30 mins');
  });
});

describe('getMethodStepTimerDurationMs', () => {
  it('uses the highest value from minute ranges', () => {
    expect(getMethodStepTimerDurationMs('Stir and cook for 6-8 minutes.')).toBe(
      8 * 60 * 1000
    );
  });

  it('creates a one-minute timer for another minute', () => {
    expect(
      getMethodStepTimerDurationMs(
        'Add in the thyme leaves, cooking for another minute until fragrant.'
      )
    ).toBe(60 * 1000);
  });

  it('creates one-unit timers from common singular labels', () => {
    expect(getMethodStepTimerDurationMs('Rest for a minute.')).toBe(60 * 1000);
    expect(getMethodStepTimerDurationMs('Bake for an hour.')).toBe(
      60 * 60 * 1000
    );
    expect(getMethodStepTimerDurationMs('Whisk for one second.')).toBe(1000);
  });

  it('does not read partial words as one-unit timers', () => {
    expect(getMethodStepTimerDurationMs('Serve with banana minutes.')).toBeNull();
  });
});
