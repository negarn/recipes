import type {
  RecipeBookmarkMap,
  RecipeNoteMap,
  RecipeRatingMap,
  RecipeServingMap,
  RecipeSettings,
  ShoppingListCheckMap,
  ShoppingListCustomItem,
  ShoppingListCustomItemList
} from '../types/app';
import {
  normalizeBookmarkBodyText,
  normalizeBookmarkLabelText
} from './bookmarkText';
import {
  isNonEmptyString,
  isRecordLike,
  normalizeRecordEntries
} from './normalization';

export const DEFAULT_RECIPE_SERVING_SIZE = 2;

export function isValidRecipeRating(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0.5 &&
    value <= 5 &&
    Math.round(value * 2) === value * 2
  );
}

export function normalizeRecipeRatings(value: unknown) {
  return normalizeRecordEntries(value, (entryValue) =>
    isValidRecipeRating(entryValue) ? entryValue : null
  ) as RecipeRatingMap;
}

export function isValidRecipeServing(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

export function normalizeRecipeServings(value: unknown) {
  return normalizeRecordEntries(value, (entryValue) =>
    isValidRecipeServing(entryValue) ? entryValue : null
  ) as RecipeServingMap;
}

function isValidRecipeNote(value: unknown): value is string {
  return isNonEmptyString(value);
}

export function normalizeRecipeNoteText(value: string) {
  return value.trim();
}

export function normalizeRecipeBookmarkText(value: string) {
  return normalizeBookmarkBodyText(value);
}

export function normalizeRecipeBookmarkLabelText(value: string) {
  return normalizeBookmarkLabelText(value);
}

export function normalizeRecipeNotes(value: unknown) {
  return normalizeRecordEntries(value, (entryValue) =>
    isValidRecipeNote(entryValue) ? normalizeRecipeNoteText(entryValue) : null
  ) as RecipeNoteMap;
}

function isValidRecipeBookmarkEntry(value: unknown) {
  if (!isRecordLike(value)) {
    return false;
  }

  const { id, label, text } = value as Partial<Record<'id' | 'label' | 'text', unknown>>;

  return (
    isNonEmptyString(id) &&
    isNonEmptyString(label) &&
    isNonEmptyString(text)
  );
}

export function normalizeRecipeBookmarks(value: unknown) {
  if (!isRecordLike(value)) {
    return {} as RecipeBookmarkMap;
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([recipeId, bookmarks]) => {
        const normalizedRecipeId = recipeId.trim();

        if (!normalizedRecipeId || !Array.isArray(bookmarks)) {
          return null;
        }

        const seenBookmarkIds = new Set<string>();

        const normalizedBookmarks = bookmarks.flatMap((bookmark) => {
          if (!isValidRecipeBookmarkEntry(bookmark)) {
            return [];
          }

          const {
            id,
            label,
            text
          } = bookmark as Record<'id' | 'label' | 'text', string>;
          const normalizedBookmarkId = id.trim();
          const normalizedLabel = normalizeRecipeBookmarkLabelText(label);
          const normalizedText = normalizeRecipeBookmarkText(text);

          if (seenBookmarkIds.has(normalizedBookmarkId)) {
            return [];
          }

          if (!normalizedLabel || !normalizedText) {
            return [];
          }

          seenBookmarkIds.add(normalizedBookmarkId);

          return [
            {
              id: normalizedBookmarkId,
              label: normalizedLabel,
              text: normalizedText
            }
          ];
        });

        return normalizedBookmarks.length
          ? [normalizedRecipeId, normalizedBookmarks]
          : null;
      })
      .filter(
        (
          entry
        ): entry is [string, RecipeBookmarkMap[string]] => entry !== null
      )
  ) as RecipeBookmarkMap;
}

export function normalizeRecipeSettings(value: unknown) {
  if (!isRecordLike(value)) {
    return {} as RecipeSettings;
  }

  const { defaultServingSize } = value as Partial<Record<keyof RecipeSettings, unknown>>;

  return isValidRecipeServing(defaultServingSize)
    ? { defaultServingSize }
    : ({} as RecipeSettings);
}

function isValidShoppingListCheckSourceKey(value: unknown): value is string {
  return isNonEmptyString(value);
}

export function normalizeShoppingListChecks(value: unknown) {
  if (!isRecordLike(value)) {
    return {} as ShoppingListCheckMap;
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([itemKey, sourceKeys]) => {
        const normalizedItemKey = itemKey.trim();

        if (!normalizedItemKey || !Array.isArray(sourceKeys)) {
          return null;
        }

        const normalizedSourceKeys = [...new Set(
          sourceKeys
            .filter(isValidShoppingListCheckSourceKey)
            .map((sourceKey) => sourceKey.trim())
            .filter(isNonEmptyString)
        )].sort();

        return normalizedSourceKeys.length
          ? [normalizedItemKey, normalizedSourceKeys]
          : null;
      })
      .filter(
        (
          entry
        ): entry is [string, string[]] => entry !== null
      )
  ) as ShoppingListCheckMap;
}

function isValidShoppingListCustomItemId(value: unknown): value is string {
  return isNonEmptyString(value);
}

export function normalizeShoppingListCustomItemDraft(value: unknown) {
  if (!isRecordLike(value)) {
    return null;
  }

  const {
    amountText,
    ingredientName
  } = value as Partial<Record<'amountText' | 'ingredientName', unknown>>;

  if (
    !isNonEmptyString(amountText) ||
    !isNonEmptyString(ingredientName)
  ) {
    return null;
  }

  return {
    amountText: amountText.trim(),
    ingredientName: ingredientName.trim()
  } satisfies Pick<ShoppingListCustomItem, 'amountText' | 'ingredientName'>;
}

function normalizeShoppingListCustomItem(value: unknown) {
  if (!isRecordLike(value)) {
    return null;
  }

  const { id } = value as Partial<Record<'id', unknown>>;
  const normalizedDraft = normalizeShoppingListCustomItemDraft(value);

  if (!normalizedDraft || !isValidShoppingListCustomItemId(id)) {
    return null;
  }

  return {
    ...normalizedDraft,
    id: id.trim()
  } satisfies ShoppingListCustomItem;
}

export function normalizeShoppingListCustomItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ShoppingListCustomItemList;
  }

  const seenIds = new Set<string>();

  return value.flatMap((entry) => {
    const normalizedEntry = normalizeShoppingListCustomItem(entry);

    if (!normalizedEntry || seenIds.has(normalizedEntry.id)) {
      return [];
    }

    seenIds.add(normalizedEntry.id);
    return [normalizedEntry];
  }) satisfies ShoppingListCustomItemList;
}
