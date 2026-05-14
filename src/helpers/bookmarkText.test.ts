import { describe, expect, it } from 'vitest';
import {
  bookmarkLabelMatchesSearch,
  annotateBookmarkBodyTextWithCheckboxes,
  createBookmarkLabelSuggestion,
  normalizeBookmarkBodyText,
  normalizeBookmarkLabelText,
  parseBookmarkBodyLines,
  setBookmarkBodyCheckboxLineState
} from './bookmarkText';

describe('bookmarkText', () => {
  it('preserves bookmark line breaks while compacting each line', () => {
    expect(normalizeBookmarkBodyText('  Keep\n   this   together  ')).toBe(
      'Keep\nthis together'
    );
  });

  it('keeps bookmark labels on a single line', () => {
    expect(normalizeBookmarkLabelText('  Keep\n   this   together  ')).toBe(
      'Keep this together'
    );
  });

  it('matches bookmark labels by every search term', () => {
    expect(bookmarkLabelMatchesSearch('Sunday Brunch Notes', 'brunch notes')).toBe(true);
    expect(bookmarkLabelMatchesSearch('Sunday Brunch Notes', 'notes sunday')).toBe(true);
    expect(bookmarkLabelMatchesSearch('Sunday Brunch Notes', 'dinner')).toBe(false);
  });

  it('annotates matching checkbox lines with the current checkbox state', () => {
    expect(
      annotateBookmarkBodyTextWithCheckboxes('Mix sample item\nStir gently', [
        { checked: false, text: 'Mix sample item' },
        { checked: true, text: 'Stir gently' }
      ])
    ).toBe('- [ ] Mix sample item\n- [x] Stir gently');
  });

  it('parses bookmark body checkbox lines into display rows', () => {
    expect(
      parseBookmarkBodyLines('Bring water to a boil\n- [ ] Stir gently\n\n- [x] Serve warm')
    ).toEqual([
      { kind: 'text', text: 'Bring water to a boil' },
      { checked: false, kind: 'checkbox', text: 'Stir gently' },
      { kind: 'blank' },
      { checked: true, kind: 'checkbox', text: 'Serve warm' }
    ]);
  });

  it('updates a bookmark checkbox line while preserving the other lines', () => {
    expect(
      setBookmarkBodyCheckboxLineState(
        'Bring water to a boil\n- [ ] Stir gently\nServe warm',
        1,
        true
      )
    ).toBe('Bring water to a boil\n- [x] Stir gently\nServe warm');
  });

  it('creates a concise label suggestion from the first meaningful line', () => {
    expect(createBookmarkLabelSuggestion('  - [x] First line\nSecond line')).toBe(
      'First line'
    );
  });
});
