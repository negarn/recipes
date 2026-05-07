import { sortDatedEntries } from './mealPlanData';
import {
  getShoppingListCategoryId,
  shoppingListCategoryLabels,
  shoppingListCategoryOrder,
  type ShoppingListCategoryId
} from './shoppingListCategories';
import {
  formatQuantityWithUnit,
  getSpoonUnitQuantityInTeaspoons,
  scaleQuantity,
  tablespoonUnit,
  teaspoonUnit
} from './quantityFormatting';
import { normalizeIngredientName } from './ingredientText';
import {
  formatRecipeTitle,
  getRecipeServingDetails
} from './recipeMetadata';
import type {
  MealPlanMap,
  RecipeServingMap,
  RecipeSettings,
  ShoppingListCheckMap,
  ShoppingListCustomItem,
  ShoppingListCustomItemList
} from '../types/app';
import type { Ingredient, IngredientUnit, Recipe } from '../types/recipe';

type RecipeLookup = (recipeId: string) => Recipe | undefined;
type ShoppingListDerivationArgs = {
  getRecipeById: RecipeLookup;
  mealPlan: MealPlanMap;
  recipeServings: RecipeServingMap;
  recipeSettings: RecipeSettings;
  shoppingListChecks: ShoppingListCheckMap;
  shoppingListCustomItems: ShoppingListCustomItemList;
};
type ShoppingListContributionBuildArgs = Pick<
  ShoppingListDerivationArgs,
  'getRecipeById' | 'mealPlan' | 'recipeServings' | 'recipeSettings'
>;

export type ShoppingListItem = {
  amountLabel: string;
  categoryId: ShoppingListCategoryId;
  checkSourceKeys: string[];
  customItemId?: string;
  ingredientName: string;
  isChecked: boolean;
  itemKey: string;
  renderKey: string;
  sources: Array<{
    date: string;
    recipeId: string;
    recipeTitle: string;
    sourceKey: string;
  }>;
};

export type ShoppingListSection = {
  id: ShoppingListCategoryId;
  items: ShoppingListItem[];
  label: string;
};

type ShoppingListSource = ShoppingListItem['sources'][number];

type ShoppingListItemContribution =
  | {
      amountText: string;
      amountType: 'fixed';
      categoryId: ShoppingListCategoryId;
      ingredientName: string;
      itemKey: string;
      source: ShoppingListSource;
    }
  | {
      amountType: 'scalable';
      categoryId: ShoppingListCategoryId;
      ingredientName: string;
      itemKey: string;
      note?: string;
      quantity: number;
      source: ShoppingListSource;
      unit?: IngredientUnit;
    };

type DerivedShoppingListData = {
  checkedSourceKeysByItemKey: Map<string, Set<string>>;
  contributionsByItemKey: Map<string, ShoppingListItemContribution[]>;
};

function getNormalizedUnitSingular(unit: IngredientUnit | undefined) {
  return unit?.singular.trim().toLowerCase();
}

function getNormalizedUnitPlural(unit: IngredientUnit | undefined) {
  return unit?.plural?.trim().toLowerCase();
}

function getScalableMeasurementKey(unit: IngredientUnit | undefined) {
  if (getSpoonUnitQuantityInTeaspoons(unit) !== null) {
    return 'family:spoon';
  }

  return [
    'unit',
    getNormalizedUnitSingular(unit) ?? '',
    getNormalizedUnitPlural(unit) ?? '',
    unit?.separator ?? ''
  ].join(':');
}

function formatScalableShoppingListAmount(
  quantity: number,
  unit: IngredientUnit | undefined,
  note?: string
) {
  const normalizedUnitSingular = unit?.singular.trim().toLowerCase();
  const shouldUseKilograms =
    (normalizedUnitSingular === 'g' ||
      normalizedUnitSingular === 'gram' ||
      normalizedUnitSingular === 'grams') &&
    Math.abs(quantity) >= 1000;
  const normalizedQuantity = shouldUseKilograms ? quantity / 1000 : quantity;
  const normalizedUnit: IngredientUnit | undefined = shouldUseKilograms
    ? { singular: 'kg', separator: 'none' }
    : unit;
  const amountLabel = formatQuantityWithUnit(normalizedQuantity, normalizedUnit, {
    hideCountUnit: unit?.singular === 'x'
  });

  return note ? `${amountLabel} (${note})` : amountLabel;
}

