import { describe, expect, it } from 'vitest';
import type { Recipe } from '../types/recipe';
import { checkRecipeConsistency, replaceConsistencyIssueText } from './recipeConsistencyValidation';

function recipe(names: string[], step = ''): Recipe {
  return {
    id: 'draft', title: 'Test recipe', defaultServings: 2, totalTime: '20 mins',
    tags: [], isVegan: false, isVegetarian: false,
    ingredients: names.map((name, index) => ({ id: `ingredient-${index}`, name, amount: { type: 'fixed', text: 'As needed' } })),
    sections: [{ id: 'cook', title: 'Cook', steps: step ? [step] : [] }]
  };
}

describe('checkRecipeConsistency', () => {
  it.each([
    ['beef mince', 'Ground beef'],
    ['feta cheese', 'Feta'], ['cheddar cheese', 'Cheddar']
  ])('reuses the established name rule for %s', (name, replacement) => {
    expect(checkRecipeConsistency(recipe([name])).issues).toMatchObject([
      { code: 'name-convention', field: 'ingredients', lineIndex: 0, excerpt: name, replacement }
    ]);
  });

  it.each(['Green chilli', 'Green chillies', 'Greek yoghurt', 'Mild chilli flakes', 'Sweet chilli sauce'])(
    'accepts the spelling variant %s in ingredient names and steps', (name) => {
      expect(checkRecipeConsistency(recipe([name], `Use ${name}.`)).issues).toEqual([]);
    }
  );

  it('flags spelling differences from other recipes in either direction', () => {
    const reference = { ...recipe(['Green chili', 'Greek yogurt']), id: 'reference' };
    const fixture = recipe(['Green chilli', 'Greek yoghurt'], 'Chop green chillies and stir in YOGHURT.');
    expect(checkRecipeConsistency(fixture, [reference]).issues).toMatchObject([
      { code: 'name-convention', field: 'ingredients', excerpt: 'chilli', replacement: 'chili' },
      { code: 'name-convention', field: 'ingredients', excerpt: 'yoghurt', replacement: 'yogurt' },
      { code: 'name-convention', field: 'cook', excerpt: 'chillies', replacement: 'chilies' },
      { code: 'name-convention', field: 'cook', excerpt: 'YOGHURT', replacement: 'YOGURT' }
    ]);
    expect(checkRecipeConsistency(reference, [{ ...fixture, id: 'other' }]).issues).toMatchObject([
      { excerpt: 'chili', replacement: 'chilli' },
      { excerpt: 'yogurt', replacement: 'yoghurt' }
    ]);
  });

  it('accepts a variant that matches the spelling used in other recipes', () => {
    const fixture = recipe(['Green chilli', 'Greek yoghurt'], 'Add the chillies and yoghurt.');
    const reference = { ...fixture, id: 'reference' };
    expect(checkRecipeConsistency(fixture, [reference]).issues).toEqual([]);
  });

  it('compares spelling in qualified ingredient names without dropping their descriptors', () => {
    const fixture = recipe(['Sweet chilli sauce']);
    const reference = { ...recipe(['Sweet chili sauce']), id: 'reference' };
    const issue = checkRecipeConsistency(fixture, [reference]).issues[0];
    expect(replaceConsistencyIssueText('Sweet chilli sauce', issue)).toBe('Sweet chili sauce');
  });

  it('reports a mixed collection without picking a spelling automatically', () => {
    const fixture = recipe(['Greek yoghurt']);
    const catalog = [
      { ...recipe(['Greek yogurt']), id: 'first' },
      { ...recipe(['Greek yoghurt']), id: 'second' }
    ];
    const issues = checkRecipeConsistency(fixture, catalog).issues;
    expect(issues).toMatchObject([{ code: 'name-convention', excerpt: 'yoghurt' }]);
    expect(issues[0].replacement).toBeUndefined();
    expect(issues[0].message).toContain('Other recipes mix');
    expect(issues[0].message).toContain('“yogurt” and “yoghurt”');
  });

  it('does not use the saved version of the current recipe to enforce a spelling', () => {
    const fixture = recipe(['Greek yoghurt']);
    const previous = recipe(['Greek yogurt']);
    expect(checkRecipeConsistency(fixture, [previous]).issues).toEqual([]);
  });

  it('reports a spelling conflict once when casing also differs', () => {
    const catalog = [
      { ...recipe(['Yogurt']), id: 'first' },
      { ...recipe(['Yoghurt']), id: 'second' }
    ];
    const issues = checkRecipeConsistency(recipe(['YOGURT']), catalog).issues;
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('Other recipes mix');
  });

  it.each([
    ['Brocoli', 'Broccoli'], ['Chikcen', 'Chicken'], ['Tumeric', 'Turmeric'],
    ['Spinch', 'Spinach'], ['Bonelss chicken', 'Boneless']
  ])('finds a generic insertion, deletion, or transposition in %s', (name, replacement) => {
    expect(checkRecipeConsistency(recipe([name])).issues).toMatchObject([
      { code: 'spelling', replacement }
    ]);
  });

  it.each([
    'Stir while the sauce thickens.',
    'Taste the sauce and cover the chicken.',
    'Wash the brocoli, then serve.',
    'Add {{fixed|while stirring}}.'
  ])('does not guess spelling corrections for ordinary step text: %s', (step) => {
    const fixture = recipe(['White onion', 'Whole milk', 'Broccoli', 'Chicken'], step);
    fixture.sections.push({ id: 'prep', title: 'Prep', steps: [step] });
    const catalog = [{ ...recipe(['White onion', 'Whole milk']), id: 'reference' }];
    expect(checkRecipeConsistency(fixture, catalog).issues).toEqual([]);
  });

  it('uses ingredient spellings from other recipes', () => {
    const draft = recipe(['Galangal'], 'Slice the galangal.');
    const reference = { ...recipe(['Galangal']), id: 'reference' };
    const misspelled = recipe(['Galangl']);
    expect(checkRecipeConsistency(misspelled).issues).toEqual([]);
    expect(checkRecipeConsistency(misspelled, [reference]).issues).toMatchObject([
      { field: 'ingredients', replacement: 'Galangal' }
    ]);
    expect(checkRecipeConsistency(draft, [reference]).issues).toEqual([]);
  });

  it('matches the casing of an existing ingredient name from another recipe', () => {
    const reference = { ...recipe(['Baby spinach']), id: 'reference' };
    expect(checkRecipeConsistency(recipe(['Baby Spinach']), [reference]).issues)
      .toMatchObject([{ code: 'name-convention', replacement: 'Baby spinach' }]);
  });

  it('does not treat the saved version of the edited recipe as a spelling reference', () => {
    const draft = recipe(['Galangl']);
    expect(checkRecipeConsistency(draft, [draft]).issues).toEqual([]);
  });

  it('reports duplicate ingredient names after known aliases and casing are resolved', () => {
    const issues = checkRecipeConsistency(recipe(['Feta', 'feta cheese'])).issues;
    expect(issues).toMatchObject([
      { code: 'name-convention', lineIndex: 1 },
      { code: 'duplicate-ingredient', lineIndex: 1 }
    ]);
    expect(issues[1].message).toContain('line 1');
  });

  it('still identifies duplicate ingredients with different accepted spellings', () => {
    expect(checkRecipeConsistency(recipe(['Greek yogurt', 'Greek yoghurt'])).issues)
      .toMatchObject([{ code: 'duplicate-ingredient', lineIndex: 1 }]);
  });

  it('leaves uncertain alternatives for manual review', () => {
    const issues = checkRecipeConsistency(recipe(['Carrote'])).issues;
    expect(issues).toMatchObject([{ code: 'spelling', excerpt: 'Carrote' }]);
    expect(issues[0].replacement).toBeUndefined();
  });

  it('accepts different varieties, plurals, cooking words, and unfamiliar ingredients', () => {
    const fixture = recipe(['Red onion', 'Yellow onion', 'Chicken', 'Tomatoes', 'Couscous', 'Gochujang'],
      'Thicken the sauce, taste, and cover the chicken. Slice the onions and tomatoes in a shallow pan.');
    expect(checkRecipeConsistency(fixture).issues).toEqual([]);
  });

  it('checks visible link labels without changing IDs or quantities', () => {
    const step = 'Add {{ingredient|green-chillies|green chilli|green chillies}} and {{fixed|yoghurt}}.';
    const catalog = [{ ...recipe(['Green chili', 'Yogurt']), id: 'reference' }];
    const issues = checkRecipeConsistency(recipe(['Green chili', 'Yogurt'], step), catalog).issues;
    expect(issues.map((issue) => issue.excerpt)).toEqual(['chilli', 'chillies', 'yoghurt']);
    const updated = [...issues].reverse().reduce(replaceConsistencyIssueText, step);
    expect(updated).toBe('Add {{ingredient|green-chillies|green chili|green chilies}} and {{fixed|yogurt}}.');
  });

  it('checks prep steps and keeps the input recipe and catalog unchanged', () => {
    const fixture = recipe(['Brocoli']);
    fixture.sections.push({ id: 'prep', title: 'Prep', steps: ['Add yoghurt while stirring.'] });
    const catalog = [{ ...recipe(['Broccoli', 'Yogurt']), id: 'reference' }];
    const snapshot = JSON.stringify([fixture, catalog]);
    const check = checkRecipeConsistency(fixture, catalog);
    expect(check.issues).toContainEqual(expect.objectContaining({ field: 'prep', excerpt: 'yoghurt', code: 'name-convention' }));
    expect(JSON.stringify([fixture, catalog])).toBe(snapshot);
  });
});

describe('replaceConsistencyIssueText', () => {
  it('only applies the suggested correction when the original text still matches', () => {
    const issue = checkRecipeConsistency(recipe(['Brocoli'])).issues[0];
    expect(replaceConsistencyIssueText('Brocoli', issue)).toBe('Broccoli');
    expect(replaceConsistencyIssueText('Spinach', issue)).toBe('Spinach');
  });
});
