import { describe, expect, it } from 'vitest';
import type { Ingredient, Recipe } from '../types/recipe';
import { renderMethodStepText } from './recipeDisplay';
import { checkRecipeScaling, getMethodStepDraftRange, replaceScalingIssueText } from './recipeScalingValidation';

function ingredient(name: string, quantity = 2, unit = 'x', id = name): Ingredient {
  return { id, name, amount: { type: 'scalable', quantity, unit: { singular: unit, plural: unit === 'clove' ? 'cloves' : unit } } };
}

function recipe(step: string, ingredients: Ingredient[] = []): Recipe {
  return {
    id: 'scaling-fixture', title: 'Scaling fixture', totalTime: '20 mins', defaultServings: 2,
    isVegan: false, isVegetarian: false, tags: [], ingredients,
    sections: [{ id: 'prep', title: 'Prep', steps: ['Prepare the pan.'] }, { id: 'cook', title: 'Cook', steps: [step] }]
  };
}

describe('checkRecipeScaling', () => {
  it('scales counted chilies with Canadian spelling and reports a quantity mismatch', () => {
    const step = 'Finely chop 2 green chilies.';
    const fixture = recipe(step, [ingredient('Green chili', 2)]);

    expect(renderMethodStepText(step, fixture, 4)).toBe('Finely chop 4 green chilies.');
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
    expect(checkRecipeScaling(recipe('Finely chop 3 green chilies.', fixture.ingredients)).issues)
      .toMatchObject([{ code: 'amount-mismatch' }]);
  });

  it.each([
    ['Chop 8x chicken thighs.', ingredient('Chicken thighs', 8)],
    ['Chop 1 green chili.', ingredient('Green chilli', 1)],
    ['Grate 1 carrote.', ingredient('Carrot', 1)],
    ['Cook 1 head of broccoli.', ingredient('Broccoli', 1)],
    ['Chop 2 heads of lettuce.', ingredient('Lettuce', 2)],
    ['Slice 0.5 red onion.', ingredient('Red onion (small)', 0.5)],
    ['Finely chop75g of spinach.', ingredient('Spinach', 75, 'g')],
    ['Chop 250 of broccoli.', ingredient('Broccoli', 250, 'g')],
    ['Grate 1 peeled clove of garlic.', ingredient('Garlic', 2, 'clove')],
    ['Add 2 peeled cloves of garlic.', ingredient('Garlic', 2, 'clove')],
    ['Heat 1x 250g pouch of rice.', ingredient('Rice', 200, 'g')],
    ['Add 2 156ml cans tomato paste.', ingredient('Tomato paste', 312, 'g')]
  ])('flags an ingredient amount that the renderer leaves fixed: %s', (step, item) => {
    const check = checkRecipeScaling(recipe(step, [item]));
    expect(check.issues).toHaveLength(1);
    expect(check.issues[0]).toMatchObject({ code: 'unchanged-quantity', severity: 'warning', sectionId: 'cook', sectionTitle: 'Cook', stepIndex: 0 });
    expect(check.issues[0].baseText).toBe(step);
    expect(check.issues[0].scaledText).toBe(step);
  });

  it.each(['Shape into 10 even-sized meatballs.', 'Divide into 4 balls.', 'Make 4 burgers.', 'Serve in 2 bowls.', 'Shape 4 patties.'])('flags and links a yield count: %s', (step) => {
    const fixture = recipe(step);
    const issue = checkRecipeScaling(fixture).issues[0];
    expect(issue.code).toBe('unchanged-quantity');
    expect(issue.scalableText).toBeDefined();
    const updated = replaceScalingIssueText(step, issue, issue.scalableText!);
    expect(checkRecipeScaling(recipe(updated)).issues).toEqual([]);
    expect(renderMethodStepText(updated, fixture, 4)).not.toBe(step);
    expect(renderMethodStepText(updated, fixture, 2)).toBe(step);
  });

  it('reports a missing quantity without inventing an amount', () => {
    const check = checkRecipeScaling(recipe('Grate in  cloves of garlic.', [ingredient('Garlic', 6, 'clove')]));
    expect(check.issues).toMatchObject([{ code: 'missing-quantity', excerpt: 'cloves of garlic', severity: 'warning' }]);
    expect(check.issues[0].scalableText).toBeUndefined();
  });

  it('recognizes missing quantities when the ingredient name includes the count unit', () => {
    const step = 'Chuck in the onion and sweet potato, then peel and grate in  cloves of garlic and cook for 3-4 minutes.';
    const check = checkRecipeScaling(recipe(step, [ingredient('Garlic cloves', 6)]));
    expect(check.issues).toMatchObject([{ code: 'missing-quantity', excerpt: 'cloves of garlic' }]);
  });

  it('does not mistake an earlier ingredient quantity for a missing amount', () => {
    const step = 'Chop 2 onions then grate in cloves of garlic.';
    const check = checkRecipeScaling(recipe(step, [ingredient('Onion'), ingredient('Garlic cloves', 6)]));
    expect(check.issues).toMatchObject([{ code: 'missing-quantity', excerpt: 'cloves of garlic' }]);
  });

  it.each([
    'Add 1 pinch of salt.',
    'Reserve one shallot and chop the last shallot.',
    'Save a couple tbsp of mushrooms.',
    'Bake for 20 minutes at 200°C. Cut into 2 cm pieces.',
    'Put 1 burger onto each plate.',
    'Use 1/2 of the parsley.',
    'Stir in 1/3 of spinach and repeat with the remainder.',
    'Add a couple of tablespoons of salt.',
    'Add 2 cloves of peeled garlic.',
    'Add {{amount|2|clove|cloves}} of garlic.',
    'Use {{fixed|2 bowls}}.'
  ])('does not flag deliberate fixed amounts, proportions, or non-ingredient numbers: %s', (step) => {
    expect(checkRecipeScaling(recipe(step, [ingredient('Shallot'), ingredient('Salt', 1, 'tsp'), ingredient('Mushrooms', 200, 'g'), ingredient('Parsley', 10, 'g'), ingredient('Spinach', 100, 'g'), ingredient('Garlic', 2, 'clove')])).issues).toEqual([]);
  });

  it.each([
    ['Chop 2 onions.', ingredient('Onion')],
    ['Chop 1/2 a lemon.', ingredient('Lemon')],
    ['Add 75g of spinach.', ingredient('Spinach', 75, 'g')],
    ['Crush 2 peeled garlic cloves.', ingredient('Garlic', 2, 'clove')],
    ['Add 2x 400g tins of tomatoes.', ingredient('Tomatoes', 800, 'g')],
    ['Cook {{ingredient|chicken}} of chicken.', ingredient('Chicken', 300, 'g', 'chicken')],
    ['Add {{ingredient-portion|garlic|1/2}} of garlic.', ingredient('Garlic', 2, 'clove', 'garlic')]
  ])('accepts amounts that already scale: %s', (step, item) => {
    expect(checkRecipeScaling(recipe(step, [item])).issues).toEqual([]);
  });

  it('ignores the physical size of each item and fixed ingredient amounts', () => {
    const fixed: Ingredient = { id: 'bag', name: 'Rice', amount: { type: 'fixed', text: '1 bag as needed' } };
    expect(checkRecipeScaling(recipe('Cook 1 bag of rice.', [fixed])).issues).toEqual([]);
    expect(checkRecipeScaling(recipe('Add 300g of chicken (150g each).', [ingredient('Chicken', 300, 'g')])).issues).toEqual([]);
  });

  it('detects an unchanged count even when another amount in the same step changes', () => {
    const check = checkRecipeScaling(recipe('Make 4 burgers and cook with 4 tbsp of oil.', [ingredient('Oil', 4, 'tbsp')]));
    expect(check.issues).toHaveLength(1);
    expect(check.issues[0].excerpt).toBe('4 burgers');
    expect(check.issues[0].scaledText).toContain('8 tbsp');
  });

  it.each([
    '{{ingredient|missing|onion|onions}}', '{{ingredient|}}', '{{ingredient-portion|garlic|oops}}',
    '{{ingredient-portion|missing|1/2}}', '{{ingredient-portion|garlic}}', '{{amount||g}}',
    '{{amount|NaN|g}}', '{{amount|-1|g}}', '{{amount|2|g|g|invalid}}', '{{unknown|2}}',
    '{{fixed|}}', '{{ingredient|garlic', 'garlic}}'
  ])('reports broken links independently of rendered fallback text: %s', (step) => {
    const check = checkRecipeScaling(recipe(step, [ingredient('Garlic', 2, 'clove', 'garlic')]));
    expect(check.issues).toHaveLength(1);
    expect(check.issues[0]).toMatchObject({ code: 'invalid-link', severity: 'error' });
  });

  it('accepts an old ingredient ID when the renderer can recover a unique alias', () => {
    const fixture = recipe('{{ingredient|old-garlic|garlic}}', [ingredient('Garlic', 2, 'clove', 'new-garlic')]);
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
  });

  it('reports an unclosed link once and preserves its exact text for editing', () => {
    const step = 'Serve in {{amount|2 bowls with {{ingredient|garlic}}.';
    const check = checkRecipeScaling(recipe(step, [ingredient('Garlic', 2, 'clove', 'garlic')]));
    expect(check.issues).toHaveLength(1);
    expect(check.issues[0].code).toBe('invalid-link');
    expect(step.slice(check.issues[0].start, check.issues[0].end)).toBe(check.issues[0].excerpt);
  });

  it('checks smaller and larger serving counts without changing the recipe', () => {
    const fixture = recipe('Make 4 burgers.');
    const snapshot = JSON.stringify(fixture);
    const check = checkRecipeScaling(fixture);
    expect(check.servingCounts).toEqual([1, 4]);
    expect(check.checkedSteps).toBe(2);
    expect(JSON.stringify(fixture)).toBe(snapshot);
    expect(checkRecipeScaling({ ...fixture, defaultServings: 1 }).servingCounts).toEqual([2]);
  });
});

