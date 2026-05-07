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
});
