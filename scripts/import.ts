import { isDeepStrictEqual } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { normalizeRecipeAppDataSnapshot } from '../src/helpers/appData';

const args = process.argv.slice(2);
const files = args.filter((arg) => !arg.startsWith('--'));
const remote = args.includes('--remote');
if (files.length !== 1 || remote === args.includes('--local') ||
    args.some((arg) => arg.startsWith('--') && !['--remote', '--local', '--replace'].includes(arg))) {
  throw new Error('Usage: bun run db:import /path/to/backup.json --local|--remote [--replace]');
}
const backup = await Bun.file(files[0]).json();
if (backup.format !== 'recipes-backup' || backup.version !== 1 || !backup.snapshot) {
  throw new Error('Not a Recipes backup (format recipes-backup, version 1).');
}
const snapshot = JSON.parse(JSON.stringify(normalizeRecipeAppDataSnapshot(backup.snapshot)));
if (!isDeepStrictEqual(snapshot, backup.snapshot)) {
  throw new Error('Backup contains invalid or unsupported data. Import aborted without changes.');
}
function execute(options: string[]) {
  const result = spawnSync(resolve('node_modules/.bin/wrangler'), [
    'd1', 'execute', 'DB', remote ? '--remote' : '--local', '--json', ...options
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) throw new Error('D1 import command failed: ' + result.stderr);
  // Remote SQL-file imports print upload progress even with --json. Only SELECT
  // commands need parsing; successful file imports are verified by a fresh query.
  if (options.includes('--file')) return [];
  return JSON.parse(result.stdout) as Array<{ results: Record<string, unknown>[] }>;
}
const before = execute(['--command', 'SELECT (SELECT COUNT(*) FROM recipes) AS recipes, revision FROM app_state WHERE id = 1']);
if (Number(before[0].results[0]?.recipes) > 0 || Number(before[0].results[0]?.revision) > 1) {
  if (!args.includes('--replace')) throw new Error('Database already contains data. Back it up first; pass --replace only to intentionally overwrite it.');
}
const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";
const { recipes, ...preferences } = snapshot;
const statements = [
  'DELETE FROM recipes;',
  // Increase rather than reset the revision, invalidating old browser snapshots.
  'UPDATE app_state SET data = ' + quote(JSON.stringify(preferences)) + ', revision = revision + 1 WHERE id = 1;',
  ...recipes.map((recipe: { id: string }, position: number) => 'INSERT INTO recipes (id, position, data, revision) VALUES (' +
    quote(recipe.id) + ', ' + position + ', ' + quote(JSON.stringify(recipe)) + ', ' + Date.now() + ');')
];
const directory = await mkdtemp(join(tmpdir(), 'recipes-import-'));
try {
  const path = join(directory, 'import.sql');
  await writeFile(path, statements.join('\n') + '\n', { mode: 0o600 });
  execute(['--file', path, '--yes']);
} finally { await rm(directory, { recursive: true, force: true }); }
const after = execute(['--command', 'SELECT COUNT(*) AS recipes FROM recipes']);
if (Number(after[0].results[0]?.recipes) !== recipes.length) throw new Error('Recipe count verification failed.');
console.log('Imported ' + recipes.length + ' recipes and all preferences into ' + (remote ? 'Cloudflare D1.' : 'local D1.'));
console.log('Reload open browsers before editing. Verify the downloaded backup against the source.');
