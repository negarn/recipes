export const demoDataDirName = '.recipes-demo';

export const demoDataFiles = {
  'recipes.json': [
    {
      defaultServings: 2,
      id: 'storybook-skillet-pasta',
      ingredients: [
        {
          amount: {
            quantity: 180,
            type: 'scalable',
            unit: {
              singular: 'g'
            }
          },
          id: 'penne',
          name: 'penne pasta'
        },
        {
          amount: {
            quantity: 2,
            type: 'scalable',
            unit: {
              plural: 'cloves',
              singular: 'clove'
            }
          },
          id: 'garlic',
          name: 'garlic cloves'
        },
        {
          amount: {
            quantity: 200,
            type: 'scalable',
            unit: {
              singular: 'g'
            }
          },
          id: 'cherry-tomatoes',
          name: 'cherry tomatoes'
        }
      ],
      isVegan: true,
      isVegetarian: true,
      nutrition: {
        sourceServings: 2,
        values: {
          calories: 480,
          carbs: 74,
          fat: 12,
          fibre: 7,
          protein: 14,
          salt: 1.4,
          saturates: 2.1,
          sugars: 10
        }
      },
      rating: 4,
      sections: [
        {
          id: 'prep',
          steps: [
            'Slice 2 cloves of garlic and halve 200 g cherry tomatoes.'
          ],
          title: 'Prep'
        },
        {
          id: 'cook',
          steps: [
            'Boil 180 g penne pasta for 10 minutes until tender.',
            'Saute 2 cloves of garlic for 3 minutes, add 200 g cherry tomatoes, then toss through the pasta.'
          ],
          title: 'Cook'
        }
      ],
      tags: ['children'],
      title: 'Storybook Skillet Pasta',
      totalTime: '25 mins'
    },
    {
      defaultServings: 2,
      id: 'storybook-lemon-chickpea-bowl',
      ingredients: [
        {
          amount: {
            quantity: 1,
            type: 'scalable',
            unit: {
              singular: 'can'
            }
          },
          id: 'chickpeas',
          name: 'chickpeas'
        },
        {
          amount: {
            quantity: 120,
            type: 'scalable',
            unit: {
              singular: 'g'
            }
          },
          id: 'couscous',
          name: 'couscous'
        },
        {
          amount: {
            quantity: 1,
            type: 'scalable',
            unit: {
              singular: 'tbsp'
            }
          },
          id: 'olive-oil',
          name: 'olive oil'
        }
      ],
      isVegan: true,
      isVegetarian: true,
      nutrition: {
        sourceServings: 2,
        values: {
          calories: 960,
          carbs: 158,
          fat: 22,
          fibre: 24,
          protein: 36,
          salt: 1,
          saturates: 3,
          sugars: 14
        }
      },
      rating: 5,
      sections: [
        {
          id: 'prep',
          steps: [
            'Rinse 1 can of chickpeas and measure 120 g couscous.'
          ],
          title: 'Prep'
        },
        {
          id: 'cook',
          steps: [
            'Cook 120 g couscous, then fold in 1 can of chickpeas and drizzle 1 tbsp olive oil.'
          ],
          title: 'Cook'
        }
      ],
      tags: [],
      title: 'Storybook Lemon Chickpea Bowl',
      totalTime: '20 mins'
    },
    {
      defaultServings: 4,
      id: 'storybook-roasted-vegetable-flatbreads',
      ingredients: [
        {
          amount: {
            quantity: 2,
            type: 'scalable',
            unit: {
              plural: 'flatbreads',
              singular: 'flatbread'
            }
          },
          id: 'flatbreads',
          name: 'flatbreads'
        },
        {
          amount: {
            quantity: 1,
            type: 'scalable',
            unit: {
              singular: 'zucchini'
            }
          },
          id: 'zucchini',
          name: 'zucchini'
        },
        {
          amount: {
            quantity: 1,
            type: 'scalable',
            unit: {
              plural: 'peppers',
              singular: 'pepper'
            }
          },
          id: 'red-bell-pepper',
          name: 'red bell pepper'
        },
        {
          amount: {
            quantity: 60,
            type: 'scalable',
            unit: {
              singular: 'g'
            }
          },
          id: 'feta',
          name: 'crumbled feta'
        }
      ],
      isVegan: false,
      isVegetarian: true,
      nutrition: {
        sourceServings: 4,
        values: {
          calories: 580,
          carbs: 84,
          fat: 20,
          fibre: 8,
          protein: 22,
          salt: 3.2,
          saturates: 7.2,
          sugars: 12
        }
      },
      rating: 4.5,
      sections: [
        {
          id: 'prep',
          steps: [
            'Slice 1 zucchini and 1 red bell pepper into thin strips, then crumble 60 g feta.'
          ],
          title: 'Prep'
        },
        {
          id: 'cook',
          steps: [
            'Roast 1 zucchini and 1 red bell pepper for 15 minutes until tender and lightly browned.',
            'Warm 2 flatbreads, top with the roasted vegetables, and finish with 60 g feta.'
          ],
          title: 'Cook'
        }
      ],
      tags: [],
      title: 'Storybook Roasted Vegetable Flatbreads',
      totalTime: '25 mins'
    },
    {
      defaultServings: 4,
      id: 'storybook-mini-chicken-meatballs',
      ingredients: [
        {
          amount: {
            quantity: 450,
            type: 'scalable',
            unit: {
              singular: 'g'
            }
          },
          id: 'ground-chicken',
          name: 'ground chicken'
        },
        {
          amount: {
            quantity: 60,
            type: 'scalable',
            unit: {
              singular: 'g'
            }
          },
          id: 'breadcrumbs',
          name: 'breadcrumbs'
        },
        {
          amount: {
            quantity: 1,
            type: 'scalable',
            unit: {
              singular: 'egg'
            }
          },
          id: 'egg',
          name: 'egg'
        },
        {
          amount: {
            quantity: 240,
            type: 'scalable',
            unit: {
              singular: 'ml'
            }
          },
          id: 'tomato-sauce',
          name: 'mild tomato sauce'
        }
      ],
      isVegan: false,
      isVegetarian: false,
      nutrition: {
        sourceServings: 4,
        values: {
          calories: 900,
          carbs: 40,
          fat: 26,
          fibre: 4,
          protein: 108,
          salt: 2.4,
          saturates: 7.8,
          sugars: 16
        }
      },
      rating: 4,
      sections: [
        {
          id: 'prep',
          steps: [
            'Mix 450 g ground chicken, 60 g breadcrumbs, and 1 egg until just combined.'
          ],
          title: 'Prep'
        },
        {
          id: 'cook',
          steps: [
            'Shape the mix into small meatballs and bake for 15 minutes.',
            'Warm 240 ml tomato sauce and coat the meatballs before serving.'
          ],
          title: 'Cook'
        }
      ],
      tags: [],
      title: 'Storybook Mini Chicken Meatballs',
      totalTime: '30 mins'
    }
  ],
  'cooked-meal-history.json': {
    '2026-04-28': ['storybook-skillet-pasta'],
    '2026-04-29': ['storybook-lemon-chickpea-bowl']
  },
  'meal-plan.json': {
    '2026-05-01': ['storybook-skillet-pasta'],
    '2026-05-02': ['storybook-lemon-chickpea-bowl', 'storybook-skillet-pasta']
  },
  'recipe-bookmarks.json': {
    'storybook-lemon-chickpea-bowl': [
      {
        id: 'storybook-lemon-chickpea-bowl-lunch-box',
        label: 'Lunch box note',
        text: 'Keep the dressing separate until serving.'
      }
    ],
    'storybook-skillet-pasta': [
      {
        id: 'storybook-skillet-pasta-weeknight',
        label: 'Weeknight shortcut',
        text: 'Use a deeper skillet so the tomatoes stay in the pan.'
      }
    ]
  },
  'recipe-notes.json': {
    'storybook-lemon-chickpea-bowl': 'Add cucumber ribbons for a brighter lunch.'
  },
  'recipe-ratings.json': {
    'storybook-lemon-chickpea-bowl': 5,
    'storybook-skillet-pasta': 4.5
  },
  'recipe-servings.json': {
    'storybook-lemon-chickpea-bowl': 4,
    'storybook-skillet-pasta': 3
  },
  'recipe-settings.json': {
    defaultServingSize: 2
  },
  'shopping-list-checks.json': {},
  'shopping-list-custom-items.json': [
    {
      amountText: '2 tbsp',
      id: 'storybook-tahini',
      ingredientName: 'tahini'
    }
  ]
};
