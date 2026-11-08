import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile, rename, chmod, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args.some((arg) => !['--remote', '--rotate'].includes(arg))) {
  throw new Error('Usage: bun run password [--remote] [--rotate]');
}
const directory = join(homedir(), '.config', 'recipes');
await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);
const path = join(directory, 'password.txt');
const exists = await access(path).then(() => true, () => false);
if (exists && !args.includes('--rotate')) throw new Error('Password file already exists. Use --rotate to replace it and invalidate existing sessions.');

const password = randomBytes(24).toString('base64url');
const hash = createHash('sha256').update('recipes-password:' + password).digest('hex');
const pending = join(directory, '.password-pending-' + randomBytes(6).toString('hex'));
await writeFile(pending, password + '\n', { mode: 0o600, flag: 'wx' });

if (args.includes('--remote')) {
  const config = JSON.parse(await Bun.file(new URL('../wrangler.jsonc', import.meta.url)).text());
  const result = spawnSync(resolve('node_modules/.bin/wrangler'), ['pages', 'secret', 'put', 'AUTH_KEY', '--project-name', config.name], {
    input: hash, encoding: 'utf8'
  });
  if (result.status !== 0) {
    // Do not echo subprocess output: it may contain submitted secret material.
    throw new Error('Secret upload failed. New password is retained privately at ' + pending + '. Existing password file is unchanged.');
  }
}
await writeFile('.dev.vars', 'AUTH_KEY=' + hash + '\n', { mode: 0o600 });
await chmod('.dev.vars', 0o600);
await rename(pending, path);
console.log('Password saved to ' + path + ' (mode 0600).');
console.log(args.includes('--remote') ? 'Cloudflare and local login configured. Run bun run deploy to activate the secret.' : 'Local login configured. Use --remote --rotate to generate a production password.');
