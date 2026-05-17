import { describe, expect, it } from 'vitest';
import { formatQuantity, formatQuantityWithUnit } from './quantityFormatting';

describe('formatQuantity', () => {
  it('formats common cooking fractions as slash fractions', () => {
    expect(formatQuantity(0.25)).toBe('1/4');
    expect(formatQuantity(0.5)).toBe('1/2');
    expect(formatQuantity(0.75)).toBe('3/4');
  });

  it('keeps uncommon decimals compact', () => {
    expect(formatQuantity(0.2)).toBe('0.2');
  });
});

describe('formatQuantityWithUnit', () => {
  it('uses fraction labels with units', () => {
    expect(formatQuantityWithUnit(0.25, { singular: 'cup' })).toBe('1/4 cup');
    expect(formatQuantityWithUnit(0.25, { singular: 'tsp' })).toBe('1/4 tsp');
  });
});
