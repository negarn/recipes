# Recipes

A private recipe collection at **https://negarcooks.pages.dev**.

React + TypeScript, hosted on Cloudflare Pages. One Pages Function serves the API; D1 stores recipes, notes, ratings, bookmarks, meal plans, cooked history, shopping lists, and settings.

No Google/Dropbox connection, OAuth client, Docker container, or separate server.

## Development

Requires [Bun](https://bun.sh) 1.3+ and Node 20+ for Wrangler.

```sh
bun install
bun run password                  # generate a local password
bun run db:migrate
bun run dev
```

Open **http://localhost:8788**. The frontend and Function rebuild when edited. Local D1 lives under the ignored `.wrangler/` directory and never uses production data. Stop with Ctrl-C.

The password is stored at **`~/.config/recipes/password.txt`** with permissions `0600`. The local `.dev.vars` contains only its verifier/session key. Both are excluded from source control.

If you already generated the production password on this machine, use the existing `.dev.vars`; do not generate another password merely to start development.

## Deploy

Wrangler uses your local Cloudflare login, not GitHub secrets.

```sh
bunx wrangler login
bun run deploy
```

The checked-in `wrangler.jsonc` identifies the Pages project and D1 database. Deploy builds the app, applies pending production migrations, and uploads to the `main` Pages branch. It does **not** import or replace data.

For a fresh account, create a D1 database and a Pages project, then update their IDs/names in `wrangler.jsonc`. Configure the password before the first deployment:

```sh
bun run password --remote
```

There is one application secret: `AUTH_KEY`. Missing or malformed configuration fails closed. Cloudflare stores the password's SHA-256 verifier, which also keys signed sessions; it never receives the plaintext password during setup. This is safe because the setup command **always generates 192 random bits**, not a human-chosen password.

### Rotate the password

```sh
bun run password --remote --rotate
bun run deploy
```

This replaces the local password file and updates local/Cloudflare configuration. Redeployment activates the new password and invalidates all existing sessions. Share the password through a private channel, not this repository.

Login attempts are limited to ten per IP per five minutes using atomic D1 counters. Sessions last 30 days in Secure, HttpOnly, SameSite=Strict cookies. Mutating requests require the same Origin. There are no email accounts, registration, password recovery, or external identity providers; anyone holding the password can access the collection.

## Backups and restore

Use **Settings → Download backup** to export all data as one portable JSON file. It contains private recipe data, not login credentials.

D1 also provides [Time Travel recovery](https://developers.cloudflare.com/d1/reference/time-travel/) (currently seven days on the free plan).

Import a downloaded backup into an empty database:

```sh
bun run db:import /absolute/path/to/backup.json --local
# or, after applying production migrations:
bun run db:import /absolute/path/to/backup.json --remote
```

Existing data is refused unless you explicitly pass **`--replace`**. Back it up first. Replacement overwrites the collection, not merges it; reload open browsers afterward. Imports validate the complete snapshot before touching D1. Verify the downloaded export against the source after restoring.

The migration from the old VPS is a one-time copy. The old app and this app **do not sync**. VPS services and credentials are not changed by any command here.

## Offline use and multiple devices

After signing in online, recipes and app data are cached in that browser for offline reading. Changes still require the server; there is no offline write queue.

Signing out, or receiving an expired-session response online, clears this browser's cached data. Use offline mode only on a trusted device: browser storage is not encrypted.

All devices use the same D1 database. Reload to see changes from another device. Revisions reject stale edits instead of silently overwriting newer data.

## Checks

```sh
bun run build
bun run test:run
bun run storybook
bun run build-storybook
```

Tests cover recipe editing/scaling/markup and the API running against real local D1 through Miniflare: authentication, session cookies, CSRF, login throttling, input validation, all data mutations, atomic meal completion, concurrent/stale writes, and backup export.

## Layout

- `src/`: existing recipe UI and domain logic.
- `worker/`: password sessions and the Pages API.
- `migrations/`: D1 schema.
- `scripts/password.ts`: generate/rotate the sole application credential.
- `scripts/import.ts`: validated backup import.
- `wrangler.jsonc`: Cloudflare deployment and database binding.
