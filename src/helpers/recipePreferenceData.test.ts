import { describe, expect, it } from 'vitest';
import {
  normalizeShoppingListCustomItemDraft,
  normalizeRecipeBookmarkText,
  normalizeRecipeBookmarks,
  normalizeRecipeSettings
} from './recipePreferenceData';

describe('recipePreferenceData bookmarks', () => {
  it('preserves bookmark line breaks while compacting each line', () => {
    expect(normalizeRecipeBookmarkText('  Keep\n   this   together  ')).toBe(
      'Keep\nthis together'
    );
  });

  it('filters invalid bookmarks and deduplicates bookmark ids per recipe', () => {
    expect(
      normalizeRecipeBookmarks({
        'test-recipe': [
          { id: 'bookmark-1', label: 'First label', text: '  First line\nsecond line ' },
          { id: 'bookmark-1', label: 'Duplicate id', text: 'Ignored duplicate' },
          { id: '', label: 'Missing id', text: 'Ignored invalid entry' },
          { id: 'bookmark-2', label: 'Second label', text: 'Second' }
        ],
        '  ': [{ id: 'bookmark-3', label: 'Invalid recipe', text: 'Ignored recipe' }]
      })
    ).toEqual({
      'test-recipe': [
        {
          id: 'bookmark-1',
          label: 'First label',
          text: 'First line\nsecond line'
        },
        {
          id: 'bookmark-2',
          label: 'Second label',
          text: 'Second'
        }
      ]
    });
  });
});

describe('recipePreferenceData settings', () => {
  it('keeps a valid default serving size and drops invalid values', () => {
    expect(normalizeRecipeSettings({ defaultServingSize: 6 })).toEqual({
      defaultServingSize: 6
    });
    expect(normalizeRecipeSettings({ defaultServingSize: 0 })).toEqual({});
    expect(normalizeRecipeSettings({ defaultServingSize: 3.5 })).toEqual({});
  });
});

describe('recipePreferenceData shopping list custom items', () => {
  it('defaults a blank custom item amount to one', () => {
    expect(
      normalizeShoppingListCustomItemDraft({
        amountText: '   ',
        ingredientName: '  Toothpaste '
      })
    ).toEqual({
      amountText: '1',
      ingredientName: 'Toothpaste'
    });
  });

  it('defaults a missing custom item amount to one', () => {
    expect(
      normalizeShoppingListCustomItemDraft({
        ingredientName: 'Toothpaste'
      })
    ).toEqual({
      amountText: '1',
      ingredientName: 'Toothpaste'
    });
  });

  it('still requires a custom item ingredient name', () => {
    expect(
      normalizeShoppingListCustomItemDraft({
        amountText: '',
        ingredientName: '   '
      })
    ).toBeNull();
  });
});