function formatCombinedSpoonShoppingListAmount(quantityInTeaspoons: number, note?: string) {
  const roundedQuantityInTeaspoons = Math.round(quantityInTeaspoons);

  if (
    Math.abs(quantityInTeaspoons - roundedQuantityInTeaspoons) <= 1e-9 &&
    roundedQuantityInTeaspoons >= 3
  ) {
    const tablespoonQuantity = Math.floor(roundedQuantityInTeaspoons / 3);
    const teaspoonQuantity = roundedQuantityInTeaspoons % 3;

    const amountLabel =
      teaspoonQuantity === 0
        ? formatQuantityWithUnit(tablespoonQuantity, tablespoonUnit)
        : `${formatQuantityWithUnit(
            tablespoonQuantity,
            tablespoonUnit
          )} + ${formatQuantityWithUnit(teaspoonQuantity, teaspoonUnit)}`;

    return note ? `${amountLabel} (${note})` : amountLabel;
  }

  return formatScalableShoppingListAmount(quantityInTeaspoons, teaspoonUnit, note);
}

function getShoppingListItemKey(ingredient: Ingredient) {
  const normalizedIngredientName = normalizeIngredientName(
    ingredient.name,
    ingredient.amount.type === 'scalable' ? ingredient.amount.unit : undefined
  )
    .trim()
    .toLowerCase();

  if (ingredient.amount.type === 'fixed') {
    return `fixed:${normalizedIngredientName}:${ingredient.amount.text.trim().toLowerCase()}`;
  }

  const unit = ingredient.amount.unit;

  return [
    'scalable',
    normalizedIngredientName,
    ingredient.amount.note?.trim().toLowerCase() ?? '',
    getScalableMeasurementKey(unit)
  ].join(':');
}

function getCustomShoppingListItemKey(customItemId: string) {
  return `custom:${customItemId}`;
}

function formatFixedShoppingListAmount(amountText: string, sourceCount: number) {
  return sourceCount === 1 ? amountText : `${sourceCount} × ${amountText}`;
}

function sortShoppingListSources(sources: ShoppingListSource[]) {
  return sources
    .slice()
    .sort((leftSource, rightSource) =>
      leftSource.date === rightSource.date
        ? leftSource.recipeTitle.localeCompare(rightSource.recipeTitle)
        : leftSource.date.localeCompare(rightSource.date)
    );
}

function getShoppingListSourceKey(
  date: string,
  recipeId: string,
  entryIndex: number,
  ingredientId: string
) {
  return `${date}:${recipeId}:${entryIndex}:${ingredientId}`;
}

function appendMapArrayValue<K, V>(map: Map<K, V[]>, key: K, ...values: V[]) {
  if (!values.length) {
    return;
  }

  const nextValues = map.get(key) ?? [];
  nextValues.push(...values);
  map.set(key, nextValues);
}

function forEachContributionGroup(
  contributionsByItemKey: Map<string, ShoppingListItemContribution[]>,
  callback: (
    firstContribution: ShoppingListItemContribution,
    contributions: ShoppingListItemContribution[]
  ) => void
) {
  for (const contributions of contributionsByItemKey.values()) {
    const [firstContribution] = contributions;

    if (!firstContribution) {
      continue;
    }

    callback(firstContribution, contributions);
  }
}

