export type IngredientUnit = {
  plural?: string;
  separator?: 'none' | 'space';
  singular: string;
};

type IngredientAmount =
  | {
      note?: string;
      quantity: number;
      type: 'scalable';
      unit?: IngredientUnit;
    }
  | {
      text: string;
      type: 'fixed';
    };

export type Ingredient = {
  id: string;
  name: string;
  amount: IngredientAmount;
};

export type MethodSection = {
  id: string;
  title: string;
  steps: string[];
};

type RecipeNutritionValues = {
  calories: number;
  carbs: number;
  fat: number;
  saturates: number;
  sugars: number;
  fibre: number;
  protein: number;
  salt: number;
};

export type RecipeNutrition = {
  sourceServings: number;
  values: RecipeNutritionValues;
};

export type Recipe = {
  defaultServings: number;
  id: string;
  isVegan: boolean;
  isVegetarian: boolean;
  nutrition?: RecipeNutrition;
  rating?: number;
  title: string;
  totalTime: string;
  tags: string[];
  ingredients: Ingredient[];
  sections: MethodSection[];
};
