CREATE TABLE app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL CHECK (json_valid(data)),
  revision INTEGER NOT NULL DEFAULT 1
);

INSERT INTO app_state (id, data) VALUES (1, '{"cookedMealHistory":{},"mealPlan":{},"recipeBookmarks":{},"recipeNotes":{},"recipeRatings":{},"recipeServings":{},"recipeSettings":{},"shoppingListChecks":{},"shoppingListCustomItems":[]}');

CREATE TABLE recipes (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data)),
  revision INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE login_attempts (
  key TEXT PRIMARY KEY,
  expires INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