describe('fixed amounts and issue edits', () => {
  it('keeps an explicit fixed amount unchanged at every serving size', () => {
    const fixture = recipe('Add {{fixed|75g of spinach}} and {{amount|2|bowl|bowls}}.', [ingredient('Spinach', 75, 'g')]);
    expect(renderMethodStepText(fixture.sections[1].steps[0], fixture, 4)).toBe('Add 75g of spinach and 4 bowls.');
    expect(renderMethodStepText(fixture.sections[1].steps[0], fixture, 1)).toBe('Add 75g of spinach and 1 bowl.');
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
  });

  it('persists keep-fixed decisions in step text and checks other amounts', () => {
    const step = 'Make 4 burgers and serve in 2 bowls.';
    const issue = checkRecipeScaling(recipe(step)).issues[0];
    const updated = replaceScalingIssueText(step, issue, `{{fixed|${issue.excerpt}}}`);
    const saved = JSON.parse(JSON.stringify(recipe(updated))) as Recipe;
    expect(checkRecipeScaling(saved).issues.map((item) => item.excerpt)).toEqual(['2 bowls']);
    expect(renderMethodStepText(updated, saved, 4)).toBe(step);
    expect(replaceScalingIssueText('Make 8 burgers.', issue, 'replacement')).toBe('Make 8 burgers.');
  });

  it('maps step positions to textarea lines including blank lines and indentation', () => {
    const draft = '\n  Chop onion.  \n\n  Make 4 burgers.\n';
    const range = getMethodStepDraftRange(draft, 1)!;
    expect(draft.slice(range.start, range.end)).toBe('Make 4 burgers.');
    expect(getMethodStepDraftRange(draft, 2)).toBeUndefined();
  });
});

