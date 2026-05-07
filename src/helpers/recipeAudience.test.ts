import { describe, expect, it } from 'vitest';
import { isRecipeForChildren } from './recipeAudience';

describe('isRecipeForChildren', () => {
  it('matches the children tag regardless of casing or spacing', () => {
    expect(isRecipeForChildren({ tags: [' family ', 'CHILDREN'] })).toBe(true);
  });

  it('returns false when the children tag is absent', () => {
    expect(isRecipeForChildren({ tags: ['family', 'weeknight'] })).toBe(false);
  });
});
