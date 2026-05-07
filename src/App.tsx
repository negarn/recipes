import { Navigate, Route, Routes } from 'react-router-dom';
import { RecipeAppDataProvider } from './contexts/RecipeAppDataContext';
import { appRoutePaths } from './helpers/appRoutes';
import { HomePage } from './pages/HomePage';
import { MealPlanPage } from './pages/MealPlanPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { RecipePage } from './pages/RecipePage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { SettingsPage } from './pages/SettingsPage';
import type { Recipe } from './types/recipe';

function AppRoutes() {
  return (
    <Routes>
      <Route path={appRoutePaths.home} element={<HomePage />} />
      <Route path={appRoutePaths.mealPlan} element={<MealPlanPage />} />
      <Route path={appRoutePaths.shoppingList} element={<ShoppingListPage />} />
      <Route path={appRoutePaths.bookmarks} element={<BookmarksPage />} />
      <Route path={appRoutePaths.recipe} element={<RecipePage />} />
      <Route path={appRoutePaths.settings} element={<SettingsPage />} />
      <Route path="*" element={<Navigate to={appRoutePaths.home} replace />} />
    </Routes>
  );
}

function App({ loadRecipes }: { loadRecipes?: () => Promise<Recipe[]> }) {
  return (
    <RecipeAppDataProvider loadRecipes={loadRecipes}>
      <AppRoutes />
    </RecipeAppDataProvider>
  );
}

export default App;