describe('ingredient amount consistency', () => {
  function spiceMixRecipe(): Recipe {
    const fixture = recipe('Add the reserved 1/3 of the spice blend to the pan.', [
      ingredient('Ground cloves', 0.25, 'tsp'),
      ingredient('Cumin', 0.5, 'tsp'),
      ingredient('Coriander', 0.5, 'tsp'),
      ingredient('Ground cinnamon', 0.25, 'tsp'),
      ingredient('Ground allspice', 0.25, 'tsp'),
      ingredient('Ground black pepper', 0.25, 'tsp'),
      ingredient('Chilli flakes', 0.5, 'tsp')
    ]);
    fixture.sections[0].steps = [
      'Combine 1/4 tsp of ground cloves, 1/2 tsp of ground cumin, 1/2 tsp of ground coriander, 1/4 tsp of ground cinnamon, 1/4 tsp of ground allspice, 1/4 tsp of ground black pepper and 1/2 tsp of chilli flakes. Mix well, then spoon 1/3 of the spice mix into a small bowl, this is for the spiced butter topping.'
    ];
    return fixture;
  }

  it('keeps ground spices separate when checking a mixed spice list', () => {
    expect(checkRecipeScaling(spiceMixRecipe()).issues).toEqual([]);
  });

  it.each([
    ['1/4 tsp of ground cloves', '1/2 tsp of ground cloves', 'Ground cloves', '1/4 tsp'],
    ['1/2 tsp of ground cumin', '3/4 tsp of ground cumin', 'Cumin', '1/2 tsp']
  ])('still reports a real mismatch for %s', (original, replacement, name, listed) => {
    const fixture = spiceMixRecipe();
    fixture.sections[0].steps[0] = fixture.sections[0].steps[0].replace(original, replacement);
    const check = checkRecipeScaling(fixture);
    expect(check.issues).toHaveLength(1);
    expect(check.issues[0]).toMatchObject({
      code: 'amount-mismatch', sectionId: 'prep', stepIndex: 0, excerpt: replacement,
      message: `This step specifies ${replacement.split(' of ')[0]} of ${name}, but the ingredient list has ${listed}.`
    });
  });

  it.each(['Add 1/2 tsp of ground cumin.', 'Add tsp of ground cumin.', 'Add 1/2 tsp of ground.'])(
    'does not match a preparation word to ground cloves: %s', (step) => {
      expect(checkRecipeScaling(recipe(step, [ingredient('Ground cloves', 0.25, 'tsp')])).issues).toEqual([]);
    }
  );

  function parsleyRecipe(prepAmount = '3'): Recipe {
    const fixture = recipe('', [ingredient('Fresh parsley', 30, 'g', 'fresh-parsley')]);
    fixture.sections[0].steps = [`Chop ${prepAmount}g of parsley.`];
    fixture.sections[1].steps = [
      'Stir 3/4 of the parsley through the chowder, saving the remainder for garnish.',
      'Ladle the chowder into bowls and sprinkle over the remaining parsley.'
    ];
    return fixture;
  }

  it('catches 3g prepared against 30g listed even when cooking uses portions and a remainder', () => {
    const fixture = parsleyRecipe();
    expect(checkRecipeScaling(fixture).issues).toMatchObject([{
      code: 'amount-mismatch', sectionId: 'prep', stepIndex: 0, excerpt: '3g of parsley',
      message: 'This step specifies 3 g of Fresh parsley, but the ingredient list has 30 g.'
    }]);
    expect(checkRecipeScaling(parsleyRecipe('30')).issues).toEqual([]);
  });

  it('checks prep against the list even when a quantified cooking amount matches the list', () => {
    const fixture = parsleyRecipe();
    fixture.sections[1].steps = ['Stir 30g of parsley into the chowder.'];
    expect(checkRecipeScaling(fixture).issues).toMatchObject([{
      code: 'amount-mismatch', sectionId: 'prep', excerpt: '3g of parsley'
    }]);
  });

  it('checks a linked prep amount while preserving its source text for editing', () => {
    const fixture = parsleyRecipe();
    fixture.sections[0].steps = ['Chop {{amount|3|g}} of parsley.'];
    const issue = checkRecipeScaling(fixture).issues[0];
    expect(issue).toMatchObject({ code: 'amount-mismatch', excerpt: '{{amount|3|g}} of parsley' });
    expect(fixture.sections[0].steps[0].slice(issue.start, issue.end)).toBe(issue.excerpt);
  });

  it.each([
    'Chop 3g of parsley, then chop the remaining parsley for the garnish.',
    'Chop 3g of parsley, then chop {{ingredient-portion|fresh-parsley|1/2}} of parsley.',
    'Chop 3g of parsley, then chop {{fixed|some parsley}} for the garnish.'
  ])('leaves an explicitly incomplete prep amount alone: %s', (step) => {
    const fixture = parsleyRecipe();
    fixture.sections[0].steps = [step];
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
  });

  it('does not add preparation and cooking amounts together', () => {
    const fixture = parsleyRecipe('30');
    fixture.sections[1].steps = ['Stir 30g of parsley into the chowder.'];
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
  });

  it('leaves split prep amounts alone rather than comparing each part to the ingredient total', () => {
    const fixture = parsleyRecipe();
    fixture.sections[0].steps = ['Chop 3g of parsley for the garnish.', 'Chop 27g of parsley for the soup.'];
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
  });

  it('leaves a fractional prep count alone', () => {
    const fixture = recipe('Squeeze the remaining lime into the soup.', [ingredient('Lime', 1)]);
    fixture.sections[0].steps = ['Juice 1/2 a lime.'];
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
  });

  function turmericRecipe(prepAmount = '1', cookAmount = '1/2'): Recipe {
    const fixture = recipe('', [ingredient('Ground turmeric', 1.5, 'tsp', 'turmeric')]);
    fixture.sections[0].steps = [`Add ${prepAmount} tsp of turmeric to the marinade and blend until smooth.`];
    fixture.sections[1].steps = [`Add ${cookAmount} tsp of turmeric to the rice.`];
    return fixture;
  }

  it('accepts 1 tsp in prep plus 1/2 tsp in cook for a listed 1.5 tsp total', () => {
    expect(checkRecipeScaling(turmericRecipe()).issues).toEqual([]);
  });

  it('catches the reported edit to 2 tsp even though that amount still scales', () => {
    const fixture = turmericRecipe('2');
    const step = fixture.sections[0].steps[0];
    expect(renderMethodStepText(step, fixture, 4)).toContain('4 tsp of turmeric');
    const check = checkRecipeScaling(fixture);
    expect(check.issues).toHaveLength(1);
    expect(check.issues[0]).toMatchObject({
      code: 'amount-mismatch', severity: 'warning', sectionId: 'prep', stepIndex: 0,
      excerpt: '2 tsp of turmeric',
      message: 'The prep and cook amounts total 2.5 tsp of Ground turmeric, but the ingredient list has 1.5 tsp.'
    });
  });

  it.each([['1.25', '1.75 tsp'], ['3/4', '1.25 tsp']])('checks both larger and smaller split totals: %s tsp in prep', (amount, total) => {
    const check = checkRecipeScaling(turmericRecipe(amount));
    expect(check.issues).toHaveLength(1);
    expect(check.issues[0].code).toBe('amount-mismatch');
    expect(check.issues[0].message).toContain(`total ${total}`);
  });

  it('updates warnings when either the step or ingredient amount changes', () => {
    const fixture = turmericRecipe('2');
    expect(checkRecipeScaling(fixture).issues).toHaveLength(1);
    fixture.ingredients[0] = ingredient('Ground turmeric', 2.5, 'tsp', 'turmeric');
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
    fixture.sections[0].steps[0] = 'Add 1 tsp of turmeric to the marinade.';
    expect(checkRecipeScaling(fixture).issues[0].message).toContain('total 1.5 tsp');
  });

  it.each([
    ['Add 1 tablespoon of olive oil.', ingredient('Olive oil', 3, 'tsp')],
    ['Add 3 teaspoons of olive oil.', ingredient('Olive oil', 1, 'tbsp')],
    ['Cook 500g of spinach.', ingredient('Spinach', 0.5, 'kg')],
    ['Pour in 500ml of milk.', ingredient('Milk', 0.5, 'l')],
    ['Add 1 1/2 tsp of turmeric, then add 1/2 tsp of turmeric.', ingredient('Turmeric', 2, 'tsp')]
  ])('compares equivalent units and fractions without warnings: %s', (step, item) => {
    expect(checkRecipeScaling(recipe(step, [item])).issues).toEqual([]);
  });

  it('does not count chopping an ingredient and then adding it as two uses', () => {
    const fixture = recipe('Add 2 onions to the pan.', [ingredient('Onion', 2)]);
    fixture.sections[0].steps = ['Peel and chop 2 onions.'];
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
  });

  it('counts grating directly into food as a use of the ingredient', () => {
    const fixture = recipe('Add 2 peeled garlic cloves to the sauce.', [ingredient('Garlic', 3, 'clove')]);
    fixture.sections[0].steps = ['Peel and finely grate in 1 clove of garlic.'];
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
  });

  it('does not double count herbs prepared and later used as a garnish', () => {
    const fixture = recipe('Garnish with 10g of cilantro.', [ingredient('Cilantro', 10, 'g')]);
    fixture.sections[0].steps = ['De-stem 10 grams of cilantro.'];
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
  });

  it('does not count zest and juice as additional whole fruit', () => {
    const fixture = recipe('Add the juice from the other 1/2 lime.', [ingredient('Lime', 1)]);
    fixture.sections[0].steps = ['Finely zest in 1 lime and squeeze in the juice from 1/2 a lime.'];
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
    fixture.sections[0].steps = ['Juice 1 lime.'];
    fixture.sections[1].steps = ['Squeeze in the juice of 1 lime.'];
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
  });

  it.each([
    ['Add 0.33 tbsp of mustard.', ingredient('Mustard', 0.3, 'tbsp')],
    ['Add 0.67 tsp of turmeric.', ingredient('Turmeric', 0.7, 'tsp')],
    ['Add 1.67g of rosemary.', ingredient('Rosemary', 1.7, 'g')]
  ])('allows small rounding differences between listed and method amounts: %s', (step, item) => {
    expect(checkRecipeScaling(recipe(step, [item])).issues).toEqual([]);
  });

  it('reports a single amount lower than the list when no other use is mentioned', () => {
    const check = checkRecipeScaling(recipe('Add 1 tsp of turmeric.', [ingredient('Turmeric', 2, 'tsp')]));
    expect(check.issues[0]).toMatchObject({ code: 'amount-mismatch', excerpt: '1 tsp of turmeric' });
    expect(check.issues[0].message).toContain('This step specifies 1 tsp');
  });

  it('leaves an unspecified remainder or explicit partial amount alone', () => {
    const fixture = recipe('Add 1 tsp of turmeric, then use the remaining turmeric for the sauce.', [ingredient('Turmeric', 2, 'tsp', 'turmeric')]);
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
    expect(checkRecipeScaling(recipe('Add {{ingredient-portion|turmeric|1/2}} of turmeric.', fixture.ingredients)).issues).toEqual([]);
  });

  it('checks an excessive total even when another mention is unquantified', () => {
    const fixture = turmericRecipe('1.25');
    fixture.sections[1].steps.push('Mix the turmeric into the rice.');
    expect(checkRecipeScaling(fixture).issues[0].message).toContain('total 1.75 tsp');
  });

  it('includes linked quantities in a split total and preserves source positions', () => {
    const fixture = turmericRecipe('2');
    fixture.sections[0].steps[0] = 'Add {{amount|2|tsp}} of turmeric to the marinade.';
    fixture.sections[1].steps[0] = 'Add {{ingredient-portion|turmeric|1/3}} of turmeric to the rice.';
    const issue = checkRecipeScaling(fixture).issues[0];
    expect(issue.code).toBe('amount-mismatch');
    expect(issue.message).toContain('total 2.5 tsp');
    expect(issue.excerpt).toBe('{{amount|2|tsp}} of turmeric');
    expect(fixture.sections[0].steps[0].slice(issue.start, issue.end)).toBe(issue.excerpt);
  });

  it('honors fixed amount decisions when checking partial totals', () => {
    const fixture = turmericRecipe();
    fixture.sections[0].steps[0] = 'Add {{fixed|1 tsp of turmeric}} to the marinade.';
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
    fixture.sections[0].steps[0] = 'Add {{ fixed | 1 tsp of turmeric }} to the marinade.';
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
    fixture.sections[0].steps[0] = 'Add {{ ingredient-portion | turmeric | 1/3 }} of turmeric to the marinade.';
    expect(checkRecipeScaling(fixture).issues).toEqual([]);
  });

  it('does not convert between weight and spoon measures without a density', () => {
    expect(checkRecipeScaling(recipe('Add 1 tsp of turmeric.', [ingredient('Turmeric', 3, 'g')])).issues).toEqual([]);
  });
});
