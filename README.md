# Recipes

A local-first React + TypeScript recipe app for browsing recipes, saving bookmarks, planning meals, and managing a derived shopping list.

## Demo Mode

If you want to record the app with mock data, run:

```bash
npm run dev:demo
```

This seeds a separate `.recipes-demo/` persistence directory, leaves your real `~/.recipes/` data untouched, and starts the app on `http://127.0.0.1:5174`.

Use `npm run dev` to go back to your normal local data. To refresh the mock snapshot, run `npm run demo:seed`.

## Features

- Browse the recipe catalog with search, pagination, and adult/children audience tabs.

  ![Recipe catalog browsing with search, pagination, and audience tabs](docs/recipe-catalog-search-tabs.gif)
- Create and edit recipes from the home page, including ingredients, tags, nutrition, servings, and notes.

  ![Create and edit recipes on the home page](docs/add-edit-recipe.gif)
- Open recipe details with scaled ingredients, grouped method steps, nutrition, ratings, bookmarks, and optional step timers.

  ![Recipe details with scaled ingredients, grouped method steps, nutrition, ratings, bookmarks, and optional step timers](docs/recipe-details.gif)
- Save text selections as bookmarks, search them later, and jump back to the source recipe.

  ![Save text selections as bookmarks, search them later, and jump back to the source recipe](docs/bookmarks.gif)
- Add recipes to a date-based meal plan, move or remove entries, and mark meals as cooked.

  ![Add recipes to a date-based meal plan, move or remove entries, and mark meals as cooked](docs/meal-plan.gif)
- Review cooked history by month.

  ![Review cooked history by month](docs/cooked-history.gif)
- Build a shopping list from the meal plan, check items off, and add custom entries.

  ![Build a shopping list from the meal plan, check items off, and add custom entries](docs/shopping-list.gif)
- Set a global default serving size in Settings.

  ![Set a global default serving size in Settings](docs/global-serving-size.gif)

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS v4
- Vitest
- Storybook

## Getting Started

This project expects Node 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Scripts

```bash
npm run dev            # start the Vite dev server
npm run demo:seed      # seed mock data into .recipes-demo/
npm run dev:demo       # seed mock data and start the demo server
npm run build          # type-check and create a production build
npm run preview        # preview the built app locally
npm run test           # run tests in watch mode
npm run test:run       # run tests once
npm run storybook      # start Storybook
npm run build-storybook # build Storybook for production
```

## Persistence

Runtime recipe state and user data live in a private storage directory outside the repo by default.

By default, persisted JSON files are written to `~/.recipes/` on the local machine. If that directory does not exist yet, the app creates it on first launch.

The app stores these JSON files there:

- `recipes.json`
- `meal-plan.json`
- `cooked-meal-history.json`
- `recipe-bookmarks.json`
- `recipe-notes.json`
- `recipe-ratings.json`
- `recipe-servings.json`
- `recipe-settings.json`
- `shopping-list-checks.json`
- `shopping-list-custom-items.json`

A local Vite middleware in `server/recipePreferencesApi.ts` serves `/api/*` routes and writes updates atomically. Set `RECIPE_PREFERENCES_DATA_DIR` if you want to point persistence at another directory.

### Cloud Sync

Settings can connect Google Drive or Dropbox for cloud sync.

Cloud sync is optional. To use it, create an OAuth app with Google and/or Dropbox, copy the app credentials into this project’s environment, and then connect the provider from Settings.

These are app credentials, not your personal Google or Dropbox password. The app uses them to open the sign-in flow and store files in your account.

1. Create an OAuth app:
   - Google: create an OAuth client in Google Cloud Console.
   - Dropbox: create an app in the Dropbox developer console.
2. Copy `.env.example` to `.env.local`, then fill in the client ID and client secret values:

   ```bash
   cp .env.example .env.local
   RECIPE_GOOGLE_DRIVE_CLIENT_ID=...
   RECIPE_GOOGLE_DRIVE_CLIENT_SECRET=...
   RECIPE_DROPBOX_CLIENT_ID=...
   RECIPE_DROPBOX_CLIENT_SECRET=...
   ```

3. Add callback URLs for the app origin:
   - `http://127.0.0.1:5173/api/cloud-sync/google-drive/callback`
   - `http://127.0.0.1:5173/api/cloud-sync/dropbox/callback`
   - If you run the app somewhere else, use that origin instead of `127.0.0.1:5173`.
4. Restart the app, then open Settings and click Connect.

If you only want one provider, you only need to create that provider’s OAuth app and set its two environment variables.

Once connected, later recipe, meal-plan, bookmark, note, rating, serving, shopping-list, or settings changes sync automatically.

## Project Layout

- `src/App.tsx`: app routes and provider wiring.
- `src/pages/`: top-level pages.
- `src/components/`: reusable UI components.
- `src/contexts/RecipeAppDataContext.tsx`: shared app data and actions.
- `src/hooks/`: state and interaction hooks.
- `src/helpers/`: route, persistence, normalization, and recipe helpers.
- `src/stories/`: Storybook states and fixtures.
- `server/recipePreferencesApi.ts`: local persistence API for development and tests.
- Runtime JSON files live in `~/.recipes/` by default.

## Development Notes

- The app is intentionally local-first; there is no separate backend service to run.
- The built-in API is meant for loopback/localhost use only. It rejects requests that do not come from a local browser context.
- If you want to reset app state, delete the JSON files in `~/.recipes/` or in the directory pointed to by `RECIPE_PREFERENCES_DATA_DIR`.
- Storybook is available for isolated component work and UI review.