function buildShoppingListItemContributions({
  getRecipeById,
  mealPlan,
  recipeServings,
  recipeSettings
}: ShoppingListContributionBuildArgs) {
  const contributionsByItemKey = new Map<string, ShoppingListItemContribution[]>();

  sortDatedEntries(mealPlan, 'asc').forEach(([date, recipeIds]) => {
    recipeIds.forEach((recipeId, entryIndex) => {
      const recipe = getRecipeById(recipeId);

      if (!recipe) {
        return;
      }

      const recipeTitle = formatRecipeTitle(recipe.title);
      const {
        defaultServingCount,
        servingCount
      } = getRecipeServingDetails(
        recipe,
        recipeServings,
        recipeSettings
      );

      recipe.ingredients.forEach((ingredient) => {
        const itemKey = getShoppingListItemKey(ingredient);
        const categoryId = getShoppingListCategoryId(
          ingredient.name,
          ingredient.amount.type === 'scalable' ? ingredient.amount.unit : undefined
        );
        const source = {
          date,
          sourceKey: getShoppingListSourceKey(
            date,
            recipe.id,
            entryIndex,
            ingredient.id
          ),
          recipeId: recipe.id,
          recipeTitle
        };

        if (ingredient.amount.type === 'fixed') {
          appendMapArrayValue(contributionsByItemKey, itemKey, {
            amountText: ingredient.amount.text,
            amountType: 'fixed',
            categoryId,
            ingredientName: ingredient.name,
            itemKey,
            source
          });
          return;
        }

        const scaledQuantity = scaleQuantity(
          ingredient.amount.quantity,
          servingCount,
          defaultServingCount
        );

        appendMapArrayValue(contributionsByItemKey, itemKey, {
          amountType: 'scalable',
          categoryId,
          ingredientName: ingredient.name,
          itemKey,
          note: ingredient.amount.note,
          quantity: scaledQuantity,
          source,
          unit: ingredient.amount.unit
        });
      });
    });
  });

  return contributionsByItemKey;
}

function buildCheckedSourceKeysByItemKey({
  contributionsByItemKey,
  shoppingListChecks,
  shoppingListCustomItems
}: {
  contributionsByItemKey: Map<string, ShoppingListItemContribution[]>;
  shoppingListChecks: ShoppingListCheckMap;
  shoppingListCustomItems: ShoppingListCustomItemList;
}) {
  const sourceKeysByItemKey = new Map<string, Set<string>>();

  forEachContributionGroup(contributionsByItemKey, (firstContribution, contributions) => {
    const sourceKeys = new Set<string>();

    contributions.forEach(({ source }) => {
      sourceKeys.add(source.sourceKey);
    });

    sourceKeysByItemKey.set(firstContribution.itemKey, sourceKeys);
  });

  shoppingListCustomItems.forEach((shoppingListCustomItem) => {
    const itemKey = getCustomShoppingListItemKey(shoppingListCustomItem.id);
    sourceKeysByItemKey.set(itemKey, new Set([itemKey]));
  });

  const checkedSourceKeysByItemKey = new Map<string, Set<string>>();

  Object.entries(shoppingListChecks).forEach(([storedItemKey, checkedSourceKeys]) => {
    const sourceKeys = sourceKeysByItemKey.get(storedItemKey);

    if (!sourceKeys) {
      return;
    }

    const nextCheckedSourceKeys =
      checkedSourceKeysByItemKey.get(storedItemKey) ?? new Set<string>();

    checkedSourceKeys.forEach((sourceKey) => {
      if (sourceKeys.has(sourceKey)) {
        nextCheckedSourceKeys.add(sourceKey);
      }
    });

    if (nextCheckedSourceKeys.size) {
      checkedSourceKeysByItemKey.set(storedItemKey, nextCheckedSourceKeys);
    }
  });

  return checkedSourceKeysByItemKey;
}

function buildShoppingListData({
  getRecipeById,
  mealPlan,
  recipeServings,
  recipeSettings,
  shoppingListChecks,
  shoppingListCustomItems
}: ShoppingListDerivationArgs) {
  const contributionsByItemKey = buildShoppingListItemContributions({
    getRecipeById,
    mealPlan,
    recipeServings,
    recipeSettings
  });

  return {
    checkedSourceKeysByItemKey: buildCheckedSourceKeysByItemKey({
      contributionsByItemKey,
      shoppingListChecks,
      shoppingListCustomItems
    }),
    contributionsByItemKey
  } satisfies DerivedShoppingListData;
}

