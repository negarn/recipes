# Codex Agents

When creating git commits in this repository:

- Commit directly to `main` unless the user explicitly asks for a separate branch.
- Do not create commits or push changes unless the user explicitly asks you to do so.
- Use semantic commit messages with a conventional prefix.
- Start every commit subject with one of: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, or `style:`.
- Write the rest of the subject in imperative mood and keep it concise.
- Keep each commit focused on one logical change when possible.

Examples:

- `feat: add initial recipe browser scaffold`
- `fix: enlarge favicon for browser tabs`
- `docs: add agent instructions for commit messages`

UI interaction rule:

- Any clickable UI element must show a pointer cursor on hover (for example, include `cursor-pointer` on interactive controls).

Demo GIFs:

- When creating README or demo GIF assets from screen recordings, prefer the higher-quality `gifski` workflow used for `docs/recipe-catalog-search-tabs.gif`.
- Keep the source clip as sharp as practical and avoid lower-resolution fallback encoders when the GIF is meant for documentation.
