import type { IngredientUnit } from '../types/recipe';

export const teaspoonUnit: IngredientUnit = { singular: 'tsp' };
export const tablespoonUnit: IngredientUnit = { singular: 'tbsp' };

export function formatQuantity(value: number) {
  const roundedValue = Math.round(value * 100) / 100;

  if (Number.isInteger(roundedValue)) {
    return `${roundedValue}`;
  }

  return roundedValue.toFixed(2).replace(/\.?0+$/, '');
}

export function getUnitLabel(unit: IngredientUnit | undefined, quantity: number) {
  if (!unit) {
    return '';
  }

  if (quantity === 1 || !unit.plural) {
    return unit.singular;
  }

  return unit.plural;
}

export function scaleQuantity(
  quantity: number,
  servingCount: number,
  defaultServings: number
) {
  return (quantity * servingCount) / defaultServings;
}

function getUnitSeparator(unit: IngredientUnit | undefined) {
  if (!unit) {
    return 'space';
  }

  if (unit.separator) {
    return unit.separator;
  }

  return unit.singular === 'x' ? 'none' : 'space';
}

export function formatQuantityWithUnit(
  quantity: number,
  unit: IngredientUnit | undefined,
  {
    hideCountUnit = false
  }: {
    hideCountUnit?: boolean;
  } = {}
) {
  const quantityLabel = formatQuantity(quantity);
  const shouldHideCountUnit = hideCountUnit && unit?.singular === 'x';

  if (!unit || shouldHideCountUnit) {
    return quantityLabel;
  }

  const unitLabel = getUnitLabel(unit, quantity);
  const separator = getUnitSeparator(unit);

  return unitLabel
    ? separator === 'none'
      ? `${quantityLabel}${unitLabel}`
      : `${quantityLabel} ${unitLabel}`
    : quantityLabel;
}

export function getSpoonUnitQuantityInTeaspoons(unit: IngredientUnit | undefined) {
  const normalizedUnitSingular = unit?.singular.trim().toLowerCase();

  if (normalizedUnitSingular === 'tsp') {
    return 1;
  }

  if (normalizedUnitSingular === 'tbsp') {
    return 3;
  }

  return null;
}