function createShoppingListItem(
  contributions: ShoppingListItemContribution[],
  isChecked: boolean
): ShoppingListItem | null {
  const [firstContribution] = contributions;

  if (!firstContribution) {
    return null;
  }

  const sources = sortShoppingListSources(
    contributions.map(({ source }) => ({
      date: source.date,
      recipeId: source.recipeId,
      recipeTitle: source.recipeTitle,
      sourceKey: source.sourceKey
    }))
  );
  let amountLabel: string;

  if (firstContribution.amountType === 'fixed') {
    amountLabel = formatFixedShoppingListAmount(
      firstContribution.amountText,
      contributions.length
    );
  } else {
    const firstContributionSpoonUnitQuantity = getSpoonUnitQuantityInTeaspoons(
      firstContribution.unit
    );
    const scalableContributions = contributions.filter(
      (
        contribution
      ): contribution is Extract<ShoppingListItemContribution, { amountType: 'scalable' }> =>
        contribution.amountType === 'scalable'
    );

    amountLabel =
      firstContributionSpoonUnitQuantity === null
        ? formatScalableShoppingListAmount(
            scalableContributions.reduce(
              (totalQuantity, contribution) => totalQuantity + contribution.quantity,
              0
            ),
            firstContribution.unit,
            firstContribution.note
          )
        : formatCombinedSpoonShoppingListAmount(
            scalableContributions.reduce((totalQuantityInTeaspoons, contribution) => {
              const spoonUnitQuantityInTeaspoons = getSpoonUnitQuantityInTeaspoons(
                contribution.unit
              );

              if (spoonUnitQuantityInTeaspoons === null) {
                return totalQuantityInTeaspoons;
              }

              return (
                totalQuantityInTeaspoons +
                contribution.quantity * spoonUnitQuantityInTeaspoons
              );
            }, 0),
            firstContribution.note
          );
  }

  return {
    amountLabel,
    categoryId: firstContribution.categoryId,
    checkSourceKeys: sources.map(({ sourceKey }) => sourceKey),
    ingredientName: firstContribution.ingredientName,
    isChecked,
    itemKey: firstContribution.itemKey,
    renderKey: `${firstContribution.itemKey}:${isChecked ? 'checked' : 'unchecked'}:${sources
      .map(({ sourceKey }) => sourceKey)
      .join('|')}`,
    sources
  };
}

function createCustomShoppingListItem(
  customItem: ShoppingListCustomItem,
  isChecked: boolean
): ShoppingListItem {
  const itemKey = getCustomShoppingListItemKey(customItem.id);
  const categoryId = getShoppingListCategoryId(customItem.ingredientName);

  return {
    amountLabel: customItem.amountText,
    categoryId,
    checkSourceKeys: [itemKey],
    customItemId: customItem.id,
    ingredientName: customItem.ingredientName,
    isChecked,
    itemKey,
    renderKey: `${itemKey}:${isChecked ? 'checked' : 'unchecked'}`,
    sources: []
  };
}

function compareShoppingListItems(leftItem: ShoppingListItem, rightItem: ShoppingListItem) {
  if (leftItem.isChecked !== rightItem.isChecked) {
    return Number(leftItem.isChecked) - Number(rightItem.isChecked);
  }

  const nameComparison = leftItem.ingredientName.localeCompare(rightItem.ingredientName);

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return leftItem.amountLabel.localeCompare(rightItem.amountLabel);
}

function normalizeCheckedSourceKeys(
  checkedSourceKeysByItemKey: Map<string, Set<string>>
) {
  return Object.fromEntries(
    Array.from(checkedSourceKeysByItemKey.entries()).map(([itemKey, checkedSourceKeys]) => [
      itemKey,
      Array.from(checkedSourceKeys).sort()
    ])
  ) satisfies ShoppingListCheckMap;
}

function buildShoppingListSections({
  checkedSourceKeysByItemKey,
  contributionsByItemKey,
  shoppingListCustomItems
}: DerivedShoppingListData & {
  shoppingListCustomItems: ShoppingListCustomItemList;
}) {
  const groupedItems = new Map<ShoppingListCategoryId, ShoppingListItem[]>();

  forEachContributionGroup(contributionsByItemKey, (firstContribution, contributions) => {
    const checkedContributions: ShoppingListItemContribution[] = [];
    const uncheckedContributions: ShoppingListItemContribution[] = [];

    contributions.forEach((contribution) => {
      if (
        checkedSourceKeysByItemKey
          .get(firstContribution.itemKey)
          ?.has(contribution.source.sourceKey)
      ) {
        checkedContributions.push(contribution);
      } else {
        uncheckedContributions.push(contribution);
      }
    });

    const nextItems = [
      createShoppingListItem(uncheckedContributions, false),
      createShoppingListItem(checkedContributions, true)
    ].filter((item): item is ShoppingListItem => item !== null);

    appendMapArrayValue(groupedItems, firstContribution.categoryId, ...nextItems);
  });

  shoppingListCustomItems.forEach((shoppingListCustomItem) => {
    const itemKey = getCustomShoppingListItemKey(shoppingListCustomItem.id);
    const nextItem = createCustomShoppingListItem(
      shoppingListCustomItem,
      checkedSourceKeysByItemKey.get(itemKey)?.has(itemKey) ?? false
    );

    appendMapArrayValue(groupedItems, nextItem.categoryId, nextItem);
  });

  const sections = shoppingListCategoryOrder
    .map((categoryId) => ({
      id: categoryId,
      items: (groupedItems.get(categoryId) ?? []).sort(compareShoppingListItems),
      label: shoppingListCategoryLabels[categoryId]
    }))
    .filter(({ items }) => items.length > 0);

  return [
    ...sections.filter(({ items }) => items.some((item) => !item.isChecked)),
    ...sections.filter(({ items }) => items.every((item) => item.isChecked))
  ];
}

export function deriveShoppingList({
  getRecipeById,
  mealPlan,
  recipeServings,
  recipeSettings,
  shoppingListChecks,
  shoppingListCustomItems
}: ShoppingListDerivationArgs): ShoppingListSection[] {
  const derivedShoppingListData = buildShoppingListData({
    getRecipeById,
    mealPlan,
    recipeServings,
    recipeSettings,
    shoppingListChecks,
    shoppingListCustomItems
  });

  return buildShoppingListSections({
    ...derivedShoppingListData,
    shoppingListCustomItems
  });
}

export function reconcileShoppingListChecks(args: ShoppingListDerivationArgs) {
  return normalizeCheckedSourceKeys(buildShoppingListData(args).checkedSourceKeysByItemKey);
}

export function areShoppingListChecksEqual(
  leftShoppingListChecks: ShoppingListCheckMap,
  rightShoppingListChecks: ShoppingListCheckMap
) {
  const leftItemKeys = Object.keys(leftShoppingListChecks).sort();
  const rightItemKeys = Object.keys(rightShoppingListChecks).sort();

  if (leftItemKeys.length !== rightItemKeys.length) {
    return false;
  }

  return leftItemKeys.every((itemKey, itemKeyIndex) => {
    if (itemKey !== rightItemKeys[itemKeyIndex]) {
      return false;
    }

    const leftSourceKeys = leftShoppingListChecks[itemKey] ?? [];
    const rightSourceKeys = rightShoppingListChecks[itemKey] ?? [];

    return (
      leftSourceKeys.length === rightSourceKeys.length &&
      leftSourceKeys.every(
        (sourceKey, sourceKeyIndex) => sourceKey === rightSourceKeys[sourceKeyIndex]
      )
    );
  });
}
